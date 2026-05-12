import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
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
import {
  deleteStory,
  getStories,
  toggleFavoriteStory,
} from "../services/storageService";

export default function SavedStoriesScreen() {
  const [stories, setStories] = useState<any[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const data = await getStories();

    const sorted = data.sort((a: any, b: any) => {
      if (a.favorite && !b.favorite) return -1;
      if (!a.favorite && b.favorite) return 1;
      return b.id - a.id;
    });

    setStories(sorted);
  }

  function openStory(story: any) {
    setCurrentStory(story);
    router.push("/player");
  }

  async function toggleFavorite(id: number) {
    await toggleFavoriteStory(id);
    load();
  }

  function confirmDelete(id: number) {
    Alert.alert("Supprimer", "Tu veux vraiment supprimer cette histoire ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          await deleteStory(id);
          load();
        },
      },
    ]);
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

        {displayedStories.length === 0 ? (
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
                      <Image source={{ uri: thumbnail }} style={styles.thumbnail} />
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
                          ? new Date(item.createdAt).toLocaleDateString("fr-FR")
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

        <TouchableOpacity style={styles.backButton} onPress={() => router.push("/")}>
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