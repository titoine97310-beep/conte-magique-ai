import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import * as VideoThumbnails from "expo-video-thumbnails";

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";

import {
  deleteObject,
  getStorage,
  ref,
} from "firebase/storage";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  SafeAreaView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  auth,
  db,
} from "../services/firebase";

import {
  deleteSharedVideo,
  getSharedVideos,
} from "../services/sharedVideoService";

import {
  getTranslations,
  loadLanguage,
  type AppLanguage,
} from "../services/languageService";

const BACKEND_URL =
  "https://conte-magique-ai.onrender.com";

type SavedVideo = {
  id: string;
  finalVideoUrl: string;
  sceneCount?: number;
  createdAt?: any;
  status?: string;
  shared?: boolean;
  shareToken?: string;
  videoType?: string | null;
};

export default function SavedVideosScreen() {
  const [videos, setVideos] =
    useState<SavedVideo[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [
    thumbnails,
    setThumbnails,
  ] = useState<
    Record<string, string>
  >({});

  const [
    deletingId,
    setDeletingId,
  ] = useState<
    string | null
  >(null);

  const [language, setLanguage] =
    useState<AppLanguage>("fr");

  const t = getTranslations(language);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function refreshLanguage() {
        const savedLanguage =
          await loadLanguage();

        if (isActive) {
          setLanguage(savedLanguage);
        }
      }

      void refreshLanguage();

      return () => {
        isActive = false;
      };
    }, [])
  );

  useEffect(() => {
    void loadVideos();
  }, []);

  function getVideoKey(
    video: SavedVideo
  ) {
    return video.shared
      ? `shared-${video.id}`
      : `owned-${video.id}`;
  }

  async function loadVideos() {
    try {
      setLoading(true);

      const user =
        auth.currentUser;

      if (!user) {
        setVideos([]);
        return;
      }

      const videosQuery =
        query(
          collection(
            db,
            "videoGenerations"
          ),

          where(
            "uid",
            "==",
            user.uid
          ),

          orderBy(
            "createdAt",
            "desc"
          )
        );

      const [
        snapshot,
        receivedVideos,
      ] = await Promise.all([
        getDocs(
          videosQuery
        ),

        getSharedVideos(),
      ]);

      const ownedVideos:
        SavedVideo[] =
        snapshot.docs
          .map(
            (
              docSnapshot
            ) => {
              const data =
                docSnapshot.data();

              return {
                id:
                  docSnapshot.id,

                finalVideoUrl:
                  data.finalVideoUrl ||
                  "",

                sceneCount:
                  data.sceneCount,

                createdAt:
                  data.createdAt,

                status:
                  data.status,

                shared:
                  false,
              };
            }
          )
          .filter(
            (video) =>
              Boolean(
                video.finalVideoUrl
              ) &&
              video.status ===
                "completed"
          );

      const sharedVideos:
        SavedVideo[] =
        receivedVideos
          .map(
            (video) => ({
              id:
                video.id,

              shareToken:
                video.shareToken,

              finalVideoUrl:
                video.finalVideoUrl,

              sceneCount:
                video.sceneCount,

              createdAt:
                video.createdAt,

              videoType:
                video.videoType,

              shared:
                true,

              status:
                "completed",
            })
          )
          .filter(
            (video) =>
              Boolean(
                video.finalVideoUrl
              )
          );

      const mergedVideos = [
        ...ownedVideos,
        ...sharedVideos,
      ];

      mergedVideos.sort(
        (a, b) =>
          getDateValue(
            b.createdAt
          ) -
          getDateValue(
            a.createdAt
          )
      );

      setVideos(
        mergedVideos
      );

      void generateThumbnails(
        mergedVideos
      );
    } catch (error) {
      console.error(
        "Erreur chargement vidéos :",
        error
      );

      Alert.alert(
        t.savedVideos.loadingErrorTitle,
        t.savedVideos.loadingErrorMessage
      );
    } finally {
      setLoading(false);
    }
  }

  function getDateValue(
    value: any
  ): number {
    try {
      if (!value) {
        return 0;
      }

      if (
        typeof value?.toDate ===
        "function"
      ) {
        return value
          .toDate()
          .getTime();
      }

      if (
        typeof value?.seconds ===
        "number"
      ) {
        return (
          value.seconds *
          1000
        );
      }

      const date =
        new Date(
          value
        );

      const time =
        date.getTime();

      return Number.isNaN(
        time
      )
        ? 0
        : time;
    } catch {
      return 0;
    }
  }

  async function generateThumbnails(
    videoList: SavedVideo[]
  ) {
    await Promise.all(
      videoList.map(
        async (video) => {
          const key =
            getVideoKey(
              video
            );

          try {
            const result =
              await VideoThumbnails.getThumbnailAsync(
                video.finalVideoUrl,
                {
                  time: 1000,
                  quality: 0.7,
                }
              );

            setThumbnails(
              (previous) => ({
                ...previous,

                [key]:
                  result.uri,
              })
            );
          } catch (error) {
            console.log(
              "Miniature impossible pour",
              video.id,
              error
            );
          }
        }
      )
    );
  }

  function formatDate(
    value: any
  ) {
    try {
      if (!value) {
        return t.savedVideos.unknownDate;
      }

      const locale =
        language === "en"
          ? "en-GB"
          : language === "es"
            ? "es-ES"
            : "fr-FR";

      if (
        typeof value?.toDate ===
        "function"
      ) {
        return value
          .toDate()
          .toLocaleDateString(
            locale
          );
      }

      if (
        typeof value?.seconds ===
        "number"
      ) {
        return new Date(
          value.seconds * 1000
        ).toLocaleDateString(
          locale
        );
      }

      return new Date(
        value
      ).toLocaleDateString(
        locale
      );
    } catch {
      return t.savedVideos.unknownDate;
    }
  }

  async function shareVideo(
    video: SavedVideo
  ) {
    try {
      if (video.shared) {
        if (
          !video.shareToken
        ) {
          throw new Error(
            t.savedVideos.shareLinkMissing
          );
        }

        const shareUrl =
          `https://contemagiqueia.fr/video/${encodeURIComponent(
            video.shareToken
          )}`;

        await Share.share({
          title:
            t.savedVideos.shareTitle,

          message:
            `${t.savedVideos.shareMessage}\n\n${shareUrl}`,

          url:
            shareUrl,
        });

        return;
      }

      const user =
        auth.currentUser;

      if (!user) {
        Alert.alert(
          t.savedVideos.loginRequired,
          t.savedVideos.loginRequiredShare
        );

        return;
      }

      const token =
        await user.getIdToken(
          true
        );

      const response =
        await fetch(
          `${BACKEND_URL}/share/create`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`,
            },

            body:
              JSON.stringify({
                type:
                  "video",

                contentId:
                  video.id,
              }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Impossible de créer le lien de partage."
        );
      }

      if (
        !data?.shareUrl
      ) {
        throw new Error(
          "Lien de partage manquant."
        );
      }

      await Share.share({
        title:
          t.savedVideos.shareTitle,

        message:
          `${t.savedVideos.shareMessage}\n\n${data.shareUrl}`,

        url:
          data.shareUrl,
      });
    } catch (error) {
      console.error(
        "Erreur partage vidéo :",
        error
      );

      Alert.alert(
        t.savedVideos.shareImpossible,
        t.savedVideos.shareError
      );
    }
  }

  function askDeleteVideo(
    video: SavedVideo
  ) {
    const message =
      video.shared
        ? t.savedVideos.removeConfirmMessage
        : t.savedVideos.deleteConfirmMessage;

    Alert.alert(
      video.shared
        ? t.savedVideos.removeConfirmTitle
        : t.savedVideos.deleteConfirmTitle,

      message,

      [
        {
          text:
            t.common.cancel,

          style:
            "cancel",
        },

        {
          text:
            video.shared
              ? t.savedVideos.removeAction
              : t.savedVideos.deleteAction,

          style:
            "destructive",

          onPress: () => {
            void deleteVideo(
              video
            );
          },
        },
      ]
    );
  }

  async function deleteVideo(
    video: SavedVideo
  ) {
    if (deletingId) {
      return;
    }

    const key =
      getVideoKey(
        video
      );

    try {
      setDeletingId(
        key
      );

      /*
       * ==========================
       * VIDÉO REÇUE
       * ==========================
       */
      if (video.shared) {
        const deleted =
          await deleteSharedVideo(
            video.id
          );

        if (!deleted) {
          throw new Error(
            "Impossible de retirer cette vidéo."
          );
        }

        removeVideoFromScreen(
          key
        );

        Alert.alert(
          t.savedVideos.removedTitle,
          t.savedVideos.removedMessage
        );

        return;
      }

      /*
       * ==========================
       * VIDÉO CRÉÉE
       * ==========================
       *
       * IMPORTANT :
       *
       * La suppression Storage ne bloque
       * plus la suppression Firestore.
       */

      try {
        const storage =
          getStorage();

        const videoRef =
          ref(
            storage,
            video.finalVideoUrl
          );

        await deleteObject(
          videoRef
        );

        console.log(
          "🗑️ Fichier vidéo Storage supprimé :",
          video.id
        );
      } catch (
        storageError: any
      ) {
        /*
         * Le fichier peut être :
         * - déjà supprimé ;
         * - inaccessible par les règles ;
         * - référencé par une URL distante.
         *
         * On ne bloque PAS la suppression
         * de la vidéo dans Mes vidéos.
         */
        console.log(
          "ℹ️ Suppression Storage ignorée :",
          storageError?.code ||
            storageError
        );
      }

      /*
       * On supprime maintenant le document
       * Firestore même si Storage a échoué.
       */
      await deleteDoc(
        doc(
          db,
          "videoGenerations",
          video.id
        )
      );

      console.log(
        "🗑️ Document videoGenerations supprimé :",
        video.id
      );

      removeVideoFromScreen(
        key
      );

      Alert.alert(
        t.savedVideos.deletedTitle,
        t.savedVideos.deletedMessage
      );
    } catch (error: any) {
      console.error(
        "Erreur suppression vidéo :",
        error
      );

      console.error(
        "Code erreur :",
        error?.code
      );

      console.error(
        "Message erreur :",
        error?.message
      );

      Alert.alert(
        t.savedVideos.deleteImpossible,
        video.shared
          ? t.savedVideos.removeError
          : t.savedVideos.deleteError
      );
    } finally {
      setDeletingId(
        null
      );
    }
  }

  function removeVideoFromScreen(
    key: string
  ) {
    setVideos(
      (previous) =>
        previous.filter(
          (item) =>
            getVideoKey(
              item
            ) !== key
        )
    );

    setThumbnails(
      (previous) => {
        const next = {
          ...previous,
        };

        delete next[
          key
        ];

        return next;
      }
    );
  }

  if (loading) {
    return (
      <LinearGradient
        colors={["#07142F", "#132D68", "#24155C", "#070B24"]}
        locations={[0, 0.38, 0.72, 1]}
        style={styles.container}
      >
        <SafeAreaView style={styles.container}>
          <View style={styles.center}>
            <Image
              source={require("../assets/images/magico.png")}
              style={styles.loadingMagico}
              resizeMode="contain"
            />
            <Text style={styles.loadingStars}>✦  ✨  ✦</Text>
            <ActivityIndicator size="large" color="#FFCF4A" />
            <Text style={styles.loadingText}>{t.savedVideos.loading}</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={["#07142F", "#123B7A", "#24155C", "#070B24"]}
      locations={[0, 0.38, 0.72, 1]}
      style={styles.container}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.85}
          >
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>

          <View style={styles.headerText}>
            <Text style={styles.headerStars}>✦  ✨  ✦</Text>
            <Text style={styles.title}>
              {String(t.savedVideos.title).replace(/^🎬\s*/u, "")}
            </Text>
            <Text style={styles.subtitle}>
              {language === "fr"
                ? "Tes aventures prennent vie en dessins animés"
                : language === "en"
                  ? "Your adventures come to life as animated videos"
                  : "Tus aventuras cobran vida en dibujos animados"}
            </Text>
          </View>

          <Image
            source={require("../assets/images/magico.png")}
            style={styles.magico}
            resizeMode="contain"
          />
        </View>

        {videos.length === 0 ? (
          <View style={styles.center}>
            <Image
              source={require("../assets/images/magic-videos.png")}
              style={styles.emptyCinema}
              resizeMode="contain"
            />
            <Text style={styles.emptyStars}>✦  ✨  ✦</Text>
            <Text style={styles.emptyTitle}>{t.savedVideos.emptyTitle}</Text>
            <Text style={styles.emptyText}>{t.savedVideos.emptyMessage}</Text>
          </View>
        ) : (
          <FlatList
            data={videos}
            keyExtractor={(item) => getVideoKey(item)}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const key = getVideoKey(item);
              const thumbnail = thumbnails[key];
              const isDeleting = deletingId === key;

              return (
                <LinearGradient
                  colors={[
                    "rgba(13,87,181,0.96)",
                    "rgba(31,52,132,0.98)",
                    "rgba(35,22,91,0.99)",
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.card}
                >
                  <View style={styles.thumbnailContainer}>
                    {thumbnail ? (
                      <Image
                        source={{ uri: thumbnail }}
                        style={styles.thumbnail}
                      />
                    ) : (
                      <LinearGradient
                        colors={["#07142F", "#172B68", "#3A176D"]}
                        style={styles.thumbnailFallback}
                      >
                        <ActivityIndicator color="#FFCF4A" />
                        <Image
                          source={require("../assets/images/magic-videos.png")}
                          style={styles.fallbackCinema}
                          resizeMode="contain"
                        />
                      </LinearGradient>
                    )}

                    <View style={styles.playCircle}>
                      <Text style={styles.playIcon}>▶</Text>
                    </View>

                    <View style={styles.sceneBadge}>
                      <Text style={styles.sceneBadgeText}>
                        {item.sceneCount || "?"}{" "}
                        {(item.sceneCount || 0) === 1
                          ? t.savedVideos.scene
                          : t.savedVideos.scenes}
                      </Text>
                    </View>

                    {item.shared ? (
                      <View style={styles.sharedBadge}>
                        <Text style={styles.sharedBadgeText}>
                          ✨ {t.savedVideos.receivedBadge}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.cardContent}>
                    <View style={styles.cardHeadingRow}>
                      <View style={styles.cardHeadingText}>
                        <Text style={styles.cardTitle}>
                          {item.shared
                            ? t.savedVideos.receivedVideo
                            : t.savedVideos.animatedVideo}
                        </Text>

                        <Text style={styles.cardMeta}>
                          {item.sceneCount || "?"}{" "}
                          {(item.sceneCount || 0) === 1
                            ? t.savedVideos.scene
                            : t.savedVideos.scenes}
                          {"  •  "}
                          {formatDate(item.createdAt)}
                        </Text>
                      </View>

                      <Text style={styles.cardSparkle}>✦</Text>
                    </View>

                    <View style={styles.actionsRow}>
                      <TouchableOpacity
                        style={styles.watchButton}
                        onPress={() =>
                          router.push({
                            pathname: "/video-player",
                            params: {
                              url: item.finalVideoUrl,
                            },
                          })
                        }
                        disabled={isDeleting}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.watchButtonText}>
                          ▶ {t.savedVideos.watch}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.shareButton}
                        onPress={() => shareVideo(item)}
                        disabled={isDeleting}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.shareButtonText}>
                          ↗ {t.savedVideos.share}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => askDeleteVideo(item)}
                        disabled={isDeleting}
                        activeOpacity={0.85}
                      >
                        {isDeleting ? (
                          <ActivityIndicator color="#FFFFFF" />
                        ) : (
                          <Text style={styles.deleteButtonText}>
                            🗑️{" "}
                            {String(
                              item.shared
                                ? t.savedVideos.remove
                                : t.savedVideos.delete
                            ).replace(/^🗑️?\s*/u, "")}
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </LinearGradient>
              );
            }}
          />
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  header: {
    minHeight: 154,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 8,
    overflow: "visible",
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.09)",
    borderWidth: 1,
    borderColor: "rgba(255,212,92,0.38)",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
    marginTop: 16,
    zIndex: 4,
  },

  backText: {
    color: "#FFFFFF",
    fontSize: 25,
    lineHeight: 27,
    fontWeight: "800",
  },

  headerText: {
    flex: 1,
    paddingLeft: 12,
    zIndex: 2,
  },

  headerStars: {
    color: "#FFD45C",
    fontSize: 12,
    letterSpacing: 4,
    marginBottom: 4,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 28,
    lineHeight: 33,
    fontWeight: "900",
  },

  subtitle: {
    color: "#D7E5FF",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
    maxWidth: 220,
  },

  magico: {
    width: 118,
    height: 118,
    marginRight: -10,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    paddingBottom: 50,
  },

  loadingMagico: {
    width: 150,
    height: 150,
    marginBottom: 2,
  },

  loadingStars: {
    color: "#FFD45C",
    fontSize: 17,
    letterSpacing: 5,
    marginBottom: 14,
  },

  loadingText: {
    marginTop: 13,
    color: "#D9E5FF",
    fontSize: 15,
    fontWeight: "700",
  },

  emptyCinema: {
    width: 190,
    height: 160,
    marginBottom: 4,
  },

  emptyStars: {
    color: "#FFD45C",
    fontSize: 18,
    letterSpacing: 5,
    marginBottom: 12,
  },

  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 8,
    textAlign: "center",
  },

  emptyText: {
    color: "#D1DDF5",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },

  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 24,
    gap: 16,
    width: "100%",
    maxWidth: 820,
    alignSelf: "center",
  },

  card: {
    borderRadius: 25,
    overflow: "hidden",
    borderWidth: 1.2,
    borderColor: "rgba(151,184,255,0.58)",
    shadowColor: "#2563EB",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },

  thumbnailContainer: {
    width: "100%",
    height: 196,
    backgroundColor: "#020617",
    position: "relative",
  },

  thumbnail: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },

  thumbnailFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  fallbackCinema: {
    width: 120,
    height: 96,
    marginTop: 4,
  },

  playCircle: {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: 58,
    height: 58,
    marginLeft: -29,
    marginTop: -29,
    borderRadius: 29,
    backgroundColor: "rgba(8,12,36,0.72)",
    borderWidth: 1.5,
    borderColor: "rgba(255,212,92,0.82)",
    alignItems: "center",
    justifyContent: "center",
  },

  playIcon: {
    color: "#FFD45C",
    fontSize: 24,
    marginLeft: 4,
  },

  sceneBadge: {
    position: "absolute",
    right: 12,
    bottom: 12,
    backgroundColor: "rgba(5,11,34,0.78)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.20)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },

  sceneBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
  },

  sharedBadge: {
    position: "absolute",
    left: 12,
    bottom: 12,
    backgroundColor: "rgba(92,40,173,0.90)",
    borderWidth: 1,
    borderColor: "rgba(255,212,92,0.42)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },

  sharedBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
  },

  cardContent: {
    padding: 15,
  },

  cardHeadingRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  cardHeadingText: {
    flex: 1,
  },

  cardTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "900",
  },

  cardMeta: {
    marginTop: 6,
    color: "#D5E3FF",
    fontSize: 12,
    fontWeight: "700",
  },

  cardSparkle: {
    color: "#FFD45C",
    fontSize: 18,
    marginLeft: 8,
  },

  actionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 15,
  },

  watchButton: {
    flex: 1.1,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: "#FFC13D",
    borderWidth: 1,
    borderColor: "#FFE08A",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },

  watchButtonText: {
    color: "#1D2142",
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center",
  },

  shareButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: "rgba(41,128,255,0.38)",
    borderWidth: 1,
    borderColor: "rgba(137,190,255,0.58)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },

  shareButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center",
  },

  deleteButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: "rgba(120,30,58,0.58)",
    borderWidth: 1,
    borderColor: "rgba(255,130,151,0.35)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },

  deleteButtonText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
    textAlign: "center",
  },
});
