import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { setCurrentStory } from "../services/currentStory";
import { generateImage, generateStory } from "../services/openaiService";
import { saveStory } from "../services/storageService";
import {
  canGenerateStory,
  getUsageData,
  incrementStoryUsage,
  setAdminMode,
  type UsageMode,
} from "../services/usageService";

import { auth } from "../services/firebase";

import {
  consumeStory,
  getUserProfile,
} from "../services/userService";


type ImageStyle = "cartoon" | "fantasy" | "realistic" | "comic";
type StoryType = "funny" | "adventure" | "magic" | "mystery";
type StoryLength = "short" | "medium" | "long";
type PackType = "text" | "illustrated";
type Narrator =
  | "narratrice"
  | "narrateur"
  | "magicien"
  | "fee"
  | "dodo";

const imageStyles = [
  { id: "cartoon", label: "🎨 Cartoon" },
  { id: "fantasy", label: "🧙 Fantasy" },
  { id: "realistic", label: "🌍 Réaliste" },
  { id: "comic", label: "📖 BD" },
] as const;

const storyTypes = [
  { id: "funny", label: "🤣 Drôle" },
  { id: "adventure", label: "⚔️ Aventure" },
  { id: "magic", label: "🧙 Magique" },
  { id: "mystery", label: "👻 Mystère" },
] as const;

const storyLengths = [
  { id: "short", label: "⚡ Courte", scenes: 4, disabled: false },
  { id: "medium", label: "📖 Moyenne", scenes: 6, disabled: false },
  { id: "long", label: "🌙 Longue", scenes: 8, disabled: true },
] as const;

const narrators = [
  {
    id: "narratrice",
    label: "👩 Élise",
    subtitle: "Douce et expressive",
  },
  {
    id: "narrateur",
    label: "👨 Arthur",
    subtitle: "Chaleureux et rassurant",
  },
  {
    id: "magicien",
    label: "🧙 Merlin",
    subtitle: "Mystérieux et magique",
  },
  {
    id: "fee",
    label: "🧚 Luna",
    subtitle: "Joyeuse et féerique",
  },
  {
    id: "dodo",
    label: "🌙 Dodo",
    subtitle: "Lent et apaisant",
  },
] as const;

function getStylePrompt(style: ImageStyle) {
  if (style === "cartoon") {
    return "colorful cartoon style, children's animation, soft shapes";
  }

  if (style === "fantasy") {
    return "magical fantasy illustration, epic atmosphere, glowing light";
  }

  if (style === "realistic") {
    return "realistic cinematic image, natural light, detailed environment";
  }

  return "comic book style, bold outlines, dynamic panels, vibrant colors";
}

export default function CreateStoryScreen() {
  useEffect(() => {
    const enableAdmin = async () => {
      const isAdmin = false;

      if (isAdmin) {
        await setAdminMode();
      }
    };

    enableAdmin();
  }, []);

  const [prompt, setPrompt] = useState("");
  const [imageStyle, setImageStyle] = useState<ImageStyle>("cartoon");
  const [referencePhoto, setReferencePhoto] = useState<string | null>(null);
  const [referencePhotoBase64, setReferencePhotoBase64] =
  useState<string | null>(null);
  const [referencePhotoMimeType, setReferencePhotoMimeType] =
  useState<string>("image/jpeg");

  const [storyType, setStoryType] = useState<StoryType>("magic");
  const [storyLength, setStoryLength] = useState<StoryLength>("short");
  const [narrator, setNarrator] =
  useState<Narrator>("narratrice");

  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [textRemaining, setTextRemaining] = useState(0);
  const [illustratedRemaining, setIllustratedRemaining] = useState(0);
  const [selectedPack, setSelectedPack] = useState<PackType>("text");
  const [isConnected, setIsConnected] = useState(Boolean(auth.currentUser));
  const welcomeShownRef = useRef(false);

  const loadCarnets = useCallback(async () => {
    const currentUser = auth.currentUser;
    setIsConnected(Boolean(currentUser));

    if (!currentUser) {
      setTextRemaining(0);
      setIllustratedRemaining(0);
      return;
    }

    const profile = await getUserProfile(currentUser.uid);
    const textCount = profile?.packs?.text?.storiesRemaining ?? 0;
    const illustratedCount = profile?.packs?.illustrated?.storiesRemaining ?? 0;

    setTextRemaining(textCount);
    setIllustratedRemaining(illustratedCount);

    const storageKey = `ACTIVE_STORY_PACK:${currentUser.uid}`;
    const savedPack = await AsyncStorage.getItem(storageKey);

    let nextPack: PackType = savedPack === "illustrated" ? "illustrated" : "text";

    // Si le carnet mémorisé est vide, on bascule automatiquement sur l'autre.
    if (nextPack === "text" && textCount <= 0 && illustratedCount > 0) {
      nextPack = "illustrated";
    } else if (
      nextPack === "illustrated" &&
      illustratedCount <= 0 &&
      textCount > 0
    ) {
      nextPack = "text";
    }

    setSelectedPack(nextPack);
    await AsyncStorage.setItem(storageKey, nextPack);
  }, []);

  const selectPack = useCallback(async (pack: PackType) => {
    const currentUser = auth.currentUser;

    if (!currentUser) return;

    if (pack === "text" && textRemaining <= 0) {
      Alert.alert("Carnet vide", "Ton carnet Texte ne contient plus d’histoire.");
      return;
    }

    if (pack === "illustrated" && illustratedRemaining <= 0) {
      Alert.alert(
        "Carnet vide",
        "Ton carnet Illustré ne contient plus d’histoire."
      );
      return;
    }

    setSelectedPack(pack);
    await AsyncStorage.setItem(`ACTIVE_STORY_PACK:${currentUser.uid}`, pack);
  }, [textRemaining, illustratedRemaining]);

  const openPackSelector = useCallback(() => {
    if (!isConnected || loading) return;

    const options: any[] = [];

    if (textRemaining > 0) {
      options.push({
        text: `📖 Texte · ${textRemaining} restante${textRemaining > 1 ? "s" : ""}`,
        onPress: () => selectPack("text"),
      });
    }

    if (illustratedRemaining > 0) {
      options.push({
        text: `🎨 Illustré · ${illustratedRemaining} restante${
          illustratedRemaining > 1 ? "s" : ""
        }`,
        onPress: () => selectPack("illustrated"),
      });
    }

    options.push({ text: "Annuler", style: "cancel" });

    Alert.alert(
      "Choisir un carnet",
      "Le carnet choisi sera utilisé pour la prochaine histoire.",
      options
    );
  }, [
    illustratedRemaining,
    isConnected,
    loading,
    selectPack,
    textRemaining,
  ]);

  useFocusEffect(
    useCallback(() => {
      loadCarnets().catch((error) => {
        console.log("Erreur chargement carnets :", error);
      });
    }, [loadCarnets])
  );

  useEffect(() => {
    const showGuestWelcome = async () => {
      if (auth.currentUser || welcomeShownRef.current) return;

      const usageData = await getUsageData();

      if (
        usageData.role === "guest" &&
        usageData.guestStoriesCompleted === 0
      ) {
        welcomeShownRef.current = true;

        Alert.alert(
          "✨ Bienvenue dans ConteMagiqueIA",
          "Tu peux découvrir gratuitement 2 histoires :\n\n📖 La première en texte\n🎨 La deuxième avec des illustrations\n\nEnsuite, tu pourras créer un compte et recevoir 2 nouvelles histoires texte offertes.",
          [{ text: "Commencer" }],
          { cancelable: false }
        );
      }
    };

    showGuestWelcome().catch((error) => {
      console.log("Erreur message de bienvenue :", error);
    });
  }, []);

  async function choosePhotoFromGallery() {
  try {
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Autorisation nécessaire",
        "Autorise l'accès aux photos pour choisir une photo."
      );
      return;
    }

    const result =
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

    if (!result.canceled && result.assets?.[0]?.uri) {
      const uri = result.assets[0].uri;

      setReferencePhoto(uri);
      setReferencePhotoBase64(result.assets[0].base64 ?? null);
      setReferencePhotoMimeType(
  result.assets[0].mimeType || "image/jpeg"
);

      // Une photo d'enfant ne doit pas être utilisée
      // avec le mode Réaliste.
      if (imageStyle === "realistic") {
        setImageStyle("cartoon");

        Alert.alert(
          "Style Cartoon activé 🎨",
          "Le style Réaliste est indisponible lorsqu'une photo est utilisée."
        );
      }
    }
  } catch (error) {
    console.log("Erreur sélection photo :", error);

    Alert.alert(
      "Erreur",
      "Impossible de sélectionner la photo."
    );
  }
}

async function takeReferencePhoto() {
  try {
    const permission =
      await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Autorisation nécessaire",
        "Autorise l'accès à l'appareil photo pour prendre une photo."
      );
      return;
    }

    const result =
      await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

    if (!result.canceled && result.assets?.[0]?.uri) {
      const uri = result.assets[0].uri;

      setReferencePhoto(uri);
      setReferencePhotoBase64(result.assets[0].base64 ?? null);
      setReferencePhotoMimeType(
        result.assets[0].mimeType || "image/jpeg"
      );

      if (imageStyle === "realistic") {
        setImageStyle("cartoon");

        Alert.alert(
          "Style Cartoon activé 🎨",
          "Le style Réaliste est indisponible lorsqu'une photo est utilisée."
        );
      }
    }
  } catch (error) {
    console.log("Erreur appareil photo :", error);

    Alert.alert(
      "Erreur",
      "Impossible de prendre la photo."
    );
  }
}

function openPhotoSelector() {
  if (loading) return;

  Alert.alert(
    "📷 Ajouter une photo",
    "Ajoute une photo de référence pour personnaliser les illustrations : enfant, parent, famille, frères et sœurs, animal, doudou ou autre élément important.",
    [
      {
        text: "Prendre une photo",
        onPress: takeReferencePhoto,
      },
      {
        text: "Choisir dans la galerie",
        onPress: choosePhotoFromGallery,
      },
      {
        text: "Annuler",
        style: "cancel",
      },
    ]
  );
}

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      Alert.alert("Erreur", "Écris une idée avant de générer une histoire.");
      return;
    }

    const currentUser = auth.currentUser;

    let usage: {
      allowed: boolean;
      mode: UsageMode;
    };

    if (currentUser) {
      const profile = await getUserProfile(currentUser.uid);

      if (!profile) {
        Alert.alert(
          "Profil introuvable",
          "Ton compte est connecté, mais ton profil n’a pas été trouvé."
        );
        return;
      }

      if (profile.role === "admin") {
        usage = { allowed: true, mode: "admin" };
      } else {
        const textCount = profile.packs.text.storiesRemaining;
        const illustratedCount = profile.packs.illustrated.storiesRemaining;

        let packToUse = selectedPack;

        // Sécurité : si le carnet actif vient de se vider, bascule sur l'autre.
        if (packToUse === "text" && textCount <= 0 && illustratedCount > 0) {
          packToUse = "illustrated";
          await selectPack("illustrated");
        } else if (
          packToUse === "illustrated" &&
          illustratedCount <= 0 &&
          textCount > 0
        ) {
          packToUse = "text";
          await selectPack("text");
        }

        if (packToUse === "text" && textCount > 0) {
          usage = { allowed: true, mode: "paid-text" };
        } else if (packToUse === "illustrated" && illustratedCount > 0) {
          usage = { allowed: true, mode: "paid-image" };
        } else {
          usage = { allowed: false, mode: "blocked" };
        }
      }
    } else {
      usage = await canGenerateStory();
    }

    if (!usage.allowed) {
      if (currentUser) {
        Alert.alert(
          "📚 Tes carnets sont terminés",
          "Tu n’as plus d’histoire disponible. Choisis un nouveau carnet pour continuer.",
          [
            { text: "Plus tard", style: "cancel" },
            {
              text: "Voir les carnets",
              onPress: () => router.replace("/premium"),
            },
          ]
        );
      } else {
        router.replace("/continue-adventure" as any);
      }
      return;
    }

    if (usage.mode === "guest-second-story") {
      await new Promise<void>((resolve) => {
        Alert.alert(
          "🎨 Une surprise t’attend",
          "Cette deuxième histoire sera illustrée. Après cette aventure, tu pourras créer un compte et recevoir 2 histoires texte offertes.",
          [{ text: "Découvrir les illustrations", onPress: () => resolve() }],
          { cancelable: false }
        );
      });
    }

    const textOnlyMode =
      usage.mode === "guest-first-story" ||
      usage.mode === "paid-text";

    try {
      setLoading(true);
      setLoadingText("Création de l’histoire...");

      const sceneCount =
        storyLength === "short" ? 4 : storyLength === "medium" ? 6 : 8;

      const storyPrompt = referencePhoto
  ? `
${prompt}

IMPORTANT :
Une photo de référence a été ajoutée.

- La photo peut contenir une ou plusieurs personnes, des enfants, des adultes, des animaux, des jouets ou éventuellement un doudou.
- Ne pas supposer qu'un doudou est présent.
- Ne pas inventer de personne, d'animal, de jouet ou de doudou qui ne soit pas demandé par le texte.
- Les personnes ou éléments visibles sur la photo peuvent être intégrés naturellement à l'histoire lorsqu'ils sont pertinents pour l'idée donnée.
- Si plusieurs personnes apparaissent sur la photo, ne pas réduire automatiquement l'histoire à un seul enfant.
- Ne pas inventer de caractéristiques physiques détaillées dans le texte de l'histoire.
- Les illustrations utiliseront la photo de référence pour conserver l'apparence des personnes et éléments concernés.
- L'histoire doit avant tout respecter l'idée écrite par l'utilisateur.
`
  : prompt;

      const storyData = await generateStory(
        storyPrompt,
        storyType,
        sceneCount
      );
      const scenes = storyData.scenes || [];
      const selectedStylePrompt = getStylePrompt(imageStyle);
      const charactersDescription = storyData.characters || "";
      const scenesWithImages = [];

      for (let i = 0; i < scenes.length; i++) {
        if (textOnlyMode) {
          scenesWithImages.push({
            ...scenes[i],
            imageUrl: null,
            imageStyle,
            storyType,
            storyLength,
          });
          continue;
        }

        setLoadingText(`Création de l’image ${i + 1} / ${scenes.length}...`);

        const styledImagePrompt = `
${selectedStylePrompt}

Personnages principaux de cette histoire :
${charactersDescription}

${referencePhoto ? `
IMPORTANT — PHOTO DE RÉFÉRENCE FOURNIE :
- analyser attentivement la photo de référence avant de créer l'illustration
- représenter uniquement les personnes, animaux, doudous ou objets importants réellement visibles sur la photo et utiles à la scène
- ne jamais supposer qu'un doudou est présent s'il n'y en a pas sur la photo
- ne jamais inventer une personne, un enfant, un animal ou un doudou à partir de la photo
- si plusieurs personnes sont visibles, respecter le nombre de personnes et leurs principales caractéristiques visuelles
- préserver l'identité visuelle de chaque personne d'une scène à l'autre : visage, cheveux, couleur de peau, âge apparent et éléments distinctifs
- ne pas mélanger les caractéristiques physiques de plusieurs personnes
- si un doudou, jouet ou animal est réellement visible, conserver fidèlement son apparence, sa forme et ses couleurs
- conserver les mêmes personnages de référence dans toutes les scènes où ils apparaissent
- adapter leurs vêtements, poses et expressions uniquement lorsque la scène le nécessite, tout en gardant leur identité visuelle reconnaissable
- utiliser la photo uniquement comme référence d'apparence ; la composition, le décor, les poses et les actions doivent suivre la scène décrite
- transformer les sujets dans le style illustré choisi
- ne pas produire un rendu photoréaliste
- créer une illustration chaleureuse, naturelle et adaptée à un livre pour enfants
` : ""}

Scène à illustrer :
${scenes[i].imagePrompt}

Consignes importantes :
- garder les mêmes personnages d’une scène à l’autre
- mêmes couleurs
- même apparence
- mêmes accessoires
- style cohérent entre toutes les images
- rendu doux, lumineux, familial, adapté aux enfants
- aucun personnage connu, aucune marque, aucun logo
`;

        const referenceImage = referencePhotoBase64
  ? `data:${referencePhotoMimeType};base64,${referencePhotoBase64}`
  : null;

const imageUrl = await generateImage(
  styledImagePrompt,
  referenceImage
);

        scenesWithImages.push({
          ...scenes[i],
          imagePrompt: styledImagePrompt,
          imageStyle,
          storyType,
          storyLength,
          imageUrl,
        });
      }

      const finalStory = {
        prompt,
        imageStyle,
        storyType,
        storyLength,
        narrator,
        scenes: scenesWithImages,
      };

      const savedStory = await saveStory(finalStory);
      setCurrentStory(savedStory || finalStory);

      let finishedPack: "text" | "illustrated" | null = null;

      if (currentUser) {
        if (usage.mode === "paid-text") {
          const remaining = await consumeStory(currentUser.uid, "text");
          setTextRemaining(remaining);
          if (remaining === 0) finishedPack = "text";
        } else if (usage.mode === "paid-image") {
          const remaining = await consumeStory(
            currentUser.uid,
            "illustrated"
          );
          setIllustratedRemaining(remaining);
          if (remaining === 0) finishedPack = "illustrated";
        }
      } else {
        await incrementStoryUsage(usage.mode);
      }

      if (finishedPack) {
        const label = finishedPack === "text" ? "Texte" : "Illustré";

        Alert.alert(
          `📖 Carnet ${label} terminé`,
          "Ton histoire est prête. Tu viens d’utiliser la dernière histoire de ce carnet.",
          [
            {
              text: "Lire mon histoire",
              onPress: () => router.push("/player"),
            },
            {
              text: "Acheter un carnet",
              onPress: () => router.replace("/premium"),
            },
          ],
          { cancelable: false }
        );
        return;
      }

      router.push("/player");
    } catch (e) {
      console.log("Erreur génération :", e);
      Alert.alert("Erreur", "Impossible de générer l’histoire.");
    } finally {
      setLoading(false);
      setLoadingText("");
    }
  };

  return (
  <LinearGradient
    colors={["#0F172A", "#3B0764"]}
    style={styles.container}
  >
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.title}>Parle à l’IA</Text>

        <Text style={styles.subtitle}>Écris ton idée d’histoire ✨</Text>

        {isConnected && (
          <View style={styles.carnetsCard}>
            <Text style={styles.activePackEyebrow}>Carnet actif</Text>

            <TouchableOpacity
              style={styles.activePackButton}
              onPress={openPackSelector}
              disabled={loading}
              activeOpacity={0.85}
            >
              <View style={styles.activePackTextBox}>
                <Text style={styles.activePackTitle}>
                  {selectedPack === "text" ? "📖 Carnet Texte" : "🎨 Carnet Illustré"}
                </Text>

                <Text style={styles.activePackSubtitle}>
                  {selectedPack === "text"
                    ? `${textRemaining} histoire${textRemaining > 1 ? "s" : ""} restante${
                        textRemaining > 1 ? "s" : ""
                      }`
                    : `${illustratedRemaining} histoire${
                        illustratedRemaining > 1 ? "s" : ""
                      } restante${illustratedRemaining > 1 ? "s" : ""}`}
                </Text>
              </View>

              {textRemaining > 0 && illustratedRemaining > 0 ? (
                <Text style={styles.activePackArrow}>⌄</Text>
              ) : null}
            </TouchableOpacity>

            {textRemaining > 0 && illustratedRemaining > 0 ? (
              <Text style={styles.changePackHint}>
                Appuie pour changer de carnet
              </Text>
            ) : null}

            <View style={styles.packMiniRow}>
              <Text style={styles.packMiniText}>📖 Texte : {textRemaining}</Text>
              <Text style={styles.packMiniText}>🎨 Illustré : {illustratedRemaining}</Text>
            </View>

            <TouchableOpacity
              style={styles.buyCarnetButton}
              onPress={() => router.push("/premium" as any)}
              disabled={loading}
            >
              <Text style={styles.buyCarnetButtonText}>Acheter un carnet</Text>
            </TouchableOpacity>
          </View>
        )}

        <TextInput
          style={styles.input}
          placeholder="Ex : un dragon gentil sur une île magique..."
          placeholderTextColor="#AAA"
          value={prompt}
          onChangeText={setPrompt}
          multiline
        />

        <Text style={styles.photoHelpText}>
  📸 Photo de référence facultative{"\n"}
  Utilise une photo nette où les personnes ou éléments importants sont bien visibles.
</Text>

        <TouchableOpacity
  style={styles.photoButton}
  onPress={openPhotoSelector}
  disabled={loading}
>
  <Text style={styles.photoButtonText}>
    {referencePhoto
      ? "📷 Changer la photo"
      : "📷 Ajouter une photo à mon histoire"}
  </Text>
</TouchableOpacity>

{referencePhoto && (
  <View style={styles.photoPreviewCard}>
    <Image
      source={{ uri: referencePhoto }}
      style={styles.photoPreview}
      resizeMode="cover"
    />

    <Text style={styles.photoPreviewText}>
      Photo de référence ajoutée ✓
    </Text>
  </View>
)}

{referencePhoto && (
  <TouchableOpacity
    style={styles.removePhotoButton}
    onPress={() => {
  setReferencePhoto(null);
  setReferencePhotoBase64(null);
}}
    disabled={loading}
  >
    <Text style={styles.removePhotoButtonText}>
      Supprimer la photo
    </Text>
  </TouchableOpacity>
)}

        <Text style={styles.sectionTitle}>Style des images</Text>

        <View style={styles.grid}>
          {imageStyles.map((item) => {
  const isActive = imageStyle === item.id;
  const isRealisticBlocked =
    Boolean(referencePhoto) && item.id === "realistic";

  return (
    <TouchableOpacity
      key={item.id}
      style={[
        styles.optionButton,
        isActive && styles.optionActive,
        isRealisticBlocked && styles.optionDisabled,
      ]}
      onPress={() => {
        if (isRealisticBlocked) {
          Alert.alert(
            "Style indisponible",
            "🔒 Le style Réaliste est indisponible lorsqu'une photo est utilisée."
          );
          return;
        }

        setImageStyle(item.id);
      }}
      disabled={loading}
    >
      <Text
        style={[
          styles.optionText,
          isActive && styles.optionTextActive,
        ]}
      >
        {item.label}
        {isRealisticBlocked ? " 🔒" : ""}
      </Text>
    </TouchableOpacity>
  );
})}
        </View>

        <Text style={styles.sectionTitle}>Type d’histoire</Text>

        <View style={styles.grid}>
          {storyTypes.map((item) => {
            const isActive = storyType === item.id;

            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.optionButton, isActive && styles.optionActive]}
                onPress={() => setStoryType(item.id)}
                disabled={loading}
              >
                <Text
                  style={[
                    styles.optionText,
                    isActive && styles.optionTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Longueur</Text>

        <View style={styles.grid}>
          {storyLengths.map((item) => {
            const isActive = storyLength === item.id;

            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.optionButton,
                  isActive && styles.optionActive,
                  item.disabled && styles.optionDisabled,
                ]}
                onPress={() => {
                  if (!item.disabled) {
                    setStoryLength(item.id);
                  }
                }}
                disabled={loading || item.disabled}
              >
                <Text
                  style={[
                    styles.optionText,
                    isActive && styles.optionTextActive,
                  ]}
                >
                  {item.label}
                  {item.disabled ? " 🔒 Bientôt" : ""}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Qui raconte l’histoire ?</Text>

<View style={styles.narratorGrid}>
  {narrators.map((item) => {
    const isActive = narrator === item.id;

    return (
      <TouchableOpacity
        key={item.id}
        style={[
          styles.narratorButton,
          isActive && styles.narratorActive,
        ]}
        onPress={() => setNarrator(item.id)}
        disabled={loading}
      >
        <Text
          style={[
            styles.narratorLabel,
            isActive && styles.narratorLabelActive,
          ]}
        >
          {item.label}
        </Text>

        <Text
          style={[
            styles.narratorSubtitle,
            isActive && styles.narratorSubtitleActive,
          ]}
        >
          {item.subtitle}
        </Text>
      </TouchableOpacity>
    );
  })}
</View>

        <TouchableOpacity
          style={[styles.button, loading && { opacity: 0.7 }]}
          onPress={handleGenerate}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? loadingText || "Génération..." : "Générer l’histoire"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push("/")}
          disabled={loading}
        >
          <Text style={styles.backText}>Retour accueil</Text>
        </TouchableOpacity>
            </ScrollView>
    </SafeAreaView>
  </LinearGradient>
);
}

const styles = StyleSheet.create({
  container: {
  flex: 1,
},

safeArea: {
  flex: 1,
},

scrollContent: {
  paddingHorizontal: 24,
  paddingTop: 20,
  paddingBottom: 30,
},
  title: {
    fontSize: 34,
    fontWeight: "900",
    color: "white",
    marginBottom: 10,
  },
  subtitle: {
    color: "#DDD",
    fontSize: 16,
    marginBottom: 22,
  },
  carnetsCard: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    borderRadius: 18,
    padding: 16,
    marginBottom: 18,
  },
  activePackEyebrow: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  activePackButton: {
    minHeight: 68,
    borderRadius: 16,
    backgroundColor: "rgba(255,183,3,0.16)",
    borderWidth: 1,
    borderColor: "#FFB703",
    paddingHorizontal: 15,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  activePackTextBox: {
    flex: 1,
  },
  activePackTitle: {
    color: "white",
    fontSize: 17,
    fontWeight: "900",
  },
  activePackSubtitle: {
    color: "#E2E8F0",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  activePackArrow: {
    color: "#FFB703",
    fontSize: 28,
    fontWeight: "900",
    marginLeft: 12,
    marginTop: -6,
  },
  changePackHint: {
    color: "#CBD5E1",
    fontSize: 11,
    textAlign: "center",
    marginTop: 7,
  },
  packMiniRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 14,
  },
  packMiniText: {
    flex: 1,
    color: "white",
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingVertical: 8,
    borderRadius: 10,
  },
  carnetLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  carnetLabel: {
    color: "white",
    fontSize: 15,
    fontWeight: "800",
  },
  carnetCount: {
    minWidth: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FFB703",
    color: "#111827",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "900",
    paddingTop: 7,
  },
  carnetSeparator: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.14)",
    marginVertical: 12,
  },
  buyCarnetButton: {
    marginTop: 15,
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,183,3,0.18)",
    borderWidth: 1,
    borderColor: "#FFB703",
    alignItems: "center",
    justifyContent: "center",
  },
  buyCarnetButtonText: {
    color: "#FFB703",
    fontSize: 14,
    fontWeight: "900",
  },

  input: {
    backgroundColor: "white",
    borderRadius: 18,
    padding: 18,
    minHeight: 125,
    fontSize: 16,
    marginBottom: 18,
  },
  sectionTitle: {
    color: "white",
    fontWeight: "900",
    fontSize: 16,
    marginBottom: 10,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  optionButton: {
    width: "48%",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  optionActive: {
    backgroundColor: "#FFB703",
    borderColor: "#FFB703",
  },
  optionText: {
    color: "white",
    fontWeight: "900",
  },
  optionTextActive: {
    color: "#111",
  },
  optionDisabled: {
    opacity: 0.45,
  },
  button: {
    backgroundColor: "#FFB703",
    padding: 16,
    borderRadius: 18,
    alignItems: "center",
  },
  buttonText: {
    color: "#111",
    fontSize: 17,
    fontWeight: "900",
    textAlign: "center",
  },
  backButton: {
    marginTop: 18,
    alignItems: "center",
    marginBottom: 30,
  },
  backText: {
    color: "white",
    fontWeight: "800",
  },
  narratorGrid: {
  flexDirection: "row",
  flexWrap: "wrap",
  gap: 8,
  marginBottom: 20,
},

narratorButton: {
  width: "48%",
  minHeight: 78,
  backgroundColor: "rgba(255,255,255,0.14)",
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.25)",
  borderRadius: 14,
  padding: 12,
  alignItems: "center",
  justifyContent: "center",
},

narratorActive: {
  backgroundColor: "#FFB703",
  borderColor: "#FFB703",
},

narratorLabel: {
  color: "white",
  fontSize: 16,
  fontWeight: "900",
  textAlign: "center",
},

narratorLabelActive: {
  color: "#111",
},

narratorSubtitle: {
  color: "#CBD5E1",
  fontSize: 11,
  fontWeight: "700",
  textAlign: "center",
  marginTop: 4,
},

narratorSubtitleActive: {
  color: "#333",
},

photoButton: {
  backgroundColor: "rgba(255,255,255,0.14)",
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.25)",
  paddingVertical: 14,
  borderRadius: 16,
  alignItems: "center",
  marginBottom: 10,
},

photoButtonText: {
  color: "white",
  fontSize: 15,
  fontWeight: "900",
},

removePhotoButton: {
  alignItems: "center",
  marginBottom: 18,
},

removePhotoButtonText: {
  color: "#FCA5A5",
  fontSize: 13,
  fontWeight: "800",
},

photoPreviewCard: {
  backgroundColor: "rgba(255,255,255,0.10)",
  borderRadius: 16,
  padding: 10,
  marginBottom: 18,
  alignItems: "center",
},

photoPreview: {
  width: 150,
  height: 150,
  borderRadius: 16,
  marginBottom: 8,
},

photoPreviewText: {
  color: "#E2E8F0",
  fontSize: 13,
  fontWeight: "800",
},

photoHelpText: {
  color: "#CBD5E1",
  fontSize: 13,
  lineHeight: 19,
  marginBottom: 10,
},
});