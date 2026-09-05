import {
    AVPlaybackStatus,
    ResizeMode,
    Video,
} from "expo-av";

import {
    router,
    useLocalSearchParams,
} from "expo-router";

import {
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import {
    ActivityIndicator,
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function VideoPlayerScreen() {
  const params = useLocalSearchParams<{
    url?: string | string[];
  }>();

  const videoRef =
    useRef<Video | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [playing, setPlaying] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const rawUrl = params.url;

const videoUrl = useMemo(() => {
  const value =
    Array.isArray(rawUrl)
      ? rawUrl[0]
      : rawUrl;

  if (!value) {
    return "";
  }

  const url = String(value).trim();

  try {
    const marker = "/o/";
    const markerIndex =
      url.indexOf(marker);

    if (markerIndex === -1) {
      return url;
    }

    const queryIndex =
      url.indexOf(
        "?",
        markerIndex
      );

    const prefix =
      url.slice(
        0,
        markerIndex +
          marker.length
      );

    const objectPath =
      queryIndex >= 0
        ? url.slice(
            markerIndex +
              marker.length,
            queryIndex
          )
        : url.slice(
            markerIndex +
              marker.length
          );

    const suffix =
      queryIndex >= 0
        ? url.slice(queryIndex)
        : "";

    const decodedPath =
      decodeURIComponent(
        objectPath
      );

    const encodedPath =
      encodeURIComponent(
        decodedPath
      );

    return (
      prefix +
      encodedPath +
      suffix
    );
  } catch (error) {
    console.error(
      "Erreur normalisation URL vidéo :",
      error
    );

    return url;
  }
}, [rawUrl]);

  useEffect(() => {
    console.log(
      "🎬 URL vidéo reçue :",
      videoUrl
    );

    console.log(
      "🎬 Longueur URL :",
      videoUrl.length
    );

    console.log(
      "🎬 Firebase URL :",
      videoUrl.includes(
        "firebasestorage.googleapis.com"
      )
    );
  }, [videoUrl]);

  if (!videoUrl) {
    return (
      <SafeAreaView
        style={styles.container}
      >
        <View
          style={styles.emptyContainer}
        >
          <Text style={styles.emptyIcon}>
            🎬
          </Text>

          <Text style={styles.emptyTitle}>
            Vidéo introuvable
          </Text>

          <Text style={styles.emptyText}>
            Aucune adresse vidéo n'a été
            transmise à cette page.
          </Text>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() =>
              router.back()
            }
          >
            <Text
              style={
                styles.backButtonText
              }
            >
              ← Retour
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  async function togglePlayback() {
    try {
      if (!videoRef.current) {
        return;
      }

      const status =
        await videoRef.current.getStatusAsync();

      if (!status.isLoaded) {
        return;
      }

      if (status.isPlaying) {
        await videoRef.current.pauseAsync();

        setPlaying(false);
      } else {
        await videoRef.current.playAsync();

        setPlaying(true);
      }
    } catch (error) {
      console.error(
        "❌ Erreur pause/lecture :",
        error
      );

      Alert.alert(
        "Erreur",
        error instanceof Error
          ? error.message
          : String(error)
      );
    }
  }

  async function replayVideo() {
    try {
      if (!videoRef.current) {
        return;
      }

      await videoRef.current.setPositionAsync(
        0
      );

      await videoRef.current.playAsync();

      setPlaying(true);
    } catch (error) {
      console.error(
        "❌ Erreur replay vidéo :",
        error
      );

      Alert.alert(
        "Erreur",
        error instanceof Error
          ? error.message
          : String(error)
      );
    }
  }

  function handlePlaybackStatus(
    status: AVPlaybackStatus
  ) {
    if (!status.isLoaded) {
      if (status.error) {
        console.error(
          "❌ AVPlaybackStatus :",
          status.error
        );

        setLoading(false);

        setErrorMessage(
          status.error
        );
      }

      return;
    }

    setPlaying(
      Boolean(status.isPlaying)
    );

    if (status.didJustFinish) {
      setPlaying(false);
    }
  }

  return (
    <SafeAreaView
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() =>
            router.back()
          }
        >
          <Text
            style={
              styles.headerButtonText
            }
          >
            ←
          </Text>
        </TouchableOpacity>

        <Text style={styles.title}>
          🎬 Mon dessin animé
        </Text>

        <View
          style={styles.headerSpacer}
        />
      </View>

      <View
        style={styles.videoContainer}
      >
        {loading && (
          <View style={styles.loader}>
            <ActivityIndicator
              size="large"
            />

            <Text
              style={
                styles.loaderText
              }
            >
              Chargement du dessin
              animé...
            </Text>
          </View>
        )}

        <Video
          ref={videoRef}
          source={{
            uri: videoUrl,
          }}
          style={styles.video}
          resizeMode={
            ResizeMode.CONTAIN
          }
          shouldPlay
          useNativeControls
          progressUpdateIntervalMillis={
            500
          }
          onLoadStart={() => {
            console.log(
              "⏳ Début chargement vidéo..."
            );

            setLoading(true);
            setErrorMessage("");
          }}
          onLoad={(status) => {
            console.log(
              "✅ Vidéo chargée :",
              status
            );

            setLoading(false);
            setPlaying(true);
            setErrorMessage("");
          }}
          onReadyForDisplay={(
            event
          ) => {
            console.log(
              "✅ Vidéo prête à afficher :",
              event
            );
          }}
          onPlaybackStatusUpdate={
            handlePlaybackStatus
          }
          onError={(error) => {
            const message =
              typeof error === "string"
                ? error
                : JSON.stringify(
                    error
                  );

            console.error(
              "❌ ERREUR VIDÉO EXPO-AV :",
              message
            );

            console.error(
              "❌ URL utilisée :",
              videoUrl
            );

            setLoading(false);

            setErrorMessage(
              message
            );

            Alert.alert(
              "Lecture impossible",
              `Erreur vidéo :\n\n${message}`
            );
          }}
        />
      </View>

      {errorMessage ? (
        <ScrollView
          style={styles.errorBox}
          contentContainerStyle={
            styles.errorContent
          }
        >
          <Text
            style={
              styles.errorTitle
            }
          >
            ⚠️ Détail technique
          </Text>

          <Text
            selectable
            style={
              styles.errorText
            }
          >
            {errorMessage}
          </Text>
        </ScrollView>
      ) : null}

      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={
            togglePlayback
          }
        >
          <Text
            style={
              styles.controlButtonText
            }
          >
            {playing
              ? "⏸️ Pause"
              : "▶️ Lire"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlButton}
          onPress={replayVideo}
        >
          <Text
            style={
              styles.controlButtonText
            }
          >
            🔄 Rejouer
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footerText}>
        ✨ ConteMagiqueIA
      </Text>
    </SafeAreaView>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#111827",
    },

    header: {
      height: 64,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      paddingHorizontal: 16,
    },

    headerButton: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 22,
      backgroundColor:
        "rgba(255,255,255,0.10)",
    },

    headerButtonText: {
      color: "#ffffff",
      fontSize: 26,
      fontWeight: "700",
    },

    headerSpacer: {
      width: 44,
    },

    title: {
      color: "#ffffff",
      fontSize: 19,
      fontWeight: "800",
    },

    videoContainer: {
      flex: 1,
      marginHorizontal: 12,
      marginVertical: 12,
      backgroundColor: "#000000",
      borderRadius: 20,
      overflow: "hidden",
      justifyContent: "center",
    },

    video: {
      width: "100%",
      height: "100%",
    },

    loader: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#000000",
    },

    loaderText: {
      marginTop: 12,
      color: "#ffffff",
      fontSize: 15,
    },

    controls: {
      flexDirection: "row",
      gap: 12,
      paddingHorizontal: 16,
      paddingBottom: 16,
    },

    controlButton: {
      flex: 1,
      minHeight: 50,
      backgroundColor: "#312e81",
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 12,
    },

    controlButtonText: {
      color: "#ffffff",
      fontSize: 16,
      fontWeight: "700",
    },

    footerText: {
      textAlign: "center",
      color:
        "rgba(255,255,255,0.55)",
      paddingBottom: 12,
    },

    errorBox: {
      maxHeight: 150,
      marginHorizontal: 16,
      marginBottom: 14,
      backgroundColor:
        "rgba(127,29,29,0.45)",
      borderRadius: 14,
    },

    errorContent: {
      padding: 12,
    },

    errorTitle: {
      color: "#fecaca",
      fontSize: 15,
      fontWeight: "800",
      marginBottom: 8,
    },

    errorText: {
      color: "#ffffff",
      fontSize: 12,
    },

    emptyContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 30,
    },

    emptyIcon: {
      fontSize: 64,
      marginBottom: 20,
    },

    emptyTitle: {
      color: "#ffffff",
      fontSize: 24,
      fontWeight: "800",
      marginBottom: 10,
    },

    emptyText: {
      color: "#cbd5e1",
      fontSize: 16,
      textAlign: "center",
      marginBottom: 25,
    },

    backButton: {
      backgroundColor: "#312e81",
      paddingHorizontal: 24,
      paddingVertical: 14,
      borderRadius: 16,
    },

    backButtonText: {
      color: "#ffffff",
      fontSize: 16,
      fontWeight: "700",
    },
  });