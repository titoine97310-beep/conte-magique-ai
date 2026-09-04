import { router } from "expo-router";
import {
    collection,
    getDocs,
    orderBy,
    query,
    where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { auth, db } from "../services/firebase";

type SavedVideo = {
  id: string;
  finalVideoUrl: string;
  sceneCount?: number;
  createdAt?: any;
  status?: string;
};

export default function SavedVideosScreen() {
  const [videos, setVideos] = useState<SavedVideo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVideos();
  }, []);

  async function loadVideos() {
    try {
      const user = auth.currentUser;

      if (!user) {
        setVideos([]);
        return;
      }

      const videosQuery = query(
        collection(db, "videoGenerations"),
        where("uid", "==", user.uid),
        orderBy("createdAt", "desc")
      );

      const snapshot = await getDocs(videosQuery);

      const loadedVideos: SavedVideo[] =
        snapshot.docs
          .map((docSnapshot) => {
            const data = docSnapshot.data();

            return {
              id: docSnapshot.id,
              finalVideoUrl:
                data.finalVideoUrl || "",
              sceneCount:
                data.sceneCount,
              createdAt:
                data.createdAt,
              status:
                data.status,
            };
          })
          .filter(
            (video) =>
              video.finalVideoUrl &&
              video.status === "completed"
          );

      setVideos(loadedVideos);
    } catch (error) {
      console.error(
        "Erreur chargement vidéos :",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  function formatDate(value: any) {
    try {
      if (!value) {
        return "Date inconnue";
      }

      if (value?.toDate) {
        return value
          .toDate()
          .toLocaleDateString("fr-FR");
      }

      return new Date(
        value
      ).toLocaleDateString("fr-FR");
    } catch {
      return "Date inconnue";
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>
            Chargement de tes vidéos...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>
            ←
          </Text>
        </TouchableOpacity>

        <Text style={styles.title}>
          🎬 Mes vidéos
        </Text>

        <View style={styles.headerSpacer} />
      </View>

      {videos.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>
            🎬
          </Text>

          <Text style={styles.emptyTitle}>
            Aucune vidéo
          </Text>

          <Text style={styles.emptyText}>
            Tes dessins animés apparaîtront ici
            après leur création.
          </Text>
        </View>
      ) : (
        <FlatList
          data={videos}
          keyExtractor={(item) => item.id}
          contentContainerStyle={
            styles.listContent
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View>
                <Text style={styles.cardTitle}>
                  🎬 Dessin animé
                </Text>

                <Text style={styles.cardMeta}>
                  {item.sceneCount || "?"} scènes
                  {" • "}
                  {formatDate(item.createdAt)}
                </Text>
              </View>

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
              >
                <Text
                  style={styles.watchButtonText}
                >
                  ▶️ Regarder
                </Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111827",
  },

  header: {
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
    gap: 12,
  },

  card: {
    backgroundColor:
      "rgba(255,255,255,0.08)",
    borderRadius: 18,
    padding: 16,
    gap: 16,
  },

  cardTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800",
  },

  cardMeta: {
    marginTop: 6,
    color: "#cbd5e1",
    fontSize: 14,
  },

  watchButton: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: "#312e81",
    alignItems: "center",
    justifyContent: "center",
  },

  watchButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
});