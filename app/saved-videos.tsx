import { router } from "expo-router";
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

type SavedVideo = {
  id: string;
  finalVideoUrl: string;
  sceneCount?: number;
  createdAt?: any;
  status?: string;

  /**
   * true = vidéo reçue par partage
   * false/undefined = vidéo créée par l'utilisateur
   */
  shared?: boolean;

  /**
   * Présent uniquement pour une vidéo reçue.
   */
  shareToken?: string;

  videoType?: string | null;
};

export default function SavedVideosScreen() {
  const [videos, setVideos] =
    useState<SavedVideo[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [thumbnails, setThumbnails] =
    useState<Record<string, string>>(
      {}
    );

  const [deletingId, setDeletingId] =
    useState<string | null>(
      null
    );

  useEffect(() => {
    void loadVideos();
  }, []);

  /**
   * Permet d'avoir une clé unique,
   * même si une vidéo créée et une
   * vidéo reçue avaient par hasard
   * le même ID.
   */
  function getVideoKey(
    video: SavedVideo
  ) {
    return video.shared
      ? `shared-${video.id}`
      : `owned-${video.id}`;
  }

  /**
   * Charge :
   *
   * 1. les vidéos créées par l'utilisateur ;
   * 2. les vidéos reçues et enregistrées.
   *
   * Puis fusionne les deux listes.
   */
  async function loadVideos() {
    try {
      setLoading(true);

      const user =
        auth.currentUser;

      if (!user) {
        setVideos([]);
        return;
      }

      /*
       * ==========================
       * VIDÉOS CRÉÉES
       * ==========================
       */

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

      /*
       * On charge en parallèle :
       *
       * - les vidéos créées ;
       * - les vidéos partagées enregistrées.
       */
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
              video.finalVideoUrl &&
              video.status ===
                "completed"
          );

      /*
       * ==========================
       * VIDÉOS REÇUES
       * ==========================
       */

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

      /*
       * Fusion des deux types
       * de vidéos.
       */
      const mergedVideos = [
        ...ownedVideos,
        ...sharedVideos,
      ];

      /*
       * Tri du plus récent
       * au plus ancien.
       */
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

      /*
       * Génération des miniatures.
       */
      void generateThumbnails(
        mergedVideos
      );
    } catch (error) {
      console.error(
        "Erreur chargement vidéos :",
        error
      );

      Alert.alert(
        "Chargement impossible",
        "Tes vidéos n'ont pas pu être chargées."
      );
    } finally {
      setLoading(false);
    }
  }

  /**
   * Convertit les différentes formes
   * possibles de createdAt en timestamp.
   */
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
        new Date(value);

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

  /**
   * Génère une miniature locale
   * pour chaque vidéo.
   */
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
              (
                previous
              ) => ({
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
        return "Date inconnue";
      }

      if (
        typeof value?.toDate ===
        "function"
      ) {
        return value
          .toDate()
          .toLocaleDateString(
            "fr-FR"
          );
      }

      if (
        typeof value?.seconds ===
        "number"
      ) {
        return new Date(
          value.seconds *
            1000
        ).toLocaleDateString(
          "fr-FR"
        );
      }

      return new Date(
        value
      ).toLocaleDateString(
        "fr-FR"
      );
    } catch {
      return "Date inconnue";
    }
  }

  /**
   * Partage d'une vidéo.
   *
   * - vidéo créée :
   *   création d'un nouveau lien sécurisé
   *   via le backend.
   *
   * - vidéo reçue :
   *   on réutilise simplement son lien
   *   de partage existant.
   */
  async function shareVideo(
    video: SavedVideo
  ) {
    try {
      /*
       * ==========================
       * VIDÉO REÇUE
       * ==========================
       */
      if (video.shared) {
        if (
          !video.shareToken
        ) {
          throw new Error(
            "Le lien de partage de cette vidéo est introuvable."
          );
        }

        const shareUrl =
          `https://contemagiqueia.fr/video/${encodeURIComponent(
            video.shareToken
          )}`;

        await Share.share({
          title:
            "Dessin animé ConteMagiqueIA",

          message:
            "🎬 Découvre ce dessin animé créé avec ConteMagiqueIA ! ✨\n\n" +
            shareUrl,

          url:
            shareUrl,
        });

        return;
      }

      /*
       * ==========================
       * VIDÉO CRÉÉE PAR LE COMPTE
       * ==========================
       */

      const user =
        auth.currentUser;

      if (!user) {
        Alert.alert(
          "Connexion requise",
          "Connecte-toi pour partager cette vidéo."
        );

        return;
      }

      const token =
        await user.getIdToken(
          true
        );

      const response =
        await fetch(
          "https://conte-magique-ai.onrender.com/share/create",
          {
            method:
              "POST",

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
          "Dessin animé ConteMagiqueIA",

        message:
          "🎬 Découvre ce dessin animé créé avec ConteMagiqueIA ! ✨\n\n" +
          data.shareUrl,

        url:
          data.shareUrl,
      });
    } catch (error) {
      console.error(
        "Erreur partage vidéo :",
        error
      );

      Alert.alert(
        "Partage impossible",
        error instanceof Error
          ? error.message
          : "La vidéo n'a pas pu être partagée."
      );
    }
  }

  /**
   * Demande confirmation avant
   * la suppression.
   */
  function askDeleteVideo(
    video: SavedVideo
  ) {
    const message =
      video.shared
        ? "Cette vidéo sera retirée de Mes vidéos. La vidéo originale de son créateur ne sera pas supprimée."
        : "Cette vidéo sera supprimée définitivement de tes vidéos enregistrées.";

    Alert.alert(
      video.shared
        ? "Retirer cette vidéo ?"
        : "Supprimer cette vidéo ?",

      message,

      [
        {
          text:
            "Annuler",
          style:
            "cancel",
        },

        {
          text:
            video.shared
              ? "Retirer"
              : "Supprimer",

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

  /**
   * Suppression sécurisée.
   *
   * Vidéo reçue :
   * on supprime UNIQUEMENT la référence
   * personnelle dans users/{uid}/sharedVideos.
   *
   * Vidéo créée :
   * comportement historique :
   * suppression Storage + videoGenerations.
   */
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

        Alert.alert(
          "Vidéo retirée",
          "La vidéo a été retirée de Mes vidéos. L'originale n'a pas été supprimée."
        );

        return;
      }

      /*
       * ==========================
       * VIDÉO CRÉÉE
       * ==========================
       */

      const storage =
        getStorage();

      try {
        const videoRef =
          ref(
            storage,
            video.finalVideoUrl
          );

        await deleteObject(
          videoRef
        );
      } catch (
        error: any
      ) {
        if (
          error?.code !==
          "storage/object-not-found"
        ) {
          throw error;
        }
      }

      await deleteDoc(
        doc(
          db,
          "videoGenerations",
          video.id
        )
      );

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

      Alert.alert(
        "Vidéo supprimée",
        "Le dessin animé a bien été supprimé."
      );
    } catch (error) {
      console.error(
        "Erreur suppression vidéo :",
        error
      );

      Alert.alert(
        "Suppression impossible",
        video.shared
          ? "La vidéo n'a pas pu être retirée. Réessaie dans quelques instants."
          : "La vidéo n'a pas pu être supprimée. Réessaie dans quelques instants."
      );
    } finally {
      setDeletingId(
        null
      );
    }
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
            Chargement de tes vidéos...
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
          🎬 Mes vidéos
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
            Aucune vidéo
          </Text>

          <Text
            style={
              styles.emptyText
            }
          >
            Tes dessins animés créés ou reçus apparaîtront ici.
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
                        🎁 Reçue
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
                      ? "🎁 Dessin animé reçu"
                      : "🎬 Dessin animé"}
                  </Text>

                  <Text
                    style={
                      styles.cardMeta
                    }
                  >
                    {item.sceneCount ||
                      "?"}{" "}
                    scènes
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
                      ▶️ Regarder
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
                      📤 Partager
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
                          ? "🗑️ Retirer"
                          : "🗑️ Supprimer"}
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
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
      paddingHorizontal:
        16,
    },

    backButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor:
        "rgba(255,255,255,0.10)",
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    backText: {
      color:
        "#ffffff",
      fontSize: 26,
      fontWeight:
        "700",
    },

    headerSpacer: {
      width: 44,
    },

    title: {
      color:
        "#ffffff",
      fontSize: 20,
      fontWeight:
        "800",
    },

    center: {
      flex: 1,
      alignItems:
        "center",
      justifyContent:
        "center",
      padding: 30,
    },

    loadingText: {
      marginTop: 12,
      color:
        "#cbd5e1",
    },

    emptyIcon: {
      fontSize: 64,
      marginBottom: 16,
    },

    emptyTitle: {
      color:
        "#ffffff",
      fontSize: 22,
      fontWeight:
        "800",
      marginBottom: 8,
    },

    emptyText: {
      color:
        "#cbd5e1",
      fontSize: 16,
      textAlign:
        "center",
    },

    listContent: {
      padding: 16,
      gap: 16,
    },

    card: {
      backgroundColor:
        "rgba(255,255,255,0.08)",
      borderRadius: 20,
      overflow:
        "hidden",
      paddingBottom: 16,
    },

    thumbnailContainer: {
      width:
        "100%",
      height: 190,
      backgroundColor:
        "#020617",
      position:
        "relative",
    },

    thumbnail: {
      width:
        "100%",
      height:
        "100%",
      resizeMode:
        "cover",
    },

    thumbnailFallback: {
      flex: 1,
      alignItems:
        "center",
      justifyContent:
        "center",
      gap: 8,
    },

    thumbnailFallbackText: {
      fontSize: 42,
    },

    sceneBadge: {
      position:
        "absolute",
      right: 12,
      bottom: 12,
      backgroundColor:
        "rgba(0,0,0,0.72)",
      paddingHorizontal:
        10,
      paddingVertical:
        6,
      borderRadius: 12,
    },

    sceneBadgeText: {
      color:
        "#ffffff",
      fontSize: 12,
      fontWeight:
        "800",
    },

    sharedBadge: {
      position:
        "absolute",
      left: 12,
      bottom: 12,
      backgroundColor:
        "rgba(49,46,129,0.90)",
      paddingHorizontal:
        10,
      paddingVertical:
        6,
      borderRadius: 12,
    },

    sharedBadgeText: {
      color:
        "#ffffff",
      fontSize: 12,
      fontWeight:
        "800",
    },

    cardTitle: {
      color:
        "#ffffff",
      fontSize: 18,
      fontWeight:
        "800",
      marginTop: 14,
      marginHorizontal:
        16,
    },

    cardMeta: {
      marginTop: 6,
      marginHorizontal:
        16,
      color:
        "#cbd5e1",
      fontSize: 14,
    },

    actionsRow: {
      flexDirection:
        "row",
      gap: 8,
      marginTop: 16,
      marginHorizontal:
        16,
    },

    watchButton: {
      flex: 1,
      minHeight: 48,
      borderRadius: 14,
      backgroundColor:
        "#312e81",
      alignItems:
        "center",
      justifyContent:
        "center",
      paddingHorizontal:
        6,
    },

    watchButtonText: {
      color:
        "#ffffff",
      fontSize: 13,
      fontWeight:
        "800",
      textAlign:
        "center",
    },

    shareButton: {
      flex: 1,
      minHeight: 48,
      borderRadius: 14,
      backgroundColor:
        "#0369A1",
      alignItems:
        "center",
      justifyContent:
        "center",
      paddingHorizontal:
        6,
    },

    shareButtonText: {
      color:
        "#ffffff",
      fontSize: 13,
      fontWeight:
        "800",
      textAlign:
        "center",
    },

    deleteButton: {
      flex: 1,
      minHeight: 48,
      borderRadius: 14,
      backgroundColor:
        "#7f1d1d",
      alignItems:
        "center",
      justifyContent:
        "center",
      paddingHorizontal:
        6,
    },

    deleteButtonText: {
      color:
        "#ffffff",
      fontSize: 13,
      fontWeight:
        "800",
      textAlign:
        "center",
    },
  });