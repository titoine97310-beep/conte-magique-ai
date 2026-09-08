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
    setCurrentStory,
} from "../../services/currentStory";

import {
    saveStory,
} from "../../services/storageService";

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

  const [sharedStory, setSharedStory] =
    useState<any | null>(null);

  const [saving, setSaving] =
    useState(false);

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

      const receivedStory =
        data.content;

      if (
        !Array.isArray(
          receivedStory.scenes
        ) ||
        receivedStory.scenes.length === 0
      ) {
        throw new Error(
          "Cette histoire ne contient aucune scène."
        );
      }

      const storyToOpen = {
        ...receivedStory,

        id:
          receivedStory.id ||
          data.contentId,
      };

      setSharedStory(
        storyToOpen
      );

      setCurrentStory(
        storyToOpen
      );

      setMessage(
        "Cette histoire est prête à être lue."
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

  async function saveReceivedStory() {
    if (
      !sharedStory ||
      saving
    ) {
      return;
    }

    try {
      setSaving(true);

      const saved =
        await saveStory(
          sharedStory
        );

      if (!saved) {
        throw new Error(
          "Impossible d'enregistrer cette histoire."
        );
      }

      Alert.alert(
        "Histoire ajoutée ✨",
        "Cette histoire a été ajoutée à Mes histoires.",
        [
          {
            text: "Continuer",
            style: "cancel",
          },
          {
            text: "Lire",
            onPress: () => {
              setCurrentStory(
                saved
              );

              router.replace(
                "/player"
              );
            },
          },
        ]
      );
    } catch (error) {
      console.error(
        "Erreur sauvegarde histoire reçue :",
        error
      );

      Alert.alert(
        "Enregistrement impossible",
        error instanceof Error
          ? error.message
          : "Impossible d'enregistrer cette histoire."
      );
    } finally {
      setSaving(false);
    }
  }

  function openStory() {
    if (!sharedStory) {
      return;
    }

    setCurrentStory(
      sharedStory
    );

    router.replace(
      "/player"
    );
  }

  return (
    <SafeAreaView
      style={
        styles.container
      }
    >
      {!sharedStory ? (
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

      {sharedStory ? (
        <>
          <TouchableOpacity
            style={
              styles.openButton
            }
            onPress={
              openStory
            }
          >
            <Text
              style={
                styles.openButtonText
              }
            >
              📖 Lire l’histoire
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={
              styles.saveButton
            }
            onPress={
              saveReceivedStory
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
                ➕ Ajouter à Mes histoires
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