import {
    router,
    useLocalSearchParams,
} from "expo-router";

import {
    useEffect,
    useState,
} from "react";

import {
    ActivityIndicator,
    Alert,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
} from "react-native";

import {
    saveSharedVideo,
} from "../../services/sharedVideoService";

const BACKEND_URL =
  "https://conte-magique-ai.onrender.com";

export default function SharedVideoScreen() {
  const params =
    useLocalSearchParams<{
      id?: string;
    }>();

  const [message, setMessage] =
    useState(
      "Ouverture de la vidéo..."
    );

  const [sharedVideo, setSharedVideo] =
    useState<any | null>(null);

  const [shareToken, setShareToken] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  useEffect(() => {
    void openSharedVideo();
  }, [params.id]);

  async function openSharedVideo() {
    try {
      const receivedShareToken =
        String(
          params.id || ""
        ).trim();

      if (!receivedShareToken) {
        setMessage(
          "Ce lien de partage est invalide."
        );

        return;
      }

      const response =
        await fetch(
          `${BACKEND_URL}/share/${encodeURIComponent(
            receivedShareToken
          )}`
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Impossible d’ouvrir cette vidéo."
        );
      }

      if (
        data?.type !== "video" ||
        !data?.content
      ) {
        throw new Error(
          "Ce lien ne correspond pas à une vidéo."
        );
      }

      const videoUrl =
        data.content
          .finalVideoUrl;

      if (!videoUrl) {
        throw new Error(
          "Cette vidéo n’est plus disponible."
        );
      }

      setShareToken(
        receivedShareToken
      );

      setSharedVideo({
        finalVideoUrl:
          videoUrl,

        sceneCount:
          data.content.sceneCount ||
          0,

        videoType:
          data.content.videoType ||
          null,
      });

      setMessage(
        "Cette vidéo est prête à être regardée."
      );
    } catch (error) {
      console.error(
        "Erreur ouverture vidéo partagée :",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Impossible d’ouvrir cette vidéo."
      );
    }
  }

  function openVideo() {
    if (
      !sharedVideo?.finalVideoUrl
    ) {
      return;
    }

    router.replace({
      pathname:
        "/video-player",

      params: {
        url:
          sharedVideo.finalVideoUrl,
      },
    });
  }

  async function saveReceivedVideo() {
    if (
      !sharedVideo ||
      !shareToken ||
      saving
    ) {
      return;
    }

    try {
      setSaving(true);

      const saved =
        await saveSharedVideo(
          shareToken,
          sharedVideo
        );

      if (!saved) {
        throw new Error(
          "Impossible d'enregistrer cette vidéo."
        );
      }

      Alert.alert(
        "Vidéo ajoutée 🎬",
        "Cette vidéo a été ajoutée à Mes vidéos.",
        [
          {
            text: "Continuer",
            style: "cancel",
          },
          {
            text: "Regarder",
            onPress:
              openVideo,
          },
        ]
      );
    } catch (error) {
      console.error(
        "Erreur sauvegarde vidéo reçue :",
        error
      );

      Alert.alert(
        "Enregistrement impossible",
        error instanceof Error
          ? error.message
          : "Impossible d'enregistrer cette vidéo."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView
      style={
        styles.container
      }
    >
      {!sharedVideo ? (
        <ActivityIndicator
          size="large"
        />
      ) : null}

      <Text
        style={
          styles.text
        }
      >
        {message}
      </Text>

      {sharedVideo ? (
        <>
          <TouchableOpacity
            style={
              styles.openButton
            }
            onPress={
              openVideo
            }
          >
            <Text
              style={
                styles.openButtonText
              }
            >
              ▶️ Regarder la vidéo
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={
              styles.saveButton
            }
            onPress={
              saveReceivedVideo
            }
            disabled={
              saving
            }
          >
            {saving ? (
              <ActivityIndicator />
            ) : (
              <Text
                style={
                  styles.saveButtonText
                }
              >
                ➕ Ajouter à Mes vidéos
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={
              styles.homeButton
            }
            onPress={() =>
              router.replace("/")
            }
          >
            <Text
              style={
                styles.homeButtonText
              }
            >
              Retour accueil
            </Text>
          </TouchableOpacity>
        </>
      ) : null}
    </SafeAreaView>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        "#111827",
      padding: 24,
    },

    text: {
      marginTop: 16,
      color:
        "#ffffff",
      fontSize: 16,
      lineHeight: 23,
      textAlign:
        "center",
      marginBottom: 10,
    },

    openButton: {
      marginTop: 20,
      width: "100%",
      maxWidth: 380,
      backgroundColor:
        "#FFB703",
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 16,
      alignItems:
        "center",
    },

    openButtonText: {
      color:
        "#111827",
      fontWeight:
        "900",
      fontSize: 16,
      textAlign:
        "center",
    },

    saveButton: {
      marginTop: 12,
      width: "100%",
      maxWidth: 380,
      minHeight: 54,
      backgroundColor:
        "rgba(255,255,255,0.12)",
      borderWidth: 1,
      borderColor:
        "rgba(255,255,255,0.25)",
      paddingVertical: 15,
      paddingHorizontal: 24,
      borderRadius: 16,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    saveButtonText: {
      color:
        "#ffffff",
      fontWeight:
        "900",
      fontSize: 15,
      textAlign:
        "center",
    },

    homeButton: {
      marginTop: 20,
      paddingVertical: 12,
      paddingHorizontal: 20,
    },

    homeButtonText: {
      color:
        "#CBD5E1",
      fontSize: 14,
      fontWeight:
        "800",
    },
  });