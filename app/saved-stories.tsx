import { router } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { setCurrentStory } from "../services/currentStory";
import { auth } from "../services/firebase";
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

export default function SavedStoriesScreen() {
  const [stories, setStories] = useState<any[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, () => {
      setAuthReady(true);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (authReady) {
      load();
    }
  }, [authReady]);

  async function load() {
    try {
      setLoading(true);

      let data: any[] = [];

      if (auth.currentUser) {
        /*
         * Utilisateur connecté :
         * les histoires viennent de Firebase.
         */
        data = await getCloudStories();

        console.log(
          "Histoires chargées depuis Firebase :",
          data.length
        );
      } else {
        /*
         * Visiteur :
         * les histoires restent uniquement sur le téléphone.
         */
        data = await getStories();

        console.log(
          "Histoires chargées depuis le téléphone :",
          data.length
        );
      }

      const sorted = [...data].sort((a: any, b: any) => {
        if (a.favorite && !b.favorite) return -1;
        if (!a.favorite && b.favorite) return 1;

        return Number(b.id) - Number(a.id);
      });

      setStories(sorted);
    } catch (error) {
      console.log("Erreur chargement histoires :", error);

      /*
       * En cas de problème Firebase, on tente d’afficher
       * la sauvegarde locale afin que l’utilisateur ne perde
       * pas l’accès à ses histoires sur son téléphone.
       */
      const localStories = await getStories();

      const sortedLocalStories = [...localStories].sort(
        (a: any, b: any) => {
          if (a.favorite && !b.favorite) return -1;
          if (!a.favorite && b.favorite) return 1;

          return Number(b.id) - Number(a.id);
        }
      );

      setStories(sortedLocalStories);
    } finally {
      setLoading(false);
    }
  }

  function openStory(story: any) {
    setCurrentStory(story);
    router.push("/player");
  }

  async function toggleFavorite(id: number) {
    try {
      if (auth.currentUser) {
        /*
         * On met à jour Firebase.
         */
        const cloudResult = await toggleCloudFavorite(id);

        if (cloudResult === null) {
          Alert.alert(
            "Erreur",
            "Le favori n’a pas pu être synchronisé."
          );

          return;
        }

        /*
         * On met également à jour la copie locale présente
         * sur le téléphone.
         */
        await toggleFavoriteStory(id);
      } else {
        await toggleFavoriteStory(id);
      }

      await load();
    } catch (error) {
      console.log("Erreur modification favori :", error);

      Alert.alert(
        "Erreur",
        "Impossible de modifier ce favori pour le moment."
      );
    }
  }

  function confirmDelete(id: number) {
    Alert.alert(
      "Supprimer",
      "Tu veux vraiment supprimer cette histoire ?",
      [
        {
          text: "Annuler",
          style: "cancel",
        },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              if (auth.currentUser) {
                /*
                 * Suppression dans Firebase :
                 * document Firestore + images Storage.
                 */
                const cloudDeleted = await deleteCloudStory(id);

                if (!cloudDeleted) {
                  Alert.alert(
                    "Erreur",
                    "La suppression dans le cloud a échoué."
                  );

                  return;
                }

                /*
                 * Suppression de la copie locale.
                 */
                await deleteStory(id);
              } else {
                await deleteStory(id);
              }

              await load();
            } catch (error) {
              console.log("Erreur suppression histoire :", error);

              Alert.alert(
                "Erreur",
                "Impossible de supprimer cette histoire."
              );
            }
          },
        },
      ]
    );
  }

  const displayedStories = showFavoritesOnly
    ? stories.filter((story: any) => story.favorite)
    : stories;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Mes histoires</Text>

        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              !showFavoritesOnly && styles.filterButtonActive,
            ]}
            onPress={() => setShowFavoritesOnly(false)}
          >
            <Text
              style={[
                styles.filterText,
                !showFavoritesOnly && styles.filterTextActive,
              ]}
            >
              Toutes
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              showFavoritesOnly && styles.filterButtonActive,
            ]}
            onPress={() => setShowFavoritesOnly(true)}
          >
            <Text
              style={[
                styles.filterText,
                showFavoritesOnly && styles.filterTextActive,
              ]}
            >
              Favoris ❤️
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.emptyBox}>
            <ActivityIndicator size="large" color="#FFB703" />

            <Text style={styles.loadingText}>
              Chargement de tes histoires…
            </Text>
          </View>
        ) : displayedStories.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>
              {showFavoritesOnly
                ? "Aucune histoire favorite pour l’instant."
                : "Aucune histoire sauvegardée pour l’instant."}
            </Text>
          </View>
        ) : (
          <FlatList
            data={displayedStories}
            keyExtractor={(item: any) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }: any) => {
              const thumbnail = item.scenes?.[0]?.imageUrl;

              return (
                <View style={styles.card}>
                  <TouchableOpacity
                    style={styles.storyMain}
                    onPress={() => openStory(item)}
                  >
                    {thumbnail ? (
                      <Image
                        source={{ uri: thumbnail }}
                        style={styles.thumbnail}
                      />
                    ) : (
                      <View style={styles.placeholder}>
                        <Text style={styles.placeholderText}>✨</Text>
                      </View>
                    )}

                    <View style={styles.storyInfo}>
                      <Text style={styles.text} numberOfLines={2}>
                        {item.prompt || "Histoire magique"}
                      </Text>

                      <Text style={styles.date}>
                        {item.createdAt
                          ? new Date(
                              item.createdAt
                            ).toLocaleDateString("fr-FR")
                          : ""}
                      </Text>
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
                      onPress={() => confirmDelete(item.id)}
                    >
                      <Text style={styles.deleteText}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
          />
        )}

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push("/")}
        >
          <Text style={styles.backText}>Retour accueil</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#111827",
  },
  container: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 18,
    backgroundColor: "#111827",
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
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
  },
  filterButtonActive: {
    backgroundColor: "#FFB703",
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
  deleteText: {
    fontSize: 21,
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