import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
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
  const params = useLocalSearchParams<{
    videoPack?: string | string[];
  }>();

  const rawVideoPack = Array.isArray(params.videoPack)
    ? params.videoPack[0]
    : params.videoPack;

  const purchasedVideoScenes =
    rawVideoPack === "4"
      ? 4
      : rawVideoPack === "6"
        ? 6
        : null;

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
        ...(purchasedVideoScenes
          ? {
              videoPack:
                String(purchasedVideoScenes),
            }
          : {}),
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

  const videoPackStories = purchasedVideoScenes
    ? stories.filter((story: any) => {
        const sceneCount = Array.isArray(story?.scenes)
          ? story.scenes.length
          : 0;

        return sceneCount === purchasedVideoScenes;
      })
    : stories;

  const displayedStories =
    showFavoritesOnly
      ? videoPackStories.filter(
          (story: any) =>
            story.favorite
        )
      : videoPackStories;

  return (
    <LinearGradient
      colors={["#121542", "#29246D", "#11133C", "#070B24"]}
      locations={[0, 0.38, 0.72, 1]}
      style={styles.safeArea}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.eyebrow}>✦  ✨  ✦</Text>
              <Text style={styles.title}>{t.savedStories.title}</Text>
              <Text style={styles.subtitle}>
                {language === "fr"
                  ? "Retrouve toutes tes aventures magiques"
                  : language === "en"
                    ? "Find all your magical adventures"
                    : "Encuentra todas tus aventuras mágicas"}
              </Text>
            </View>

            <Image
              source={require("../assets/images/magico.png")}
              style={styles.magico}
              resizeMode="contain"
            />
          </View>

          {purchasedVideoScenes ? (
            <LinearGradient
              colors={["#6D28D9", "#4338CA", "#1D4ED8"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.videoPackBanner}
            >
              <Text style={styles.videoPackStars}>✦ ✨ ✦</Text>
              <Text style={styles.videoPackTitle}>
                {language === "fr"
                  ? `Ton dessin animé ${purchasedVideoScenes} scènes`
                  : language === "en"
                    ? `Your ${purchasedVideoScenes}-scene animated story`
                    : `Tu dibujo animado de ${purchasedVideoScenes} escenas`}
              </Text>
              <Text style={styles.videoPackSubtitle}>
                {language === "fr"
                  ? `Choisis une histoire de ${purchasedVideoScenes} scènes. Ton carnet vidéo est déjà sélectionné.`
                  : language === "en"
                    ? `Choose a ${purchasedVideoScenes}-scene story. Your video pack is already selected.`
                    : `Elige una historia de ${purchasedVideoScenes} escenas. Tu paquete de vídeo ya está seleccionado.`}
              </Text>
            </LinearGradient>
          ) : null}

          <View style={styles.filterRow}>
            <TouchableOpacity
              style={[
                styles.filterButton,
                !showFavoritesOnly && styles.filterButtonActive,
              ]}
              onPress={() => setShowFavoritesOnly(false)}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.filterText,
                  !showFavoritesOnly && styles.filterTextActive,
                ]}
              >
                ✨ {t.savedStories.all}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterButton,
                showFavoritesOnly && styles.filterButtonActive,
              ]}
              onPress={() => setShowFavoritesOnly(true)}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.filterText,
                  showFavoritesOnly && styles.filterTextActive,
                ]}
              >
                ❤️ {t.savedStories.favorites}
              </Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.emptyBox}>
              <Image
                source={require("../assets/images/magico.png")}
                style={styles.emptyMagico}
                resizeMode="contain"
              />
              <ActivityIndicator size="large" color="#FFCF4A" />
              <Text style={styles.loadingText}>{t.savedStories.loading}</Text>
            </View>
          ) : displayedStories.length === 0 ? (
            <View style={styles.emptyBox}>
              <Image
                source={require("../assets/images/magico.png")}
                style={styles.emptyMagico}
                resizeMode="contain"
              />
              <Text style={styles.emptyStars}>✦  ✨  ✦</Text>
              <Text style={styles.emptyText}>
                {purchasedVideoScenes
                  ? language === "fr"
                    ? `Tu n’as pas encore d’histoire de ${purchasedVideoScenes} scènes. Crée-en une pour utiliser ton carnet dessin animé.`
                    : language === "en"
                      ? `You don't have a ${purchasedVideoScenes}-scene story yet. Create one to use your animated-story pack.`
                      : `Todavía no tienes una historia de ${purchasedVideoScenes} escenas. Crea una para usar tu paquete de vídeo.`
                  : showFavoritesOnly
                    ? t.savedStories.emptyFavorites
                    : t.savedStories.empty}
              </Text>
            </View>
          ) : (
            <FlatList
              data={displayedStories}
              keyExtractor={(item: any) => String(item.id)}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }: any) => {
                const thumbnail = item.scenes?.[0]?.imageUrl;
                const sceneCount = Array.isArray(item.scenes)
                  ? item.scenes.length
                  : 0;
                const videoCompatible = sceneCount === 4 || sceneCount === 6;

                return (
                  <LinearGradient
                    colors={["rgba(91,47,176,0.94)", "rgba(43,31,112,0.97)", "rgba(24,24,73,0.98)"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.card}
                  >
                    <View style={styles.cardSparkleOne}>
                      <Text style={styles.cardSparkle}>✦</Text>
                    </View>
                    <View style={styles.cardSparkleTwo}>
                      <Text style={styles.cardSparkleSmall}>✧</Text>
                    </View>

                    <View style={styles.topRow}>
                      <TouchableOpacity
                        style={styles.storyMain}
                        onPress={() => openStory(item)}
                        activeOpacity={0.86}
                      >
                        {thumbnail ? (
                          <Image
                            source={{ uri: thumbnail }}
                            style={styles.thumbnail}
                          />
                        ) : (
                          <LinearGradient
                            colors={["#7137C8", "#342070"]}
                            style={styles.placeholder}
                          >
                            <Text style={styles.placeholderText}>✨</Text>
                          </LinearGradient>
                        )}

                        <View style={styles.storyInfo}>
                          <Text style={styles.text} numberOfLines={2}>
                            {item.prompt || t.savedStories.defaultStoryTitle}
                          </Text>

                          <View style={styles.metaPill}>
                            <Text style={styles.date}>
                              {sceneCount}{" "}
                              {sceneCount === 1
                                ? t.savedStories.scene
                                : t.savedStories.scenes}
                              {"  •  "}
                              {item.createdAt
                                ? new Date(item.createdAt).toLocaleDateString(
                                    language === "en"
                                      ? "en-GB"
                                      : language === "es"
                                        ? "es-ES"
                                        : "fr-FR"
                                  )
                                : ""}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>

                      <View style={styles.actions}>
                        <TouchableOpacity
                          style={styles.iconButton}
                          onPress={() => toggleFavorite(item.id)}
                        >
                          <Text style={styles.favoriteText}>
                            {item.favorite ? "❤️" : "🤍"}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.iconButton}
                          onPress={() => shareStory(item)}
                        >
                          <Text style={styles.shareText}>↗</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.iconButton}
                          onPress={() => confirmDelete(item.id)}
                        >
                          <Text style={styles.deleteText}>🗑️</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.cardBottom}>
                      <TouchableOpacity
                        style={styles.openButton}
                        onPress={() => openStory(item)}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.openButtonText}>
                          {language === "fr"
                            ? "📖 Ouvrir l’histoire"
                            : language === "en"
                              ? "📖 Open story"
                              : "📖 Abrir historia"}
                        </Text>
                      </TouchableOpacity>

                      {videoCompatible ? (
                        <TouchableOpacity
                          style={styles.videoButton}
                          onPress={() => createVideoFromStory(item)}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.videoButtonText}>
                            {purchasedVideoScenes
                              ? language === "fr"
                                ? "🎬 Utiliser cette histoire"
                                : language === "en"
                                  ? "🎬 Use this story"
                                  : "🎬 Usar esta historia"
                              : t.savedStories.createVideo}
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </LinearGradient>
                );
              }}
            />
          )}

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push("/")}
            activeOpacity={0.86}
          >
            <Text style={styles.backText}>{t.savedStories.backHome}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  container: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 14,
  },

  header: {
    minHeight: 132,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    overflow: "visible",
  },

  headerText: {
    flex: 1,
    zIndex: 2,
    paddingLeft: 2,
  },

  eyebrow: {
    color: "#FFD45C",
    fontSize: 14,
    letterSpacing: 4,
    marginBottom: 5,
  },

  title: {
    fontSize: 30,
    lineHeight: 35,
    fontWeight: "900",
    color: "white",
  },

  subtitle: {
    color: "#D8D7F7",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 5,
    maxWidth: 230,
  },

  magico: {
    width: 128,
    height: 128,
    marginRight: -8,
  },

  videoPackBanner: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 14,
    borderWidth: 1.2,
    borderColor: "rgba(255,212,92,0.68)",
    alignItems: "center",
    shadowColor: "#6D28D9",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },

  videoPackStars: {
    color: "#FFD45C",
    fontSize: 14,
    letterSpacing: 3,
    marginBottom: 3,
  },

  videoPackTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
    textAlign: "center",
  },

  videoPackSubtitle: {
    color: "#E9E7FF",
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
    marginTop: 4,
  },

  filterRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },

  filterButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(167,151,255,0.28)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },

  filterButtonActive: {
    backgroundColor: "#FFC13D",
    borderColor: "#FFE08A",
  },

  filterText: {
    color: "#EAE8FF",
    fontWeight: "900",
    fontSize: 14,
  },

  filterTextActive: {
    color: "#231B43",
  },

  listContent: {
    paddingBottom: 10,
    width: "100%",
    maxWidth: 800,
    alignSelf: "center",
  },

  emptyBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
  },

  emptyMagico: {
    width: 150,
    height: 150,
    marginBottom: 4,
  },

  emptyStars: {
    color: "#FFD45C",
    fontSize: 18,
    letterSpacing: 5,
    marginBottom: 12,
  },

  emptyText: {
    color: "#F5F3FF",
    fontSize: 16,
    lineHeight: 23,
    textAlign: "center",
    opacity: 0.92,
  },

  loadingText: {
    color: "#E9E7FF",
    fontSize: 15,
    fontWeight: "700",
    marginTop: 14,
  },

  card: {
    minHeight: 166,
    padding: 13,
    borderRadius: 24,
    marginBottom: 13,
    borderWidth: 1.2,
    borderColor: "rgba(176,153,255,0.58)",
    overflow: "hidden",
    shadowColor: "#6D28D9",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },

  cardSparkleOne: {
    position: "absolute",
    right: 18,
    top: 9,
  },

  cardSparkleTwo: {
    position: "absolute",
    left: 8,
    bottom: 10,
  },

  cardSparkle: {
    color: "rgba(255,212,92,0.75)",
    fontSize: 16,
  },

  cardSparkleSmall: {
    color: "rgba(255,255,255,0.38)",
    fontSize: 13,
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
    width: 82,
    height: 82,
    borderRadius: 18,
    backgroundColor: "#111",
    marginRight: 12,
    borderWidth: 1.2,
    borderColor: "rgba(255,212,92,0.55)",
  },

  placeholder: {
    width: 82,
    height: 82,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "rgba(255,212,92,0.45)",
  },

  placeholderText: {
    fontSize: 30,
  },

  storyInfo: {
    flex: 1,
    paddingRight: 4,
  },

  text: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "900",
    color: "white",
  },

  metaPill: {
    alignSelf: "flex-start",
    marginTop: 8,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.09)",
  },

  date: {
    fontSize: 11,
    color: "#DCD8FF",
    fontWeight: "700",
  },

  actions: {
    marginLeft: 7,
    gap: 5,
  },

  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.13)",
  },

  favoriteText: {
    fontSize: 18,
  },

  shareText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
    marginTop: -2,
  },

  deleteText: {
    fontSize: 17,
  },

  cardBottom: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },

  openButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },

  openButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center",
  },

  videoButton: {
    flex: 1.15,
    minHeight: 42,
    borderRadius: 14,
    backgroundColor: "#FFC13D",
    borderWidth: 1,
    borderColor: "#FFE08A",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },

  videoButtonText: {
    color: "#241A3E",
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center",
  },

  backButton: {
    minHeight: 50,
    backgroundColor: "rgba(42,35,108,0.92)",
    borderWidth: 1,
    borderColor: "rgba(255,212,92,0.55)",
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },

  backText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 15,
  },
});
