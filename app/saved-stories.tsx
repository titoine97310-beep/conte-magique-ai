import { router, useFocusEffect } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { useCallback, useEffect, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { setCurrentStory } from "../services/currentStory";
import { auth } from "../services/firebase";
import {
  getTranslations,
  loadLanguage,
  type AppLanguage,
} from "../services/languageService";

import {
  deleteStory,
  getStories,
  toggleFavoriteStory,
} from "../services/storageService";

import {
  deleteCloudStory,
  getCloudStories,
  toggleCloudFavorite,
} from "../services/storyCloudService";

const BACKEND_URL =
  "https://conte-magique-ai.onrender.com";

export default function SavedStoriesScreen() {
  const [stories, setStories] =
    useState<any[]>([]);

  const [
    showFavoritesOnly,
    setShowFavoritesOnly,
  ] = useState(false);

  const [loading, setLoading] =
    useState(true);

  const [authReady, setAuthReady] =
    useState(false);

  const [language, setLanguage] =
    useState<AppLanguage>("fr");

  const t = getTranslations(language);

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
    const unsubscribe =
      onAuthStateChanged(
        auth,
        () => {
          setAuthReady(true);
        }
      );

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (authReady) {
      void load();
    }
  }, [authReady]);

  async function load() {
    try {
      setLoading(true);

      let data: any[] = [];

      if (auth.currentUser) {
        const [
          cloudStories,
          localStories,
        ] = await Promise.all([
          getCloudStories(),
          getStories(),
        ]);

        data = cloudStories.map(
          (cloudStory: any) => {
            const localStory =
              localStories.find(
                (story: any) =>
                  String(
                    story.id
                  ) ===
                  String(
                    cloudStory.id
                  )
              );

            if (!localStory) {
              return cloudStory;
            }

            const mergedScenes =
              Array.isArray(
                cloudStory.scenes
              )
                ? cloudStory.scenes.map(
                    (
                      cloudScene: any,
                      index: number
                    ) => {
                      const localScene =
                        localStory
                          .scenes?.[
                          index
                        ];

                      return {
                        ...cloudScene,

                        imageUrl:
                          cloudScene?.imageUrl ||
                          localScene?.imageUrl ||
                          null,
                      };
                    }
                  )
                : localStory.scenes ||
                  [];

            return {
              ...cloudStory,
              scenes:
                mergedScenes,
            };
          }
        );

        const cloudIds =
          new Set(
            cloudStories.map(
              (story: any) =>
                String(
                  story.id
                )
            )
          );

        const localOnlyStories =
          localStories.filter(
            (story: any) =>
              !cloudIds.has(
                String(
                  story.id
                )
              )
          );

        data = [
          ...data,
          ...localOnlyStories,
        ];
      } else {
        data =
          await getStories();
      }

      const sorted = [
        ...data,
      ].sort(
        (
          a: any,
          b: any
        ) => {
          if (
            a.favorite &&
            !b.favorite
          ) {
            return -1;
          }

          if (
            !a.favorite &&
            b.favorite
          ) {
            return 1;
          }

          return (
            Number(b.id) -
            Number(a.id)
          );
        }
      );

      setStories(sorted);
    } catch (error) {
      console.log(
        "Erreur chargement histoires :",
        error
      );

      const localStories =
        await getStories();

      const sorted =
        [
          ...localStories,
        ].sort(
          (
            a: any,
            b: any
          ) => {
            return (
              Number(b.id) -
              Number(a.id)
            );
          }
        );

      setStories(sorted);
    } finally {
      setLoading(false);
    }
  }

  function openStory(
    story: any
  ) {
    setCurrentStory(story);

    router.push(
      "/player"
    );
  }

  /*
   * 🎬 NOUVEAU
   *
   * Depuis Mes histoires :
   *
   * - on sélectionne l'histoire ;
   * - on ouvre le Player ;
   * - resumeVideo demande au Player
   *   d'ouvrir la fenêtre vidéo.
   */
  function createVideoFromStory(
    story: any
  ) {
    const sceneCount =
      Array.isArray(
        story?.scenes
      )
        ? story.scenes.length
        : 0;

    if (
      sceneCount !== 4 &&
      sceneCount !== 6
    ) {
      Alert.alert(
        t.savedStories.videoUnavailableTitle,
        t.savedStories.videoUnavailableMessage
      );

      return;
    }

    setCurrentStory(
      story
    );

    router.push({
      pathname:
        "/player",

      params: {
        resumeVideo:
          String(
            Date.now()
          ),
      },
    });
  }

  async function toggleFavorite(
    id: number
  ) {
    try {
      const story =
        stories.find(
          (s: any) =>
            s.id === id
        );

      if (!story) {
        return;
      }

      const newFavorite =
        !story.favorite;

      if (
        auth.currentUser
      ) {
        const cloudResult =
          await toggleCloudFavorite(
            id,
            newFavorite
          );

        if (!cloudResult) {
          Alert.alert(
            t.common.error,
            t.savedStories.favoriteSyncError
          );

          return;
        }
      }

      await toggleFavoriteStory(
        id
      );

      setStories(
        (
          currentStories
        ) =>
          currentStories.map(
            (item: any) =>
              item.id === id
                ? {
                    ...item,
                    favorite:
                      newFavorite,
                  }
                : item
          )
      );
    } catch (error) {
      console.error(
        "Erreur modification favori :",
        error
      );

      Alert.alert(
        t.common.error,
        t.savedStories.favoriteUpdateError
      );
    }
  }

  async function shareStory(
    story: any
  ) {
    try {
      const user =
        auth.currentUser;

      if (!user) {
        Alert.alert(
          t.savedStories.loginRequired,
          t.savedStories.loginRequiredShare
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
                  "story",

                contentId:
                  String(
                    story.id
                  ),

                story,
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
          story.prompt ||
          t.savedStories.shareTitle,

        message:
          `${t.savedStories.shareMessage}\n\n${data.shareUrl}`,

        url:
          data.shareUrl,
      });
    } catch (error) {
      console.error(
        "Erreur partage histoire :",
        error
      );

      Alert.alert(
        t.savedStories.shareImpossible,
        t.savedStories.shareError
      );
    }
  }

  function confirmDelete(
    id: number
  ) {
    Alert.alert(
      t.savedStories.deleteTitle,
      t.savedStories.deleteConfirm,
      [
        {
          text: t.common.cancel,
          style: "cancel",
        },

        {
          text: t.common.delete,
          style: "destructive",

          onPress:
            async () => {
              try {
                if (
                  auth.currentUser
                ) {
                  const cloudDeleted =
                    await deleteCloudStory(
                      id
                    );

                  if (!cloudDeleted) {
                    Alert.alert(
                      t.common.error,
                      t.savedStories.cloudDeleteError
                    );

                    return;
                  }

                  await deleteStory(
                    id
                  );
                } else {
                  await deleteStory(
                    id
                  );
                }

                await load();
              } catch (error) {
                console.log(
                  "Erreur suppression histoire :",
                  error
                );

                Alert.alert(
                  t.common.error,
                  t.savedStories.deleteError
                );
              }
            },
        },
      ]
    );
  }

  const displayedStories =
    showFavoritesOnly
      ? stories.filter(
          (story: any) =>
            story.favorite
        )
      : stories;

  return (
    <SafeAreaView
      style={
        styles.safeArea
      }
    >
      <View
        style={
          styles.container
        }
      >
        <Text
          style={
            styles.title
          }
        >
          {t.savedStories.title}
        </Text>

        <View
          style={
            styles.filterRow
          }
        >
          <TouchableOpacity
            style={[
              styles.filterButton,

              !showFavoritesOnly &&
                styles.filterButtonActive,
            ]}
            onPress={() =>
              setShowFavoritesOnly(
                false
              )
            }
          >
            <Text
              style={[
                styles.filterText,

                !showFavoritesOnly &&
                  styles.filterTextActive,
              ]}
            >
              {t.savedStories.all}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,

              showFavoritesOnly &&
                styles.filterButtonActive,
            ]}
            onPress={() =>
              setShowFavoritesOnly(
                true
              )
            }
          >
            <Text
              style={[
                styles.filterText,

                showFavoritesOnly &&
                  styles.filterTextActive,
              ]}
            >
              {t.savedStories.favorites}
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View
            style={
              styles.emptyBox
            }
          >
            <ActivityIndicator
              size="large"
              color="#FFB703"
            />

            <Text
              style={
                styles.loadingText
              }
            >
              {t.savedStories.loading}
            </Text>
          </View>
        ) : displayedStories.length ===
          0 ? (
          <View
            style={
              styles.emptyBox
            }
          >
            <Text
              style={
                styles.emptyText
              }
            >
              {showFavoritesOnly
                ? t.savedStories.emptyFavorites
                : t.savedStories.empty}
            </Text>
          </View>
        ) : (
          <FlatList
            data={
              displayedStories
            }
            keyExtractor={(
              item: any
            ) =>
              String(
                item.id
              )
            }
            contentContainerStyle={
              styles.listContent
            }
            renderItem={({
              item,
            }: any) => {
              const thumbnail =
                item.scenes?.[
                  0
                ]?.imageUrl;

              const sceneCount =
                Array.isArray(
                  item.scenes
                )
                  ? item.scenes.length
                  : 0;

              const videoCompatible =
                sceneCount === 4 ||
                sceneCount === 6;

              return (
                <View
                  style={
                    styles.card
                  }
                >
                  <View
                    style={
                      styles.topRow
                    }
                  >
                    <TouchableOpacity
                      style={
                        styles.storyMain
                      }
                      onPress={() =>
                        openStory(
                          item
                        )
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
                            styles.placeholder
                          }
                        >
                          <Text
                            style={
                              styles.placeholderText
                            }
                          >
                            ✨
                          </Text>
                        </View>
                      )}

                      <View
                        style={
                          styles.storyInfo
                        }
                      >
                        <Text
                          style={
                            styles.text
                          }
                          numberOfLines={
                            2
                          }
                        >
                          {item.prompt ||
                            t.savedStories.defaultStoryTitle}
                        </Text>

                        <Text
                          style={
                            styles.date
                          }
                        >
                          {sceneCount}{" "}
                          {sceneCount === 1
                            ? t.savedStories.scene
                            : t.savedStories.scenes}
                          {" • "}

                          {item.createdAt
                            ? new Date(
                                item.createdAt
                              ).toLocaleDateString(
                                language === "en"
                                  ? "en-GB"
                                  : language === "es"
                                    ? "es-ES"
                                    : "fr-FR"
                              )
                            : ""}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    <View
                      style={
                        styles.actions
                      }
                    >
                      <TouchableOpacity
                        style={
                          styles.iconButton
                        }
                        onPress={() =>
                          toggleFavorite(
                            item.id
                          )
                        }
                      >
                        <Text
                          style={
                            styles.favoriteText
                          }
                        >
                          {item.favorite
                            ? "❤️"
                            : "🤍"}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={
                          styles.iconButton
                        }
                        onPress={() =>
                          shareStory(
                            item
                          )
                        }
                      >
                        <Text
                          style={
                            styles.shareText
                          }
                        >
                          📤
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={
                          styles.iconButton
                        }
                        onPress={() =>
                          confirmDelete(
                            item.id
                          )
                        }
                      >
                        <Text
                          style={
                            styles.deleteText
                          }
                        >
                          🗑️
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {videoCompatible ? (
                    <TouchableOpacity
                      style={
                        styles.videoButton
                      }
                      onPress={() =>
                        createVideoFromStory(
                          item
                        )
                      }
                    >
                      <Text
                        style={
                          styles.videoButtonText
                        }
                      >
                        {t.savedStories.createVideo}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              );
            }}
          />
        )}

        <TouchableOpacity
          style={
            styles.backButton
          }
          onPress={() =>
            router.push("/")
          }
        >
          <Text
            style={
              styles.backText
            }
          >
            {t.savedStories.backHome}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles =
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor:
        "#111827",
    },

    container: {
      flex: 1,
      paddingHorizontal: 18,
      paddingTop: 20,
      paddingBottom: 18,
      backgroundColor:
        "#111827",
    },

    title: {
      fontSize: 30,
      fontWeight: "900",
      marginBottom: 20,
      color: "white",
    },

    filterRow: {
      flexDirection: "row",
      gap: 10,
      marginBottom: 18,
    },

    filterButton: {
      flex: 1,
      padding: 13,
      borderRadius: 14,
      backgroundColor:
        "rgba(255,255,255,0.12)",
      alignItems: "center",
    },

    filterButtonActive: {
      backgroundColor:
        "#FFB703",
    },

    filterText: {
      color: "white",
      fontWeight: "900",
    },

    filterTextActive: {
      color: "#111",
    },

    listContent: {
      paddingBottom: 12,
      width: "100%",
      maxWidth: 800,
      alignSelf: "center",
    },

    emptyBox: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 20,
    },

    emptyText: {
      color: "white",
      fontSize: 16,
      textAlign: "center",
      opacity: 0.8,
    },

    loadingText: {
      color: "white",
      fontSize: 15,
      fontWeight: "700",
      marginTop: 14,
      opacity: 0.8,
    },

    card: {
      backgroundColor: "white",
      padding: 12,
      borderRadius: 18,
      marginBottom: 12,
    },

    topRow: {
      flexDirection: "row",
      alignItems: "center",
    },

    storyMain: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
    },

    thumbnail: {
      width: 74,
      height: 74,
      borderRadius: 14,
      backgroundColor: "#111",
      marginRight: 12,
    },

    placeholder: {
      width: 74,
      height: 74,
      borderRadius: 14,
      backgroundColor: "#EEE",
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },

    placeholderText: {
      fontSize: 28,
    },

    storyInfo: {
      flex: 1,
    },

    text: {
      fontSize: 16,
      fontWeight: "900",
      color: "#111",
    },

    date: {
      marginTop: 6,
      fontSize: 12,
      color: "#666",
    },

    actions: {
      flexDirection: "row",
      marginLeft: 8,
      gap: 4,
    },

    iconButton: {
      padding: 5,
    },

    favoriteText: {
      fontSize: 22,
    },

    shareText: {
      fontSize: 21,
    },

    deleteText: {
      fontSize: 21,
    },

    videoButton: {
      marginTop: 12,
      backgroundColor: "#7C3AED",
      borderRadius: 14,
      minHeight: 46,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 14,
    },

    videoButtonText: {
      color: "#ffffff",
      fontSize: 14,
      fontWeight: "900",
      textAlign: "center",
    },

    backButton: {
      backgroundColor: "#FFB703",
      padding: 15,
      borderRadius: 15,
      alignItems: "center",
      marginTop: 10,
      marginBottom: 4,
    },

    backText: {
      color: "#111",
      fontWeight: "900",
      fontSize: 16,
    },
  });