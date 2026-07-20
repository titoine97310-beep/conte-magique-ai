import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useState } from "react";
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
  incrementStoryUsage,
  setAdminMode,
} from "../services/usageService";

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

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      Alert.alert("Erreur", "Écris une idée avant de générer une histoire.");
      return;
    }

    const usage = await canGenerateStory();

    if (!usage.allowed) {
      Alert.alert(
        "Pack terminé",
        "Ton pack d'histoires est terminé. Choisis un nouveau pack pour continuer."
      );

      router.push("/premium");
      return;
    }

    if (usage.mode === "free-text") {
      await new Promise<void>((resolve) => {
        Alert.alert(
          "🎁 Bienvenue dans ConteMagiqueIA",
          "Tu as droit à 2 histoires gratuites :\n\n1️⃣ Une première histoire en texte seul\n2️⃣ Une deuxième histoire avec texte + images\n\nEnsuite, tu pourras choisir un pack pour continuer l’aventure.",
          [
            {
              text: "OK, je commence",
              onPress: () => resolve(),
            },
          ]
        );
      });
    }

const textOnlyMode =
  usage.mode === "free-text" || usage.mode === "paid-text";

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

      await incrementStoryUsage(usage.mode);

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