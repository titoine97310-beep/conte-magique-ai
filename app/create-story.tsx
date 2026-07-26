import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

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
  { id: "medium", label: "📖 Moyenne", scenes: 6, disabled: true },
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
  const [storyType, setStoryType] = useState<StoryType>("magic");
  const [storyLength, setStoryLength] = useState<StoryLength>("short");
  const [narrator, setNarrator] =
  useState<Narrator>("narratrice");

  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [textRemaining, setTextRemaining] = useState(0);
  const [illustratedRemaining, setIllustratedRemaining] = useState(0);
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
    setTextRemaining(profile?.packs?.text?.storiesRemaining ?? 0);
    setIllustratedRemaining(
      profile?.packs?.illustrated?.storiesRemaining ?? 0
    );
  }, []);

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
      } else if (profile.packs.text.storiesRemaining > 0) {
        usage = { allowed: true, mode: "paid-text" };
      } else if (profile.packs.illustrated.storiesRemaining > 0) {
        usage = { allowed: true, mode: "paid-image" };
      } else {
        usage = { allowed: false, mode: "blocked" };
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

      const storyData = await generateStory(prompt, storyType, sceneCount);
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

        const imageUrl = await generateImage(styledImagePrompt);

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
    <LinearGradient colors={["#0F172A", "#3B0764"]} style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Parle à l’IA</Text>

        <Text style={styles.subtitle}>Écris ton idée d’histoire ✨</Text>

        {isConnected && (
          <View style={styles.carnetsCard}>
            <View style={styles.carnetLine}>
              <Text style={styles.carnetLabel}>📖 Carnet Texte</Text>
              <Text style={styles.carnetCount}>{textRemaining}</Text>
            </View>

            <View style={styles.carnetSeparator} />

            <View style={styles.carnetLine}>
              <Text style={styles.carnetLabel}>🎨 Carnet Illustré</Text>
              <Text style={styles.carnetCount}>{illustratedRemaining}</Text>
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

        <Text style={styles.sectionTitle}>Style des images</Text>

        <View style={styles.grid}>
          {imageStyles.map((item) => {
            const isActive = imageStyle === item.id;

            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.optionButton, isActive && styles.optionActive]}
                onPress={() => setImageStyle(item.id)}
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
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 70,
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
});