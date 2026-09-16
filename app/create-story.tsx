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
import {
  getTranslations,
  loadLanguage,
  type AppLanguage,
} from "../services/languageService";


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
  const [language, setLanguage] =
    useState<AppLanguage>("fr");

  const t = getTranslations(language);

  function getImageStyleLabel(style: ImageStyle) {
  if (style === "cartoon") {
    return t.createStory.cartoon;
  }

  if (style === "fantasy") {
    return t.createStory.fantasy;
  }

  if (style === "realistic") {
    return t.createStory.realistic;
  }

  return t.createStory.comic;
}

function getStoryTypeLabel(type: StoryType) {
  if (type === "funny") {
    return t.createStory.funny;
  }

  if (type === "adventure") {
    return t.createStory.adventure;
  }

  if (type === "magic") {
    return t.createStory.magic;
  }

  return t.createStory.mystery;
}

function getStoryLengthLabel(length: StoryLength) {
  if (length === "short") {
    return t.createStory.short;
  }

  if (length === "medium") {
    return t.createStory.medium;
  }

  return t.createStory.long;
}

function getNarratorSubtitle(narratorId: Narrator) {
  if (narratorId === "narratrice") {
    return t.createStory.eliseSubtitle;
  }

  if (narratorId === "narrateur") {
    return t.createStory.arthurSubtitle;
  }

  if (narratorId === "magicien") {
    return t.createStory.merlinSubtitle;
  }

  if (narratorId === "fee") {
    return t.createStory.lunaSubtitle;
  }

  return t.createStory.bedtimeSubtitle;
}

  const [prompt, setPrompt] = useState("");
  const [imageStyle, setImageStyle] =
    useState<ImageStyle>("cartoon");

  const [referencePhoto, setReferencePhoto] =
    useState<string | null>(null);

  const [
    referencePhotoBase64,
    setReferencePhotoBase64,
  ] = useState<string | null>(null);

  useFocusEffect(
  useCallback(() => {
    let isActive = true;

    async function refreshLanguage() {
      const savedLanguage = await loadLanguage();

      if (isActive) {
        setLanguage(savedLanguage);
      }
    }

    refreshLanguage();

    return () => {
      isActive = false;
    };
  }, [])
);

  useEffect(() => {
    const enableAdmin = async () => {
      const isAdmin = false;

      if (isAdmin) {
        await setAdminMode();
      }
    };

    enableAdmin();
  }, []);
  
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

  const selectPack = useCallback(
  async (pack: PackType) => {
    const currentUser = auth.currentUser;

    if (!currentUser) return;

    if (pack === "text" && textRemaining <= 0) {
      Alert.alert(
        t.createStory.emptyPack,
        t.createStory.emptyTextPack
      );
      return;
    }

    if (pack === "illustrated" && illustratedRemaining <= 0) {
      Alert.alert(
        t.createStory.emptyPack,
        t.createStory.emptyIllustratedPack
      );
      return;
    }

    setSelectedPack(pack);

    await AsyncStorage.setItem(
      `ACTIVE_STORY_PACK:${currentUser.uid}`,
      pack
    );
  },
  [
    textRemaining,
    illustratedRemaining,
    language,
  ]
);

const openPackSelector = useCallback(() => {
  if (!isConnected || loading) return;

  const options: any[] = [];

  if (textRemaining > 0) {
    options.push({
      text: `${t.createStory.textPackChoice} · ${textRemaining} ${
        textRemaining === 1
          ? t.createStory.remainingStory
          : t.createStory.remainingStories
      }`,
      onPress: () => selectPack("text"),
    });
  }

  if (illustratedRemaining > 0) {
    options.push({
      text: `${t.createStory.illustratedPackChoice} · ${illustratedRemaining} ${
        illustratedRemaining === 1
          ? t.createStory.remainingStory
          : t.createStory.remainingStories
      }`,
      onPress: () => selectPack("illustrated"),
    });
  }

  options.push({
    text: t.common.cancel,
    style: "cancel",
  });

  Alert.alert(
    t.createStory.choosePack,
    t.createStory.choosePackMessage,
    options
  );
}, [
  illustratedRemaining,
  isConnected,
  loading,
  selectPack,
  textRemaining,
  language,
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
          t.createStory.guestWelcomeTitle,
          t.createStory.guestWelcomeMessage,
          [{ text: t.createStory.guestWelcomeButton }],
          { cancelable: false }
        );
      }
    };

    showGuestWelcome().catch((error) => {
      console.log("Erreur message de bienvenue :", error);
    });
  }, [language]);

  async function choosePhotoFromGallery() {
  try {
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
  t.createStory.permissionRequired,
  t.createStory.galleryPermission
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
  t.createStory.cartoonActivated,
  t.createStory.realisticPhotoBlocked
);
      }
    }
  } catch (error) {
    console.log("Erreur sélection photo :", error);

    Alert.alert(
  t.common.error,
  t.createStory.photoSelectionError
);
  }
}

async function takeReferencePhoto() {
  try {
    const permission =
      await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
  t.createStory.permissionRequired,
  t.createStory.cameraPermission
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
  t.createStory.cartoonActivated,
  t.createStory.realisticPhotoBlocked
);
      }
    }
  } catch (error) {
    console.log("Erreur appareil photo :", error);

    Alert.alert(
  t.common.error,
  t.createStory.cameraError
);
  }
}

function openPhotoSelector() {
  if (loading) return;

  Alert.alert(
  t.createStory.photoTitle,
  t.createStory.photoDescription,
  [
    {
      text: t.createStory.takePhoto,
      onPress: takeReferencePhoto,
    },
    {
      text: t.createStory.chooseGallery,
      onPress: choosePhotoFromGallery,
    },
    {
      text: t.common.cancel,
      style: "cancel",
    },
  ]
);
}

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      Alert.alert(
  t.common.error,
  t.createStory.missingIdea
);
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
  t.createStory.profileNotFound,
  t.createStory.profileNotFoundMessage
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
  t.createStory.packsFinished,
  t.createStory.packsFinishedMessage,
  [
    {
      text: t.createStory.later,
      style: "cancel",
    },
    {
      text: t.createStory.viewPacks,
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
  t.createStory.surpriseTitle,
  t.createStory.surpriseMessage,
  [
    {
      text: t.createStory.discoverIllustrations,
      onPress: () => resolve(),
    },
  ],
  { cancelable: false }
);
      });
    }

    const textOnlyMode =
      usage.mode === "guest-first-story" ||
      usage.mode === "paid-text";

    try {
      setLoading(true);
      setLoadingText(t.createStory.creatingStory);

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
  sceneCount,
  language
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

        setLoadingText(
  `${t.createStory.creatingImage} ${i + 1}/${sceneCount}...`
);

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
  const label =
    finishedPack === "text"
      ? t.createStory.textShort.replace("📖 ", "")
      : t.createStory.illustratedShort.replace("🎨 ", "");

  Alert.alert(
    `📖 ${label}`,
    t.createStory.packsFinishedMessage,
    [
      {
        text: t.createStory.readStory,
        onPress: () => router.push("/player"),
      },
      {
        text: t.createStory.buyAnotherPack,
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
      Alert.alert(
  t.common.error,
  t.createStory.generationError
);
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
        <Text style={styles.title}>
  {t.createStory.title}
</Text>

<Text style={styles.subtitle}>
  {t.createStory.subtitle}
</Text>

        {isConnected && (
          <View style={styles.carnetsCard}>
            <Text style={styles.activePackEyebrow}>
  {t.createStory.activePack}
</Text>

            <TouchableOpacity
              style={styles.activePackButton}
              onPress={openPackSelector}
              disabled={loading}
              activeOpacity={0.85}
            >
              <View style={styles.activePackTextBox}>
                <Text style={styles.activePackTitle}>
                  {selectedPack === "text"
  ? t.createStory.textPack
  : t.createStory.illustratedPack}
                </Text>

                <Text style={styles.activePackSubtitle}>
  {selectedPack === "text"
    ? `${textRemaining} ${
        textRemaining === 1
          ? t.createStory.remainingStory
          : t.createStory.remainingStories
      }`
    : `${illustratedRemaining} ${
        illustratedRemaining === 1
          ? t.createStory.remainingStory
          : t.createStory.remainingStories
      }`}
</Text>
              </View>

              {textRemaining > 0 && illustratedRemaining > 0 ? (
                <Text style={styles.activePackArrow}>⌄</Text>
              ) : null}
            </TouchableOpacity>

            {textRemaining > 0 && illustratedRemaining > 0 ? (
              <Text style={styles.changePackHint}>
                {t.createStory.changePack}
              </Text>
            ) : null}

            <View style={styles.packMiniRow}>
  <Text style={styles.packMiniText}>
    {t.createStory.textShort} : {textRemaining}
  </Text>

  <Text style={styles.packMiniText}>
    {t.createStory.illustratedShort} : {illustratedRemaining}
  </Text>
</View>

            <TouchableOpacity
              style={styles.buyCarnetButton}
              onPress={() => router.push("/premium" as any)}
              disabled={loading}
            >
              <Text style={styles.buyCarnetButtonText}>
  {t.createStory.buyPack}
</Text>
            </TouchableOpacity>
          </View>
        )}

        <TextInput
          style={styles.input}
          placeholder={t.createStory.ideaPlaceholder}
          placeholderTextColor="#AAA"
          value={prompt}
          onChangeText={setPrompt}
          multiline
        />

        <Text style={styles.photoHelpText}>
  {t.createStory.optionalPhoto}
  {"\n"}
  {t.createStory.photoHelp}
</Text>

        <TouchableOpacity
  style={styles.photoButton}
  onPress={openPhotoSelector}
  disabled={loading}
>
  <Text style={styles.photoButtonText}>
    {referencePhoto
      ? t.createStory.changePhoto
      : t.createStory.addPhoto}
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
      {t.createStory.photoAdded}
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
      {t.createStory.removePhoto}
    </Text>
  </TouchableOpacity>
)}

        <Text style={styles.sectionTitle}>
  {t.createStory.imageStyleTitle}
</Text>

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
  t.createStory.styleUnavailable,
  `🔒 ${t.createStory.realisticPhotoBlocked}`
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
        {getImageStyleLabel(item.id)}
{isRealisticBlocked ? " 🔒" : ""}
      </Text>
    </TouchableOpacity>
  );
})}
        </View>

        <Text style={styles.sectionTitle}>
  {t.createStory.storyTypeTitle}
</Text>

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
                  {getStoryTypeLabel(item.id)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>
  {t.createStory.lengthTitle}
</Text>

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
                  {getStoryLengthLabel(item.id)}
{item.disabled
  ? ` 🔒 ${t.createStory.comingSoon}`
  : ""}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>
  {t.createStory.narratorTitle}
</Text>

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
          {getNarratorSubtitle(item.id)}
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
            {loading
  ? loadingText || t.createStory.generating
  : t.createStory.generate}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push("/")}
          disabled={loading}
        >
          <Text style={styles.backText}>
  {t.createStory.backHome}
</Text>
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