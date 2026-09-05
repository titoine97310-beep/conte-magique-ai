import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";
import { useKeepAwake } from "expo-keep-awake";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as Speech from "expo-speech";
import { addDoc, collection, doc, getDoc, serverTimestamp } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getCurrentStory, setCurrentStory } from "../services/currentStory";
import { auth, db } from "../services/firebase";
import { toggleFavoriteStory } from "../services/storageService";


const TTS_URL = "https://conte-magique-ai.onrender.com/tts";
const VIDEO_URL =
  "https://conte-magique-ai.onrender.com/video";

const REPORT_REASONS = [
  "Contenu inapproprié ou choquant",
  "Violence ou contenu dangereux",
  "Contenu à caractère sexuel",
  "Autre problème",
] as const;

export default function PlayerScreen() {
  useKeepAwake();

  useEffect(() => {
    async function configureAudio() {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });
      } catch (error) {
        console.log("Erreur configuration audio :", error);
      }
    }

    configureAudio();
  }, []);

  const story = getCurrentStory();
  const scenes = story?.scenes || [];

  const [index, setIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [favorite, setFavorite] = useState(!!story?.favorite);
  const [nightMode, setNightMode] = useState(false);
  const [bedtimeMode, setBedtimeMode] = useState(false);
  const [ambienceEnabled, setAmbienceEnabled] = useState(true);
  const [iaReading, setIaReading] = useState(false);
  const [finalVideoUrl, setFinalVideoUrl] =
  useState<string | null>(null);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportSending, setReportSending] = useState(false);
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [videoGenerating, setVideoGenerating] = useState(false);

  const soundRef = useRef<Audio.Sound | null>(null);
  const ttsSoundRef = useRef<Audio.Sound | null>(null);
  const audioRunRef = useRef(0);
  const iaRunRef = useRef(0);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const moveAnim = useRef(new Animated.Value(20)).current;
  const zoomAnim = useRef(new Animated.Value(1)).current;

  const current = scenes[index];

  const gradientColors: [string, string] =
    nightMode || bedtimeMode ? ["#020617", "#111827"] : ["#111827", "#312E81"];

  function styleLabel() {
    if (story?.imageStyle === "cartoon") return "🎨 Cartoon";
    if (story?.imageStyle === "fantasy") return "🧙 Fantasy";
    if (story?.imageStyle === "realistic") return "🌍 Réaliste";
    if (story?.imageStyle === "comic") return "📖 BD";
    return "✨ Style magique";
  }

  function ambienceLabel() {
    if (current?.ambience === "forest") return "🌳 Forêt";
    if (current?.ambience === "ocean") return "🌊 Mer";
    if (current?.ambience === "night") return "🌙 Nuit";
    if (current?.ambience === "danger") return "⚠️ Danger";
    if (current?.ambience === "calm") return "🕊️ Calme";
    if (current?.ambience === "victory") return "🏆 Victoire";
    return "✨ Magie";
  }

  function getAmbienceSound(ambience?: string) {
    switch (ambience) {
      case "forest":
        return require("../assets/sounds/foret-oiseaux.mp3");
      case "ocean":
        return require("../assets/sounds/vague.mp3");
      case "night":
        return require("../assets/sounds/night.mp3");
      case "danger":
        return require("../assets/sounds/danger1.mp3");
      case "calm":
        return require("../assets/sounds/calm.mp3");
      case "victory":
        return require("../assets/sounds/victoire.mp3");
      case "baguette-magique":
        return require("../assets/sounds/baguette-magique.mp3");
      case "magic":
      default:
        return require("../assets/sounds/douce.mp3");
    }
  }

  async function stopTTS() {
    try {
      if (ttsSoundRef.current) {
        await ttsSoundRef.current.stopAsync();
        await ttsSoundRef.current.unloadAsync();
        ttsSoundRef.current = null;
      }
    } catch (e) {
      console.log("Erreur arrêt TTS :", e);
    }
  }

  async function lowerAmbience(isBedtime = false) {
    try {
      if (soundRef.current) {
        await soundRef.current.setVolumeAsync(isBedtime ? 0.05 : 0.15);
      }
    } catch (e) {
      console.log("Erreur baisse ambiance :", e);
    }
  }

  async function stopAmbience() {
    try {
      audioRunRef.current += 1;

      const sound = soundRef.current;
      soundRef.current = null;

      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
      }
    } catch (e) {
      console.log("Erreur arrêt ambiance :", e);
    }
  }

  async function fadeOutAndStop(sound: Audio.Sound | null, runId: number) {
    if (!sound) return;

    try {
      for (let volume = 0.5; volume >= 0; volume -= 0.03) {
        if (audioRunRef.current !== runId) return;

        await sound.setVolumeAsync(Math.max(volume, 0));
        await new Promise((r) => setTimeout(r, 80));
      }

      await sound.stopAsync();
      await sound.unloadAsync();
    } catch (e) {
      console.log("Erreur fade out :", e);
    }
  }

  async function playAmbience(ambience?: string) {
    if (!ambienceEnabled) return;

    try {
      const runId = audioRunRef.current + 1;
      audioRunRef.current = runId;

      const oldSound = soundRef.current;
      soundRef.current = null;

      await fadeOutAndStop(oldSound, runId);

      if (audioRunRef.current !== runId) return;

      const { sound } = await Audio.Sound.createAsync(getAmbienceSound(ambience), {
        isLooping: true,
        volume: 0,
      });

      if (audioRunRef.current !== runId) {
        await sound.unloadAsync();
        return;
      }

      soundRef.current = sound;
      await sound.playAsync();

      const maxVolume = bedtimeMode ? 0.06 : nightMode ? 0.08 : 0.12;

      for (let volume = 0; volume <= maxVolume; volume += 0.02) {
        if (audioRunRef.current !== runId) return;

        await sound.setVolumeAsync(volume);
        await new Promise((r) => setTimeout(r, 80));
      }
    } catch (e) {
      console.log("Erreur ambiance :", e);
    }
  }

  async function playTTSAndWait(
  text: string,
  runId: number,
  emotion: string,
  isBedtime = false
) {
  return new Promise<void>(async (resolve) => {
    try {
      Speech.stop();
      await stopTTS();
      await lowerAmbience(isBedtime);

      console.log("Narrateur envoyé au backend :", story?.narrator);

      const response = await fetch(TTS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
  text,
  mode: isBedtime ? "bedtime" : "story",
  emotion: emotion || "warm",
  narrator: story?.narrator || "narratrice",
}),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log("Réponse backend TTS :", response.status, errorText);
        throw new Error(`Erreur backend TTS ${response.status}`);
      }

      if (iaRunRef.current !== runId) return resolve();

      const blob = await response.blob();

const audioUri = await new Promise<string>((resolveAudio, rejectAudio) => {
  const reader = new FileReader();

  reader.onloadend = () => {
    if (typeof reader.result === "string") {
      resolveAudio(reader.result);
    } else {
      rejectAudio(new Error("Conversion audio impossible"));
    }
  };

  reader.onerror = () => {
    rejectAudio(new Error("Erreur de lecture audio"));
  };

  reader.readAsDataURL(blob);
});

if (iaRunRef.current !== runId) {
  return resolve();
}

const { sound } = await Audio.Sound.createAsync(
  { uri: audioUri },
  {
    shouldPlay: true,
    volume: 1,
    isLooping: false,
  }
);

ttsSoundRef.current = sound;

sound.setOnPlaybackStatusUpdate((status) => {
  if (!status.isLoaded) return;

  if (status.didJustFinish) {
    sound.setOnPlaybackStatusUpdate(null);

    void (async () => {
      try {
        await stopTTS();
        await stopAmbience();
      } finally {
        resolve();
      }
    })();
  }
});
    } catch (e) {
      console.log("Erreur TTS auto :", e);

      Speech.speak(text, {
        language: "fr-FR",
        pitch: isBedtime ? 0.8 : 1,
        rate: isBedtime ? 0.75 : 0.9,
        onDone: () => {
          stopAmbience();
          resolve();
        },
        onStopped: () => {
          stopAmbience();
          resolve();
        },
        onError: () => {
          stopAmbience();
          resolve();
        },
      });
    }
  });
}

  async function toggleFavorite() {
    if (!story?.id) return;

    const newFavorite = !favorite;
    setFavorite(newFavorite);

    setCurrentStory({ ...story, favorite: newFavorite });
    await toggleFavoriteStory(story.id);
  }

  function openReportModal() {
    setReportModalVisible(true);
  }

  function closeReportModal() {
    if (!reportSending) {
      setReportModalVisible(false);
    }
  }

  async function submitReport(reason: (typeof REPORT_REASONS)[number]) {
    if (reportSending) return;

    try {
      setReportSending(true);

      await addDoc(collection(db, "reports"), {
        type: "ai_generated_content",
        status: "new",
        reason,
        storyId: story?.id || null,
        storyTitle: story?.title || null,
        sceneIndex: index,
        sceneNumber: index + 1,
        sceneText: current?.text || "",
        imageUrl: current?.imageUrl || null,
        imagePrompt: current?.imagePrompt || null,
        imageStyle: story?.imageStyle || null,
        narrator: story?.narrator || null,
        userId: auth.currentUser?.uid || null,
        createdAt: serverTimestamp(),
      });

      setReportModalVisible(false);

      Alert.alert(
        "Signalement envoyé",
        "Merci. Ce contenu a bien été signalé et pourra être examiné."
      );
    } catch (error) {
      console.log("Erreur signalement :", error);

      Alert.alert(
        "Erreur",
        "Impossible d'envoyer le signalement pour le moment. Réessaie plus tard."
      );
    } finally {
      setReportSending(false);
    }
  }

  useEffect(() => {
    if (!current) return;

    fadeAnim.setValue(0);
    moveAnim.setValue(20);
    zoomAnim.setValue(1);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: bedtimeMode ? 1000 : 700,
        useNativeDriver: true,
      }),
      Animated.timing(moveAnim, {
        toValue: 0,
        duration: bedtimeMode ? 1000 : 700,
        useNativeDriver: true,
      }),
      Animated.timing(zoomAnim, {
        toValue: fullscreen ? 1 : bedtimeMode ? 1.04 : 1.08,
        duration: bedtimeMode ? 11000 : 7000,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index, fullscreen, bedtimeMode, nightMode]);

  useEffect(() => {
    return () => {
      Speech.stop();
      stopTTS();
      stopAmbience();
    };
  }, []);

  async function startIAStory(isBedtime = false) {
    if (!scenes.length) return;

    const runId = iaRunRef.current + 1;
    iaRunRef.current = runId;

    Speech.stop();
    await stopTTS();
    await stopAmbience();

    setIaReading(true);
    setIndex(0);

    if (isBedtime) {
      setNightMode(true);
      setBedtimeMode(true);
      setFullscreen(true);
    }

    for (let i = 0; i < scenes.length; i++) {
      if (iaRunRef.current !== runId) break;

      setIndex(i);

      const sceneAmbience = isBedtime ? "night" : scenes[i]?.ambience;

      if (ambienceEnabled) {
        await playAmbience(sceneAmbience);
      }

      await new Promise((r) => setTimeout(r, 600));

      if (iaRunRef.current !== runId) break;

      await playTTSAndWait(
        scenes[i]?.text || "",
        runId,
        scenes[i]?.ambience || "warm",
        isBedtime
      );

      if (iaRunRef.current !== runId) break;

      await new Promise((r) => setTimeout(r, isBedtime ? 1200 : 700));
    }

    if (iaRunRef.current === runId) {
      await finishStory();
    }

    setIaReading(false);
  }

  async function finishStory() {
    iaRunRef.current += 1;

    setIaReading(false);
    setFullscreen(false);
    setBedtimeMode(false);

    Speech.stop();
    await stopTTS();
    await stopAmbience();
  }

  function startFullscreenMode() {
    setFullscreen(true);
    startIAStory(false);
  }

  function startBedtimeMode() {
    startIAStory(true);
  }

  function replayStory() {
    Speech.stop();
    setIndex(0);
    setFullscreen(false);
    setBedtimeMode(false);
    startIAStory(false);
  }

  async function toggleAmbience() {
    const nextValue = !ambienceEnabled;
    setAmbienceEnabled(nextValue);

    if (!nextValue) {
      await stopAmbience();
    } else if (iaReading) {
      await playAmbience(current?.ambience);
    }
  }

  async function getVideoCreditsRemaining(
  sceneCount: number
) {
  const user = auth.currentUser;

  if (!user) return 0;

  const videoType =
    sceneCount === 4
      ? "short"
      : sceneCount === 6
        ? "medium"
        : null;

  if (!videoType) {
    return 0;
  }

  const userRef =
    doc(db, "users", user.uid);

  const userSnap =
    await getDoc(userRef);

  if (!userSnap.exists()) {
    return 0;
  }

  const data = userSnap.data();

  return Number(
    data?.videoCredits?.[videoType]
      ?.remaining || 0
  );
}

  async function openVideoModal() {
  if (videoGenerating) return;

  if (scenes.length !== 4 && scenes.length !== 6) {
    Alert.alert(
      "Dessin animé indisponible",
      "Seules les histoires de 4 ou 6 scènes peuvent être transformées en dessin animé pour le moment."
    );
    return;
  }

  const missingImage = scenes.some(
  (scene: { imageUrl?: string | null }) => !scene?.imageUrl
);

  if (missingImage) {
    Alert.alert(
      "Illustrations manquantes",
      "Toutes les scènes doivent avoir une illustration avant de créer le dessin animé."
    );
    return;
  }

  try {
  const remaining =
  await getVideoCreditsRemaining(
    scenes.length
  );

  if (remaining <= 0) {
    Alert.alert(
      "Aucun crédit vidéo",
      "Tu n'as pas encore de crédit pour créer un dessin animé.",
      [
        {
          text: "Annuler",
          style: "cancel",
        },
        {
          text: "Obtenir un crédit",
          onPress: () => router.push("/premium"),
        },
      ]
    );

    return;
  }
} catch (error) {
  console.error("Erreur vérification crédits vidéo :", error);

  Alert.alert(
    "Erreur",
    "Impossible de vérifier tes crédits vidéo. Réessaie dans quelques instants."
  );

  return;
}

  setVideoModalVisible(true);
}

function closeVideoModal() {
  if (!videoGenerating) {
    setVideoModalVisible(false);
  }
}

  async function createAnimatedVideo() {
  if (videoGenerating) return;

  const user = auth.currentUser;

  if (!user) {
    Alert.alert(
      "Connexion requise",
      "Connecte-toi pour créer ton dessin animé."
    );
    return;
  }

  try {
    setVideoGenerating(true);

    const token = await user.getIdToken();

    const images = await Promise.all(
  scenes.map(
    async (
      scene: {
        imageUrl?: string | null;
      },
      index: number
    ) => {
      const imageUrl =
        scene.imageUrl?.trim();

      if (!imageUrl) {
        return null;
      }

      // URL distante ou image déjà en base64 :
      // on la garde telle quelle.
      if (
        imageUrl.startsWith("https://") ||
        imageUrl.startsWith("data:image/")
      ) {
        return imageUrl;
      }

      // Image sauvegardée localement sur Android/iOS :
      // on l'envoie au backend sous forme de Data URI.
      if (imageUrl.startsWith("file://")) {
        const base64 =
          await FileSystem.readAsStringAsync(
            imageUrl,
            {
              encoding:
                FileSystem.EncodingType.Base64,
            }
          );

        const extension =
          imageUrl
            .split("?")[0]
            .split(".")
            .pop()
            ?.toLowerCase();

        const mimeType =
          extension === "jpg" ||
          extension === "jpeg"
            ? "image/jpeg"
            : extension === "webp"
            ? "image/webp"
            : "image/png";

        console.log(
          `🖼️ Scène ${index + 1} convertie en base64`
        );

        return `data:${mimeType};base64,${base64}`;
      }

      throw new Error(
        `Format d'image non pris en charge pour la scène ${index + 1}.`
      );
    }
  )
);

    if (
      images.some(
        (image: string | null | undefined) => !image
      )
    ) {
      throw new Error(
        "Une ou plusieurs illustrations sont manquantes."
      );
    }

    const response = await fetch(VIDEO_URL, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },

      body: JSON.stringify({
        images,

        scenes: scenes.map((scene: any) => ({
          text: scene?.text || "",
          emotion: scene?.ambience || "warm",
        })),

        narrator:
          story?.narrator || "narratrice",

        mode:
          bedtimeMode ? "bedtime" : "story",

        videoModel: "gen4_turbo",
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.error ||
          "Impossible de créer le dessin animé."
      );
    }

    console.log(
      "🎬 Dessin animé généré :",
      data
    );

    if (data?.finalVideoUrl) {
  setFinalVideoUrl(data.finalVideoUrl);
}

if (data?.finalVideoUrl) {
  const updatedStory = {
    ...story,
    finalVideoUrl: data.finalVideoUrl,
  };

  setCurrentStory(updatedStory);
}

    setVideoModalVisible(false);

    Alert.alert(
  "Dessin animé créé 🎉",
  `${
    data?.sceneCount || scenes.length
  } scènes ont été animées avec succès.`,
  [
    {
      text: "Plus tard",
      style: "cancel",
    },
    {
      text: "🎬 Regarder la vidéo",
      onPress: () => {
        if (data?.finalVideoUrl) {
          router.push({
            pathname: "/video-player",
            params: {
              url: data.finalVideoUrl,
            },
          });
        }
      },
    },
  ]
);

  } catch (error) {
    console.error(
      "Erreur création dessin animé :",
      error
    );

    Alert.alert(
      "Création impossible",
      error instanceof Error
        ? error.message
        : "Une erreur est survenue pendant la création du dessin animé."
    );
  } finally {
    setVideoGenerating(false);
  }
}

  async function stopVoice() {
    iaRunRef.current += 1;

    setIaReading(false);
    setFullscreen(false);
    setBedtimeMode(false);

    Speech.stop();
    await stopTTS();
    await stopAmbience();
  }

  async function next() {
    await stopVoice();
    if (index < scenes.length - 1) setIndex(index + 1);
  }

  async function prev() {
    await stopVoice();
    if (index > 0) setIndex(index - 1);
  }

  async function goHome() {
    await stopVoice();
    router.push("/");
  }

  if (!current) return null;

  if (fullscreen) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
        <View style={styles.fullscreenContainer}>
          {current.imageUrl ? (
            <Animated.Image
              source={{ uri: current.imageUrl }}
              style={styles.fullscreenImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.textOnlyFullscreen}>
              <Text style={styles.textOnlyIcon}>📖</Text>
              <Text style={styles.textOnlyTitle}>Histoire texte</Text>
              <Text style={styles.textOnlySubtitle}>
                Cette histoire est disponible sans image.
              </Text>
            </View>
          )}

          <TouchableOpacity style={styles.closeFullscreenButton} onPress={stopVoice}>
            <Text style={styles.closeFullscreenText}>✕</Text>
          </TouchableOpacity>

          <View style={styles.fullscreenSceneBadge}>
            <Text style={styles.fullscreenSceneText}>
              {bedtimeMode ? "🌙 Dodo " : ""}
              {index + 1} / {scenes.length}
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#111827" }}>
      <LinearGradient colors={gradientColors} style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Ton histoire</Text>

          <TouchableOpacity style={styles.favoriteButton} onPress={toggleFavorite}>
            <Text style={styles.favoriteIcon}>{favorite ? "❤️" : "🤍"}</Text>
          </TouchableOpacity>
        </View>

        <Animated.View
          style={[
            styles.imageFrame,
            {
              opacity: fadeAnim,
              transform: [{ translateY: moveAnim }],
            },
          ]}
        >
          {current.imageUrl ? (
            <Animated.Image
              source={{ uri: current.imageUrl }}
              style={[styles.image, { transform: [{ scale: zoomAnim }] }]}
            />
          ) : (
            <View style={styles.textOnlyImageFrame}>
              <Text style={styles.textOnlyIconSmall}>📖</Text>
              <Text style={styles.textOnlyFrameTitle}>Histoire texte</Text>
              <Text style={styles.textOnlyFrameSubtitle}>Lecture sans image</Text>
            </View>
          )}

          {(nightMode || bedtimeMode) && <View style={styles.imageNightOverlay} />}
        </Animated.View>

        <Animated.View
          style={[
            styles.card,
            (nightMode || bedtimeMode) && styles.cardNight,
            {
              opacity: fadeAnim,
              transform: [{ translateY: moveAnim }],
            },
          ]}
        >
          <ScrollView>
            <Text style={styles.scene}>
              Scène {index + 1} / {scenes.length}
            </Text>

            <Text
              style={[
                styles.styleTag,
                (nightMode || bedtimeMode) && styles.styleTagNight,
              ]}
            >
              {styleLabel()} · {ambienceLabel()}
            </Text>

            <Text style={[styles.text, (nightMode || bedtimeMode) && styles.textNight]}>
              {current.text}
            </Text>
          </ScrollView>
        </Animated.View>

        <View style={styles.voiceRow}>
          <TouchableOpacity style={styles.voiceButton} onPress={() => startIAStory(false)}>
            <Text style={styles.voiceText}>
              {iaReading ? "🔊 Lecture IA..." : "🔊 Lire IA"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.voiceButton} onPress={() => startIAStory(false)}>
            <Text style={styles.voiceText}>
              {iaReading ? "🎬 En cours..." : "🎬 Lecture auto"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.voiceButton} onPress={startFullscreenMode}>
            <Text style={styles.voiceText}>🖼️ Plein écran</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.voiceRow}>
          <TouchableOpacity
            style={[styles.voiceButton, nightMode && styles.nightButton]}
            onPress={() => setNightMode(!nightMode)}
          >
            <Text style={[styles.voiceText, nightMode && styles.nightButtonText]}>
              {nightMode ? "🌙 Nuit ON" : "🌙 Mode nuit"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.voiceButton} onPress={replayStory}>
            <Text style={styles.voiceText}>🔁 Rejouer</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.voiceRow}>
          <TouchableOpacity
            style={[styles.voiceButton, bedtimeMode && styles.nightButton]}
            onPress={startBedtimeMode}
          >
            <Text style={[styles.voiceText, bedtimeMode && styles.nightButtonText]}>
              🌙 Mode dodo
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.voiceButton, !ambienceEnabled && styles.ambienceOff]}
            onPress={toggleAmbience}
          >
            <Text style={styles.voiceText}>
              {ambienceEnabled ? "🔈 Ambiance ON" : "🔇 Ambiance OFF"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.row}>
          <TouchableOpacity style={styles.btn} onPress={prev}>
            <Text style={styles.btnText}>Retour</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.btn} onPress={next}>
            <Text style={styles.btnText}>Suite</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.stopButton} onPress={stopVoice}>
            <Text style={styles.stopText}>Stop</Text>
          </TouchableOpacity>
        </View>

        {index === scenes.length - 1 && (
  <TouchableOpacity
    style={styles.videoButton}
    onPress={openVideoModal}
    disabled={videoGenerating}
  >
    <Text style={styles.videoButtonText}>
      {videoGenerating
        ? "🎬 Création en cours..."
        : "🎬 Créer mon dessin animé"}
    </Text>
  </TouchableOpacity>
)}

        <View style={styles.bottomActionRow}>
          <TouchableOpacity style={styles.homeButton} onPress={goHome}>
            <Text style={styles.homeText}>Accueil</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.reportButton} onPress={openReportModal}>
            <Text style={styles.reportButtonText}>🚩 Signaler</Text>
          </TouchableOpacity>
        </View>

        <Modal
  visible={videoModalVisible}
  transparent
  animationType="fade"
  onRequestClose={closeVideoModal}
>
  <View style={styles.videoOverlay}>
    <View style={styles.videoModal}>
      <Text style={styles.videoModalTitle}>
        🎬 Créer mon dessin animé
      </Text>

      <Text style={styles.videoModalText}>
        Ton histoire contient {scenes.length} scènes.
      </Text>

      <Text style={styles.videoModalText}>
        Durée estimée : environ {scenes.length * 5} secondes.
      </Text>

      <Text style={styles.videoCreditText}>
        1 crédit vidéo
      </Text>

      <TouchableOpacity
  style={styles.videoConfirmButton}
  disabled={videoGenerating}
  onPress={createAnimatedVideo}
>
        <Text style={styles.videoConfirmButtonText}>
          {videoGenerating
            ? "Création en cours..."
            : "Créer le dessin animé"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.videoCancelButton}
        onPress={closeVideoModal}
        disabled={videoGenerating}
      >
        <Text style={styles.videoCancelButtonText}>
          Annuler
        </Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>

        <Modal
          visible={reportModalVisible}
          transparent
          animationType="fade"
          onRequestClose={closeReportModal}
        >
          <View style={styles.reportOverlay}>
            <View style={styles.reportModal}>
              <Text style={styles.reportTitle}>Signaler ce contenu</Text>
              <Text style={styles.reportSubtitle}>
                Choisis le motif qui correspond le mieux au problème rencontré.
              </Text>

              {REPORT_REASONS.map((reason) => (
                <TouchableOpacity
                  key={reason}
                  style={styles.reportReasonButton}
                  onPress={() => submitReport(reason)}
                  disabled={reportSending}
                  activeOpacity={0.85}
                >
                  <Text style={styles.reportReasonText}>{reason}</Text>
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={styles.reportCancelButton}
                onPress={closeReportModal}
                disabled={reportSending}
              >
                <Text style={styles.reportCancelText}>
                  {reportSending ? "Envoi..." : "Annuler"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  title: {
    color: "white",
    fontSize: 30,
    fontWeight: "900",
  },
  favoriteButton: {
    backgroundColor: "white",
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  favoriteIcon: {
    fontSize: 25,
  },
  imageFrame: {
    width: "100%",
    height: 215,
    borderRadius: 20,
    marginBottom: 14,
    overflow: "hidden",
    backgroundColor: "#111",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imageNightOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.28)",
  },
  card: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
  },
  cardNight: {
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  scene: {
    fontWeight: "900",
    marginBottom: 10,
    color: "#6930C3",
  },
  styleTag: {
    marginBottom: 12,
    fontWeight: "800",
    color: "#666",
  },
  styleTagNight: {
    color: "#DDD",
  },
  text: {
    fontSize: 18,
    lineHeight: 28,
    color: "#111",
  },
  textNight: {
    color: "white",
  },
  voiceRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  voiceButton: {
    flex: 1,
    backgroundColor: "white",
    padding: 10,
    borderRadius: 14,
    alignItems: "center",
  },
  voiceText: {
    color: "#111",
    fontWeight: "900",
    fontSize: 12,
    textAlign: "center",
  },
  nightButton: {
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  nightButtonText: {
    color: "white",
  },
  ambienceOff: {
    opacity: 0.65,
  },
  row: {
    flexDirection: "row",
    marginTop: 10,
    gap: 10,
  },
  btn: {
    flex: 1,
    backgroundColor: "#FFB703",
    padding: 13,
    borderRadius: 15,
    alignItems: "center",
  },
  btnText: {
    fontWeight: "900",
    color: "#111",
  },
  stopButton: {
    backgroundColor: "#FF4D6D",
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: 15,
    alignItems: "center",
  },
  stopText: {
    color: "white",
    fontWeight: "900",
  },
  bottomActionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
    marginBottom: 6,
  },
  homeButton: {
    flex: 1,
    backgroundColor: "white",
    padding: 11,
    borderRadius: 14,
    alignItems: "center",
  },
  homeText: {
    color: "#111",
    fontWeight: "900",
  },
  reportButton: {
    flex: 1,
    backgroundColor: "#7F1D1D",
    padding: 11,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  reportButtonText: {
    color: "white",
    fontWeight: "900",
  },
  reportOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "center",
    padding: 24,
  },
  reportModal: {
    backgroundColor: "white",
    borderRadius: 24,
    padding: 20,
  },
  reportTitle: {
    color: "#111827",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 8,
  },
  reportSubtitle: {
    color: "#4B5563",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  reportReasonButton: {
    backgroundColor: "#F3F4F6",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  reportReasonText: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "800",
  },
  reportCancelButton: {
    marginTop: 4,
    paddingVertical: 13,
    alignItems: "center",
  },
  reportCancelText: {
    color: "#6B7280",
    fontSize: 15,
    fontWeight: "800",
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  fullscreenImage: {
    width: "100%",
    height: "100%",
  },
  closeFullscreenButton: {
    position: "absolute",
    top: 20,
    right: 20,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeFullscreenText: {
    color: "white",
    fontSize: 24,
    fontWeight: "900",
  },
  fullscreenSceneBadge: {
    position: "absolute",
    bottom: 24,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  fullscreenSceneText: {
    color: "white",
    fontWeight: "900",
  },
  textOnlyFullscreen: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
    backgroundColor: "#020617",
  },
  textOnlyIcon: {
    fontSize: 70,
    marginBottom: 18,
  },
  textOnlyTitle: {
    color: "white",
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 10,
  },
  textOnlySubtitle: {
    color: "#CBD5E1",
    fontSize: 16,
    textAlign: "center",
  },
  textOnlyImageFrame: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#020617",
    padding: 20,
  },
  textOnlyIconSmall: {
    fontSize: 46,
    marginBottom: 10,
  },
  textOnlyFrameTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 6,
  },
  textOnlyFrameSubtitle: {
    color: "#CBD5E1",
    fontSize: 14,
    fontWeight: "700",
  },

  videoButton: {
  marginTop: 12,
  backgroundColor: "#7C3AED",
  paddingVertical: 14,
  borderRadius: 16,
  alignItems: "center",
  justifyContent: "center",
},

videoButtonText: {
  color: "white",
  fontSize: 16,
  fontWeight: "900",
  textAlign: "center",
},

videoOverlay: {
  flex: 1,
  backgroundColor: "rgba(0,0,0,0.72)",
  justifyContent: "center",
  padding: 24,
},

videoModal: {
  backgroundColor: "white",
  borderRadius: 24,
  padding: 22,
},

videoModalTitle: {
  fontSize: 22,
  fontWeight: "900",
  color: "#111827",
  marginBottom: 14,
  textAlign: "center",
},

videoModalText: {
  fontSize: 15,
  color: "#4B5563",
  marginBottom: 8,
  textAlign: "center",
},

videoCreditText: {
  fontSize: 20,
  fontWeight: "900",
  color: "#7C3AED",
  marginTop: 10,
  marginBottom: 18,
  textAlign: "center",
},

videoConfirmButton: {
  backgroundColor: "#7C3AED",
  paddingVertical: 14,
  borderRadius: 16,
  alignItems: "center",
},

videoConfirmButtonText: {
  color: "white",
  fontWeight: "900",
  fontSize: 16,
},

videoCancelButton: {
  marginTop: 10,
  paddingVertical: 12,
  alignItems: "center",
},

videoCancelButtonText: {
  color: "#6B7280",
  fontWeight: "800",
},
});