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
    SafeAreaView,
    StyleSheet,
    Text,
} from "react-native";

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

  useEffect(() => {
    void openSharedVideo();
  }, [params.id]);

  async function openSharedVideo() {
    try {
      const shareToken =
        String(
          params.id || ""
        ).trim();

      if (!shareToken) {
        setMessage(
          "Ce lien de partage est invalide."
        );

        return;
      }

      const response =
        await fetch(
          `${BACKEND_URL}/share/${encodeURIComponent(
            shareToken
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

      router.replace({
        pathname:
          "/video-player",

        params: {
          url:
            videoUrl,
        },
      });
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

  return (
    <SafeAreaView
      style={
        styles.container
      }
    >
      <ActivityIndicator
        size="large"
      />

      <Text
        style={
          styles.text
        }
      >
        {message}
      </Text>
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
      textAlign:
        "center",
    },
  });