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

import { setCurrentStory } from "../../services/currentStory";

const BACKEND_URL =
  "https://conte-magique-ai.onrender.com";

export default function SharedStoryScreen() {
  const params =
    useLocalSearchParams<{
      id?: string;
    }>();

  const [message, setMessage] =
    useState(
      "Ouverture de l’histoire..."
    );

  useEffect(() => {
    void openSharedStory();
  }, [params.id]);

  async function openSharedStory() {
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
            "Impossible d’ouvrir cette histoire."
        );
      }

      if (
        data?.type !== "story" ||
        !data?.content
      ) {
        throw new Error(
          "Ce lien ne correspond pas à une histoire."
        );
      }

      const sharedStory =
        data.content;

      if (
        !Array.isArray(
          sharedStory.scenes
        ) ||
        sharedStory.scenes.length === 0
      ) {
        throw new Error(
          "Cette histoire ne contient aucune scène."
        );
      }

      setCurrentStory({
        ...sharedStory,
        id:
          sharedStory.id ||
          data.contentId,
      });

      router.replace(
        "/player"
      );
    } catch (error) {
      console.error(
        "Erreur ouverture histoire partagée :",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Impossible d’ouvrir cette histoire."
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