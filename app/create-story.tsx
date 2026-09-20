import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Image,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
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

const imageStyleArtwork = {
  cartoon: require("../assets/images/style-cartoon.png"),
  fantasy: require("../assets/images/style-fantasy.png"),
  realistic: require("../assets/images/style-realistic.png"),
  comic: require("../assets/images/style-comic.png"),
} as const;

const storyTypeArtwork = {
  funny: require("../assets/images/type-funny.png"),
  adventure: require("../assets/images/type-adventure.png"),
  magic: require("../assets/images/type-magic.png"),
  mystery: require("../assets/images/type-mystery.png"),
} as const;

const narratorArtwork = {
  narratrice: require("../assets/images/narrator-elise.png"),
  narrateur: require("../assets/images/narrator-arthur.png"),
  magicien: require("../assets/images/narrator-merlin.png"),
  fee: require("../assets/images/narrator-luna.png"),
  dodo: require("../assets/images/narrator-dodo.png"),
} as const;

type MagicChoiceCardProps = {
  image: any;
  title: string;
  subtitle?: string;
  active: boolean;
  disabled?: boolean;
  onPress: () => void;
  tall?: boolean;
};

function MagicChoiceCard({
  image,
  title,
  subtitle,
  active,
  disabled = false,
  onPress,
  tall = false,
}: MagicChoiceCardProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (value: number) => {
    Animated.spring(scale, {
      toValue: value,
      useNativeDriver: true,
      speed: 28,
      bounciness: 5,
    }).start();
  };

  return (
    <Animated.View
      style={[
        styles.magicChoiceOuter,
        tall && styles.magicChoiceOuterTall,
        disabled && styles.magicChoiceDisabled,
        { transform: [{ scale }] },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.magicChoiceTouchable,
          active && styles.magicChoiceTouchableActive,
        ]}
        onPress={onPress}
        onPressIn={() => animateTo(0.965)}
        onPressOut={() => animateTo(active ? 1.025 : 1)}
        disabled={disabled}
        activeOpacity={0.96}
      >
        <ImageBackground
          source={image}
          style={styles.magicChoiceImage}
          imageStyle={styles.magicChoiceImageRadius}
          resizeMode="cover"
        >
          <LinearGradient
            colors={[
              "rgba(0,0,0,0)",
              "rgba(0,0,0,0)",
              "rgba(0,0,0,0)",
            ]}
            locations={[0, 0.48, 1]}
            style={styles.magicChoiceShade}
          >
            {active ? (
              <View style={styles.magicChoiceSelectedBadge}>
                <Text style={styles.magicChoiceSelectedStar}>✦</Text>
              </View>
            ) : null}

            {/* Le texte est déjà intégré directement dans les visuels.
                On conserve uniquement l’image et l’indicateur de sélection. */}
          </LinearGradient>
        </ImageBackground>
      </TouchableOpacity>
    </Animated.View>
  );
}

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
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    pack?: string | string[];
  }>();

  const rawPurchasedPack = Array.isArray(params.pack)
    ? params.pack[0]
    : params.pack;

  const purchasedPack: PackType | null =
    rawPurchasedPack === "text"
      ? "text"
      : rawPurchasedPack === "illustrated"
        ? "illustrated"
        : null;

  const purchasedPackHandledRef = useRef<string | null>(null);

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

  const [selectedStoryTypes, setSelectedStoryTypes] = useState<StoryType[]>(["magic"]);
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

  useEffect(() => {
    if (!purchasedPack || !isConnected) {
      return;
    }

    const available =
      purchasedPack === "text"
        ? textRemaining
        : illustratedRemaining;

    if (available <= 0) {
      return;
    }

    const token = `${purchasedPack}:${available}`;

    if (purchasedPackHandledRef.current === token) {
      return;
    }

    purchasedPackHandledRef.current = token;
    setSelectedPack(purchasedPack);

    const currentUser = auth.currentUser;

    if (currentUser) {
      void AsyncStorage.setItem(
        `ACTIVE_STORY_PACK:${currentUser.uid}`,
        purchasedPack
      );
    }
  }, [
    purchasedPack,
    isConnected,
    textRemaining,
    illustratedRemaining,
  ]);

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

  const toggleStoryType = (type: StoryType) => {
    setSelectedStoryTypes((current) => {
      if (current.includes(type)) {
        // On garde toujours au moins un univers sélectionné.
        if (current.length === 1) {
          return current;
        }

        return current.filter((item) => item !== type);
      }

      // Deux univers maximum pour conserver une histoire claire.
      if (current.length >= 2) {
        return current;
      }

      return [...current, type];
    });
  };

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
  selectedStoryTypes,
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
            storyType: selectedStoryTypes.join("+"),
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
          storyType: selectedStoryTypes.join("+"),
          storyLength,
          imageUrl,
        });
      }

      const finalStory = {
        prompt,
        imageStyle,
        storyType: selectedStoryTypes.join("+"),
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
      colors={["#10143F", "#35206F", "#21145B", "#080B25"]}
      locations={[0, 0.34, 0.72, 1]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: 34 + Math.max(insets.bottom, 20) },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.hero}>
            <View style={styles.heroText}>
              <Text style={styles.heroStars}>✦  ✨  ✦</Text>
              <Text style={styles.title}>{t.createStory.title}</Text>
              <Text style={styles.subtitle}>{t.createStory.subtitle}</Text>
            </View>

            <Image
              source={require("../assets/images/magico.png")}
              style={styles.magico}
              resizeMode="contain"
            />
          </View>

          {isConnected && purchasedPack ? (
            <LinearGradient
              colors={
                purchasedPack === "text"
                  ? ["#1D4ED8", "#4338CA", "#6D28D9"]
                  : ["#6D28D9", "#7C3AED", "#4338CA"]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.purchasedPackBanner}
            >
              <Text style={styles.purchasedPackStars}>✦ ✨ ✦</Text>
              <Text style={styles.purchasedPackTitle}>
                {purchasedPack === "text" ? "📖 " : "🎨 "}
                {language === "fr"
                  ? purchasedPack === "text"
                    ? "Carnet Texte sélectionné"
                    : "Carnet Illustré sélectionné"
                  : language === "en"
                    ? purchasedPack === "text"
                      ? "Text Pack selected"
                      : "Illustrated Pack selected"
                    : purchasedPack === "text"
                      ? "Paquete de Texto seleccionado"
                      : "Paquete Ilustrado seleccionado"}
              </Text>
              <Text style={styles.purchasedPackSubtitle}>
                {language === "fr"
                  ? purchasedPack === "text"
                    ? "Ta prochaine histoire utilisera automatiquement ton carnet Texte."
                    : "Ta prochaine histoire utilisera automatiquement ton carnet Illustré."
                  : language === "en"
                    ? purchasedPack === "text"
                      ? "Your next story will automatically use your Text Pack."
                      : "Your next story will automatically use your Illustrated Pack."
                    : purchasedPack === "text"
                      ? "Tu próxima historia usará automáticamente tu paquete de Texto."
                      : "Tu próxima historia usará automáticamente tu paquete Ilustrado."}
              </Text>
            </LinearGradient>
          ) : null}

          {isConnected && (
            <LinearGradient
              colors={["rgba(82,49,154,0.92)", "rgba(38,31,101,0.96)"]}
              style={styles.carnetsCard}
            >
              <View style={styles.packHeaderRow}>
                <Text style={styles.activePackEyebrow}>
                  ✨ {t.createStory.activePack}
                </Text>
                <Text style={styles.packSparkle}>✦</Text>
              </View>

              <TouchableOpacity
                style={styles.activePackButton}
                onPress={openPackSelector}
                disabled={loading}
                activeOpacity={0.85}
              >
                <View style={styles.activePackIcon}>
                  <Text style={styles.activePackIconText}>
                    {selectedPack === "text" ? "📖" : "🎨"}
                  </Text>
                </View>

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
                <View style={styles.packMiniPill}>
                  <Text style={styles.packMiniText}>
                    {t.createStory.textShort} : {textRemaining}
                  </Text>
                </View>

                <View style={styles.packMiniPill}>
                  <Text style={styles.packMiniText}>
                    {t.createStory.illustratedShort} : {illustratedRemaining}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.buyCarnetButton}
                onPress={() => router.push("/premium" as any)}
                disabled={loading}
                activeOpacity={0.85}
              >
                <Text style={styles.buyCarnetButtonText}>
                  👑 {t.createStory.buyPack}
                </Text>
              </TouchableOpacity>
            </LinearGradient>
          )}

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionNumber}>1</Text>
              <View style={styles.sectionHeaderText}>
                <Text style={styles.sectionTitle}>
                  {language === "fr"
                    ? "Imagine ton aventure"
                    : language === "en"
                      ? "Imagine your adventure"
                      : "Imagina tu aventura"}
                </Text>
                <Text style={styles.sectionHint}>
                  {language === "fr"
                    ? "Raconte à Magico l’histoire que tu aimerais vivre."
                    : language === "en"
                      ? "Tell Magico the story you would like to experience."
                      : "Cuéntale a Magico la historia que te gustaría vivir."}
                </Text>
              </View>
            </View>

            <TextInput
              style={styles.input}
              placeholder={t.createStory.ideaPlaceholder}
              placeholderTextColor="#8E8AA8"
              value={prompt}
              onChangeText={setPrompt}
              multiline
              editable={!loading}
            />
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionNumber}>2</Text>
              <View style={styles.sectionHeaderText}>
                <Text style={styles.sectionTitle}>
                  {language === "fr"
                    ? "Ajoute une photo"
                    : language === "en"
                      ? "Add a photo"
                      : "Añade una foto"}
                </Text>
                <Text style={styles.sectionHint}>
                  {t.createStory.optionalPhoto}
                </Text>
              </View>
            </View>

            <Text style={styles.photoHelpText}>{t.createStory.photoHelp}</Text>

            <TouchableOpacity
              style={styles.photoButton}
              onPress={openPhotoSelector}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Text style={styles.photoButtonIcon}>📸</Text>
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

                <View style={styles.photoPreviewInfo}>
                  <Text style={styles.photoPreviewCheck}>✓</Text>
                  <Text style={styles.photoPreviewText}>
                    {t.createStory.photoAdded}
                  </Text>
                </View>
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
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionNumber}>3</Text>
              <Text style={styles.sectionTitle}>
                {t.createStory.imageStyleTitle}
              </Text>
            </View>

            <View style={styles.magicGrid}>
              {imageStyles.map((item) => {
                const isActive = imageStyle === item.id;
                const isRealisticBlocked =
                  Boolean(referencePhoto) && item.id === "realistic";

                return (
                  <MagicChoiceCard
                    key={item.id}
                    image={imageStyleArtwork[item.id]}
                    title={getImageStyleLabel(item.id)}
                    active={isActive}
                    disabled={loading}
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
                  />
                );
              })}
            </View>
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionNumber}>4</Text>
              <Text style={styles.sectionTitle}>
                {t.createStory.storyTypeTitle}
              </Text>
            </View>

            <Text style={styles.storyTypeHint}>
              {language === "fr"
                ? "Choisis 1 ou 2 univers à mélanger ✨"
                : language === "en"
                  ? "Choose 1 or 2 worlds to blend ✨"
                  : "Elige 1 o 2 universos para combinar ✨"}
            </Text>

            <View style={styles.magicGrid}>
              {storyTypes.map((item) => {
                const isActive = selectedStoryTypes.includes(item.id);

                return (
                  <MagicChoiceCard
                    key={item.id}
                    image={storyTypeArtwork[item.id]}
                    title={getStoryTypeLabel(item.id)}
                    active={isActive}
                    disabled={loading}
                    onPress={() => toggleStoryType(item.id)}
                  />
                );
              })}
            </View>
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionNumber}>5</Text>
              <Text style={styles.sectionTitle}>{t.createStory.lengthTitle}</Text>
            </View>

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
                    activeOpacity={0.85}
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
                    {!item.disabled && isActive ? (
                      <Text style={styles.selectedStar}>✦</Text>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionNumber}>6</Text>
              <Text style={styles.sectionTitle}>
                {t.createStory.narratorTitle}
              </Text>
            </View>

            <View style={styles.magicGrid}>
              {narrators.map((item) => {
                const isActive = narrator === item.id;

                return (
                  <MagicChoiceCard
                    key={item.id}
                    image={narratorArtwork[item.id]}
                    title={item.label}
                    subtitle={getNarratorSubtitle(item.id)}
                    active={isActive}
                    disabled={loading}
                    onPress={() => setNarrator(item.id)}
                    tall
                  />
                );
              })}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonLoading]}
            onPress={handleGenerate}
            disabled={loading}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={["#FFE16A", "#FFC13D", "#F5A623"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.generateGradient}
            >
              <Text style={styles.generateSparkle}>✦</Text>
              <View style={styles.generateTextBox}>
                <Text style={styles.buttonText}>
                  {loading
                    ? loadingText || t.createStory.generating
                    : t.createStory.generate}
                </Text>
                {!loading ? (
                  <Text style={styles.generateHint}>
                    {language === "fr"
                      ? "Magico s’occupe du reste ✨"
                      : language === "en"
                        ? "Magico takes care of the rest ✨"
                        : "Magico se encarga del resto ✨"}
                  </Text>
                ) : null}
              </View>
              <Text style={styles.generateMagic}>✨</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push("/")}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={styles.backText}>{t.createStory.backHome}</Text>
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
    paddingHorizontal: 18,
    paddingTop: 6,
    width: "100%",
    maxWidth: 820,
    alignSelf: "center",
  },

  hero: {
    minHeight: 176,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    overflow: "visible",
  },

  heroText: {
    flex: 1,
    paddingLeft: 2,
    zIndex: 2,
  },

  heroStars: {
    color: "#FFD45C",
    fontSize: 13,
    letterSpacing: 4,
    marginBottom: 5,
  },

  title: {
    fontSize: 31,
    lineHeight: 36,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  subtitle: {
    color: "#DDD9F8",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    maxWidth: 245,
  },

  magico: {
    width: 142,
    height: 142,
    marginRight: -10,
  },

  purchasedPackBanner: {
    borderWidth: 1.2,
    borderColor: "rgba(255,212,92,0.72)",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    alignItems: "center",
    shadowColor: "#6D28D9",
    shadowOpacity: 0.24,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },

  purchasedPackStars: {
    color: "#FFD45C",
    fontSize: 13,
    letterSpacing: 3,
    marginBottom: 3,
  },

  purchasedPackTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
    textAlign: "center",
  },

  purchasedPackSubtitle: {
    color: "#EEEAFE",
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
    marginTop: 4,
  },

  carnetsCard: {
    borderWidth: 1.2,
    borderColor: "rgba(183,158,255,0.50)",
    borderRadius: 24,
    padding: 15,
    marginBottom: 14,
    overflow: "hidden",
  },

  packHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  activePackEyebrow: {
    color: "#E9E3FF",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginBottom: 9,
  },

  packSparkle: {
    color: "#FFD45C",
    fontSize: 16,
  },

  activePackButton: {
    minHeight: 72,
    borderRadius: 18,
    backgroundColor: "rgba(255,193,61,0.13)",
    borderWidth: 1.2,
    borderColor: "#FFD45C",
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
  },

  activePackIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  activePackIconText: {
    fontSize: 25,
  },

  activePackTextBox: {
    flex: 1,
  },

  activePackTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },

  activePackSubtitle: {
    color: "#E7E3F8",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },

  activePackArrow: {
    color: "#FFD45C",
    fontSize: 28,
    fontWeight: "900",
    marginLeft: 8,
    marginTop: -5,
  },

  changePackHint: {
    color: "#CFC8E9",
    fontSize: 11,
    textAlign: "center",
    marginTop: 7,
  },

  packMiniRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },

  packMiniPill: {
    flex: 1,
    minHeight: 34,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },

  packMiniText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
  },

  buyCarnetButton: {
    marginTop: 12,
    minHeight: 43,
    borderRadius: 14,
    backgroundColor: "rgba(255,193,61,0.13)",
    borderWidth: 1,
    borderColor: "rgba(255,212,92,0.58)",
    alignItems: "center",
    justifyContent: "center",
  },

  buyCarnetButtonText: {
    color: "#FFD45C",
    fontSize: 13,
    fontWeight: "900",
  },

  sectionCard: {
    backgroundColor: "rgba(255,255,255,0.075)",
    borderWidth: 1,
    borderColor: "rgba(176,159,235,0.23)",
    borderRadius: 22,
    padding: 15,
    marginBottom: 12,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  sectionNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#FFC13D",
    color: "#241A3E",
    textAlign: "center",
    paddingTop: 5,
    fontSize: 14,
    fontWeight: "900",
    marginRight: 10,
    overflow: "hidden",
  },

  sectionHeaderText: {
    flex: 1,
  },

  sectionTitle: {
    flex: 1,
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 16,
  },

  sectionHint: {
    color: "#CFCBE8",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },

  input: {
    backgroundColor: "#FAF9FF",
    color: "#211B39",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 126,
    fontSize: 15,
    lineHeight: 21,
    textAlignVertical: "top",
    borderWidth: 2,
    borderColor: "rgba(255,212,92,0.72)",
  },

  photoHelpText: {
    color: "#CFCBE8",
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 11,
  },

  photoButton: {
    minHeight: 52,
    backgroundColor: "rgba(91,64,174,0.58)",
    borderWidth: 1,
    borderColor: "rgba(190,170,255,0.50)",
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },

  photoButtonIcon: {
    fontSize: 20,
    marginRight: 8,
  },

  photoButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },

  photoPreviewCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 18,
    padding: 10,
    marginTop: 12,
    alignItems: "center",
  },

  photoPreview: {
    width: 154,
    height: 154,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "rgba(255,212,92,0.55)",
  },

  photoPreviewInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },

  photoPreviewCheck: {
    color: "#FFD45C",
    fontSize: 16,
    fontWeight: "900",
    marginRight: 6,
  },

  photoPreviewText: {
    color: "#E7E3F8",
    fontSize: 12,
    fontWeight: "800",
  },

  removePhotoButton: {
    alignItems: "center",
    marginTop: 10,
  },

  removePhotoButtonText: {
    color: "#FFB4C1",
    fontSize: 12,
    fontWeight: "800",
  },

  storyTypeHint: {
    color: "#D9D2FF",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 10,
  },

  magicGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  magicChoiceOuter: {
    width: "48%",
    height: 142,
    borderRadius: 19,
    shadowColor: "#000000",
    shadowOpacity: 0.28,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },

  magicChoiceOuterTall: {
    height: 170,
  },

  magicChoiceDisabled: {
    opacity: 0.55,
  },

  magicChoiceTouchable: {
    flex: 1,
    borderRadius: 19,
    overflow: "hidden",
    borderWidth: 1.4,
    borderColor: "rgba(198,181,255,0.38)",
    backgroundColor: "rgba(58,42,122,0.82)",
  },

  magicChoiceTouchableActive: {
    borderWidth: 2.4,
    borderColor: "#FFD45C",
    shadowColor: "#FFD45C",
    shadowOpacity: 0.65,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 0 },
    elevation: 9,
  },

  magicChoiceImage: {
    flex: 1,
  },

  magicChoiceImageRadius: {
    borderRadius: 16,
  },

  magicChoiceShade: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 10,
  },

  magicChoiceSelectedBadge: {
    position: "absolute",
    top: 7,
    right: 7,
    width: 25,
    height: 25,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFD45C",
    borderWidth: 1,
    borderColor: "#FFF2B7",
  },

  magicChoiceSelectedStar: {
    color: "#4B3210",
    fontSize: 13,
    fontWeight: "900",
  },

  magicChoiceTextBox: {
    backgroundColor: "rgba(25,15,68,0.68)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },

  magicChoiceTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "900",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.55)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  magicChoiceTitleActive: {
    color: "#FFF5C7",
  },

  magicChoiceSubtitle: {
    color: "#E8E3FA",
    fontSize: 9.5,
    lineHeight: 13,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 3,
  },

  magicChoiceSubtitleActive: {
    color: "#FFF0B0",
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  optionButton: {
    width: "48%",
    minHeight: 51,
    backgroundColor: "rgba(81,63,150,0.48)",
    borderWidth: 1,
    borderColor: "rgba(188,174,242,0.30)",
    paddingHorizontal: 8,
    paddingVertical: 11,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },

  optionActive: {
    backgroundColor: "#FFC13D",
    borderColor: "#FFE08A",
  },

  optionText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center",
  },

  optionTextActive: {
    color: "#241A3E",
  },

  optionDisabled: {
    opacity: 0.42,
  },

  selectedStar: {
    position: "absolute",
    right: 7,
    top: 4,
    color: "#7A5010",
    fontSize: 10,
  },

  narratorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  narratorButton: {
    width: "48%",
    minHeight: 82,
    backgroundColor: "rgba(81,63,150,0.48)",
    borderWidth: 1,
    borderColor: "rgba(188,174,242,0.30)",
    borderRadius: 15,
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },

  narratorActive: {
    backgroundColor: "#FFC13D",
    borderColor: "#FFE08A",
  },

  narratorLabel: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
    textAlign: "center",
  },

  narratorLabelActive: {
    color: "#241A3E",
  },

  narratorSubtitle: {
    color: "#CFCBE8",
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 4,
  },

  narratorSubtitleActive: {
    color: "#59481E",
  },

  narratorStar: {
    position: "absolute",
    right: 8,
    top: 5,
    color: "#7A5010",
    fontSize: 11,
  },

  button: {
    borderRadius: 20,
    overflow: "hidden",
    marginTop: 5,
    shadowColor: "#FFC13D",
    shadowOpacity: 0.20,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },

  buttonLoading: {
    opacity: 0.72,
  },

  generateGradient: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },

  generateSparkle: {
    color: "#7A5010",
    fontSize: 18,
    marginRight: 10,
  },

  generateTextBox: {
    flex: 1,
    alignItems: "center",
  },

  buttonText: {
    color: "#231B3F",
    fontSize: 17,
    fontWeight: "900",
    textAlign: "center",
  },

  generateHint: {
    color: "#5D451A",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 3,
  },

  generateMagic: {
    fontSize: 22,
    marginLeft: 10,
  },

  backButton: {
    minHeight: 49,
    backgroundColor: "rgba(46,37,112,0.82)",
    borderWidth: 1,
    borderColor: "rgba(255,212,92,0.48)",
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 13,
    marginBottom: 20,
  },

  backText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
});
