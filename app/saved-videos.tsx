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
      <SafeAreaView
        style={
          styles.container
        }
      >
        <View
          style={
            styles.center
          }
        >
          <ActivityIndicator
            size="large"
          />

          <Text
            style={
              styles.loadingText
            }
          >
            {t.savedVideos.loading}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={
        styles.container
      }
    >
      <View
        style={
          styles.header
        }
      >
        <TouchableOpacity
          onPress={() =>
            router.back()
          }
          style={
            styles.backButton
          }
        >
          <Text
            style={
              styles.backText
            }
          >
            ←
          </Text>
        </TouchableOpacity>

        <Text
          style={
            styles.title
          }
        >
          {t.savedVideos.title}
        </Text>

        <View
          style={
            styles.headerSpacer
          }
        />
      </View>

      {videos.length ===
      0 ? (
        <View
          style={
            styles.center
          }
        >
          <Text
            style={
              styles.emptyIcon
            }
          >
            🎬
          </Text>

          <Text
            style={
              styles.emptyTitle
            }
          >
            {t.savedVideos.emptyTitle}
          </Text>

          <Text
            style={
              styles.emptyText
            }
          >
            {t.savedVideos.emptyMessage}
          </Text>
        </View>
      ) : (
        <FlatList
          data={videos}

          keyExtractor={(
            item
          ) =>
            getVideoKey(
              item
            )
          }

          contentContainerStyle={
            styles.listContent
          }

          renderItem={({
            item,
          }) => {
            const key =
              getVideoKey(
                item
              );

            const thumbnail =
              thumbnails[
                key
              ];

            const isDeleting =
              deletingId ===
              key;

            return (
              <View
                style={
                  styles.card
                }
              >
                <View
                  style={
                    styles.thumbnailContainer
                  }
                >
                  {thumbnail ? (
                    <Image
                      source={{
                        uri:
                          thumbnail,
                      }}

                      style={
                        styles.thumbnail
                      }
                    />
                  ) : (
                    <View
                      style={
                        styles.thumbnailFallback
                      }
                    >
                      <ActivityIndicator />

                      <Text
                        style={
                          styles.thumbnailFallbackText
                        }
                      >
                        🎬
                      </Text>
                    </View>
                  )}

                  <View
                    style={
                      styles.sceneBadge
                    }
                  >
                    <Text
                      style={
                        styles.sceneBadgeText
                      }
                    >
                      {item.sceneCount ||
                        "?"}{" "}
                      scènes
                    </Text>
                  </View>

                  {item.shared ? (
                    <View
                      style={
                        styles.sharedBadge
                      }
                    >
                      <Text
                        style={
                          styles.sharedBadgeText
                        }
                      >
                        {t.savedVideos.receivedBadge}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <View>
                  <Text
                    style={
                      styles.cardTitle
                    }
                  >
                    {item.shared
                      ? t.savedVideos.receivedVideo
                      : t.savedVideos.animatedVideo}
                  </Text>

                  <Text
                    style={
                      styles.cardMeta
                    }
                  >
                    {item.sceneCount ||
                      "?"}{" "}
                    {(item.sceneCount || 0) === 1
                      ? t.savedVideos.scene
                      : t.savedVideos.scenes}
                    {" • "}
                    {formatDate(
                      item.createdAt
                    )}
                  </Text>
                </View>

                <View
                  style={
                    styles.actionsRow
                  }
                >
                  <TouchableOpacity
                    style={
                      styles.watchButton
                    }
                    onPress={() =>
                      router.push({
                        pathname:
                          "/video-player",

                        params: {
                          url:
                            item.finalVideoUrl,
                        },
                      })
                    }
                    disabled={
                      isDeleting
                    }
                  >
                    <Text
                      style={
                        styles.watchButtonText
                      }
                    >
                      {t.savedVideos.watch}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={
                      styles.shareButton
                    }
                    onPress={() =>
                      shareVideo(
                        item
                      )
                    }
                    disabled={
                      isDeleting
                    }
                  >
                    <Text
                      style={
                        styles.shareButtonText
                      }
                    >
                      {t.savedVideos.share}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={
                      styles.deleteButton
                    }
                    onPress={() =>
                      askDeleteVideo(
                        item
                      )
                    }
                    disabled={
                      isDeleting
                    }
                  >
                    {isDeleting ? (
                      <ActivityIndicator />
                    ) : (
                      <Text
                        style={
                          styles.deleteButtonText
                        }
                      >
                        {item.shared
                          ? t.savedVideos.remove
                          : t.savedVideos.delete}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        "#111827",
    },

    header: {
      height: 64,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      paddingHorizontal: 16,
    },

    backButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor:
        "rgba(255,255,255,0.10)",
      alignItems: "center",
      justifyContent: "center",
    },

    backText: {
      color: "#ffffff",
      fontSize: 26,
      fontWeight: "700",
    },

    headerSpacer: {
      width: 44,
    },

    title: {
      color: "#ffffff",
      fontSize: 20,
      fontWeight: "800",
    },

    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 30,
    },

    loadingText: {
      marginTop: 12,
      color: "#cbd5e1",
    },

    emptyIcon: {
      fontSize: 64,
      marginBottom: 16,
    },

    emptyTitle: {
      color: "#ffffff",
      fontSize: 22,
      fontWeight: "800",
      marginBottom: 8,
    },

    emptyText: {
      color: "#cbd5e1",
      fontSize: 16,
      textAlign: "center",
    },

    listContent: {
      padding: 16,
      gap: 16,
    },

    card: {
      backgroundColor:
        "rgba(255,255,255,0.08)",
      borderRadius: 20,
      overflow: "hidden",
      paddingBottom: 16,
    },

    thumbnailContainer: {
      width: "100%",
      height: 190,
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
      gap: 8,
    },

    thumbnailFallbackText: {
      fontSize: 42,
    },

    sceneBadge: {
      position: "absolute",
      right: 12,
      bottom: 12,
      backgroundColor:
        "rgba(0,0,0,0.72)",
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 12,
    },

    sceneBadgeText: {
      color: "#ffffff",
      fontSize: 12,
      fontWeight: "800",
    },

    sharedBadge: {
      position: "absolute",
      left: 12,
      bottom: 12,
      backgroundColor:
        "rgba(49,46,129,0.90)",
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 12,
    },

    sharedBadgeText: {
      color: "#ffffff",
      fontSize: 12,
      fontWeight: "800",
    },

    cardTitle: {
      color: "#ffffff",
      fontSize: 18,
      fontWeight: "800",
      marginTop: 14,
      marginHorizontal: 16,
    },

    cardMeta: {
      marginTop: 6,
      marginHorizontal: 16,
      color: "#cbd5e1",
      fontSize: 14,
    },

    actionsRow: {
      flexDirection: "row",
      gap: 8,
      marginTop: 16,
      marginHorizontal: 16,
    },

    watchButton: {
      flex: 1,
      minHeight: 48,
      borderRadius: 14,
      backgroundColor: "#312e81",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 6,
    },

    watchButtonText: {
      color: "#ffffff",
      fontSize: 13,
      fontWeight: "800",
      textAlign: "center",
    },

    shareButton: {
      flex: 1,
      minHeight: 48,
      borderRadius: 14,
      backgroundColor: "#0369A1",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 6,
    },

    shareButtonText: {
      color: "#ffffff",
      fontSize: 13,
      fontWeight: "800",
      textAlign: "center",
    },

    deleteButton: {
      flex: 1,
      minHeight: 48,
      borderRadius: 14,
      backgroundColor: "#7f1d1d",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 6,
    },

    deleteButtonText: {
      color: "#ffffff",
      fontSize: 13,
      fontWeight: "800",
      textAlign: "center",
    },
  });