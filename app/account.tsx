import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import {
    onAuthStateChanged,
    signOut,
    type User,
} from "firebase/auth";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { auth } from "../services/firebase";
import { getUserProfile } from "../services/userService";
import type { UserProfile } from "../types/user";

export default function AccountScreen() {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setCheckingAuth(false);

      if (!firebaseUser) {
        setProfile(null);
        setLoadingProfile(false);
        router.replace("/register");
      }
    });

    return unsubscribe;
  }, []);

  const loadProfile = useCallback(
    async (showRefreshing = false) => {
      const currentUser = auth.currentUser;

      if (!currentUser) {
        setProfile(null);
        setLoadingProfile(false);
        return;
      }

      try {
        if (showRefreshing) {
          setRefreshing(true);
        } else {
          setLoadingProfile(true);
        }

        const firestoreProfile = await getUserProfile(currentUser.uid);

        setProfile(firestoreProfile);
      } catch (error) {
        console.log("Erreur chargement profil :", error);

        Alert.alert(
          "Chargement impossible",
          "Impossible de récupérer les informations de ton compte pour le moment."
        );
      } finally {
        setLoadingProfile(false);
        setRefreshing(false);
      }
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      if (user) {
        loadProfile();
      }
    }, [user, loadProfile])
  );

  async function handleRefresh() {
    await loadProfile(true);
  }

  function handleLogout() {
    Alert.alert(
      "Se déconnecter",
      "Veux-tu vraiment te déconnecter de ton compte ?",
      [
        {
          text: "Annuler",
          style: "cancel",
        },
        {
          text: "Se déconnecter",
          style: "destructive",
          onPress: async () => {
            try {
              setLoggingOut(true);

              await signOut(auth);

              router.replace("/");
            } catch (error) {
              console.log("Erreur déconnexion :", error);

              Alert.alert(
                "Erreur",
                "Impossible de te déconnecter pour le moment."
              );
            } finally {
              setLoggingOut(false);
            }
          },
        },
      ]
    );
  }

  function getFirstName() {
    const displayName =
      profile?.displayName?.trim() ||
      user?.displayName?.trim();

    if (displayName) {
      return displayName.split(" ")[0];
    }

    return "à toi";
  }

  function getDisplayName() {
    return (
      profile?.displayName ||
      user?.displayName ||
      "Non renseigné"
    );
  }

  function getEmail() {
    return (
      profile?.email ||
      user?.email ||
      "Non disponible"
    );
  }

  function formatDate(
    value: string | null | undefined,
    emptyText = "Non disponible"
  ) {
    if (!value) {
      return emptyText;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return emptyText;
    }

    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }

  function formatDateTime(
    value: string | null | undefined,
    emptyText = "Non disponible"
  ) {
    if (!value) {
      return emptyText;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return emptyText;
    }

    return date.toLocaleString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getCreationDate() {
    if (profile?.createdAt) {
      return formatDate(profile.createdAt);
    }

    return formatDate(user?.metadata.creationTime);
  }

  function getRoleLabel() {
    switch (profile?.role) {
      case "admin":
        return "Administrateur";

      case "user":
        return "Utilisateur";

      case "guest":
        return "Invité";

      default:
        return "Utilisateur";
    }
  }

  function formatStoryCount(amount: number) {
    if (amount === 0) {
      return "Aucune histoire restante";
    }

    if (amount === 1) {
      return "1 histoire restante";
    }

    return `${amount} histoires restantes`;
  }

  function formatPurchaseCount(amount: number) {
    if (amount === 0) {
      return "Aucun achat";
    }

    if (amount === 1) {
      return "1 achat";
    }

    return `${amount} achats`;
  }

  if (checkingAuth || loadingProfile) {
    return (
      <LinearGradient
        colors={["#111827", "#312E81", "#020617"]}
        style={styles.loadingContainer}
      >
        <ActivityIndicator size="large" color="#FFB703" />

        <Text style={styles.loadingText}>
          Chargement de ton compte...
        </Text>
      </LinearGradient>
    );
  }

  if (!user) {
    return null;
  }

  const textStoriesRemaining =
    profile?.packs.text.storiesRemaining ?? 0;

  const illustratedStoriesRemaining =
    profile?.packs.illustrated.storiesRemaining ?? 0;

  const textPurchases =
    profile?.packs.text.purchases ?? 0;

  const illustratedPurchases =
    profile?.packs.illustrated.purchases ?? 0;

  return (
    <LinearGradient
      colors={["#111827", "#312E81", "#020617"]}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#FFB703"
            colors={["#FFB703"]}
          />
        }
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace("/")}
          disabled={loggingOut}
        >
          <Text style={styles.backText}>← Accueil</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>👤</Text>
          </View>

          <Text style={styles.title}>
            Bonjour {getFirstName()} 👋
          </Text>

          <Text style={styles.subtitle}>
            Retrouve ici les informations de ton compte
            ConteMagiqueIA.
          </Text>
        </View>

        {!profile && (
          <View style={styles.warningCard}>
            <Text style={styles.warningTitle}>
              Profil incomplet
            </Text>

            <Text style={styles.warningText}>
              Ton compte Firebase existe, mais son profil
              Firestore n’a pas été trouvé.
            </Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Mes informations
          </Text>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Text style={styles.infoIconText}>👤</Text>
            </View>

            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Prénom</Text>

              <Text style={styles.infoValue}>
                {getDisplayName()}
              </Text>
            </View>
          </View>

          <View style={styles.separator} />

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Text style={styles.infoIconText}>📧</Text>
            </View>

            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>
                Adresse e-mail
              </Text>

              <Text style={styles.infoValue}>
                {getEmail()}
              </Text>
            </View>
          </View>

          <View style={styles.separator} />

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Text style={styles.infoIconText}>📅</Text>
            </View>

            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>
                Compte créé le
              </Text>

              <Text style={styles.infoValue}>
                {getCreationDate()}
              </Text>
            </View>
          </View>

          <View style={styles.separator} />

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Text style={styles.infoIconText}>🪪</Text>
            </View>

            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>
                Type de compte
              </Text>

              <Text style={styles.infoValue}>
                {getRoleLabel()}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Mes carnets
          </Text>

          <View style={styles.packRow}>
            <View style={styles.packIconContainer}>
              <Text style={styles.packIcon}>✍️</Text>
            </View>

            <View style={styles.packContent}>
              <Text style={styles.packName}>
                Carnet Texte
              </Text>

              <Text style={styles.packDescription}>
                Histoires sans illustration
              </Text>

              <Text style={styles.packRemaining}>
                {formatStoryCount(textStoriesRemaining)}
              </Text>
            </View>

            <View style={styles.packCountBadge}>
              <Text style={styles.packCountText}>
                {textStoriesRemaining}
              </Text>
            </View>
          </View>

          <View style={styles.separator} />

          <View style={styles.packRow}>
            <View style={styles.packIconContainer}>
              <Text style={styles.packIcon}>🎨</Text>
            </View>

            <View style={styles.packContent}>
              <Text style={styles.packName}>
                Carnet Illustré
              </Text>

              <Text style={styles.packDescription}>
                Histoires avec texte et images
              </Text>

              <Text style={styles.packRemaining}>
                {formatStoryCount(
                  illustratedStoriesRemaining
                )}
              </Text>
            </View>

            <View style={styles.packCountBadge}>
              <Text style={styles.packCountText}>
                {illustratedStoriesRemaining}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.premiumButton}
            onPress={() => router.push("/premium" as any)}
            disabled={loggingOut}
          >
            <Text style={styles.premiumButtonText}>
              Acheter un carnet
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Mon activité
          </Text>

          <View style={styles.activityRow}>
            <View style={styles.infoIcon}>
              <Text style={styles.infoIconText}>🔑</Text>
            </View>

            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>
                Dernière connexion
              </Text>

              <Text style={styles.infoValue}>
                {formatDateTime(profile?.lastLogin)}
              </Text>
            </View>
          </View>

          <View style={styles.separator} />

          <View style={styles.activityRow}>
            <View style={styles.infoIcon}>
              <Text style={styles.infoIconText}>📖</Text>
            </View>

            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>
                Dernière histoire créée
              </Text>

              <Text style={styles.infoValue}>
                {formatDateTime(
                  profile?.lastStoryCreatedAt,
                  "Aucune histoire créée"
                )}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Mes achats
          </Text>

          <View style={styles.purchaseRow}>
            <View>
              <Text style={styles.purchaseName}>
                ✍️ Carnet Texte
              </Text>

              <Text style={styles.purchaseValue}>
                {formatPurchaseCount(textPurchases)}
              </Text>
            </View>

            <Text style={styles.purchaseNumber}>
              {textPurchases}
            </Text>
          </View>

          <View style={styles.separator} />

          <View style={styles.purchaseRow}>
            <View>
              <Text style={styles.purchaseName}>
                🎨 Carnet Illustré
              </Text>

              <Text style={styles.purchaseValue}>
                {formatPurchaseCount(
                  illustratedPurchases
                )}
              </Text>
            </View>

            <Text style={styles.purchaseNumber}>
              {illustratedPurchases}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Mon espace
          </Text>

          <TouchableOpacity
            style={styles.menuButton}
            onPress={() =>
              router.push("/saved-stories" as any)
            }
            disabled={loggingOut}
          >
            <Text style={styles.menuIcon}>❤️</Text>

            <Text style={styles.menuText}>
              Mes histoires
            </Text>

            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <View style={styles.separator} />

          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => router.push("/cgu" as any)}
            disabled={loggingOut}
          >
            <Text style={styles.menuIcon}>📄</Text>

            <Text style={styles.menuText}>
              Conditions générales
            </Text>

            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <View style={styles.separator} />

          <TouchableOpacity
            style={styles.menuButton}
            onPress={() =>
              router.push("/privacy" as any)
            }
            disabled={loggingOut}
          >
            <Text style={styles.menuIcon}>🔒</Text>

            <Text style={styles.menuText}>
              Politique de confidentialité
            </Text>

            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[
            styles.logoutButton,
            loggingOut && styles.buttonDisabled,
          ]}
          onPress={handleLogout}
          disabled={loggingOut}
        >
          {loggingOut ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.logoutButtonText}>
              🚪 Se déconnecter
            </Text>
          )}
        </TouchableOpacity>

        <Text style={styles.footerText}>
          ConteMagiqueIA ✨
        </Text>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  loadingText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 18,
  },

  scrollContent: {
    padding: 22,
    paddingTop: 55,
    paddingBottom: 45,
  },

  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingRight: 15,
    marginBottom: 18,
  },

  backText: {
    color: "#CBD5E1",
    fontSize: 15,
    fontWeight: "800",
  },

  header: {
    alignItems: "center",
    marginBottom: 26,
  },

  avatar: {
    width: 94,
    height: 94,
    borderRadius: 47,
    backgroundColor: "#FFB703",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 17,
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.25)",
  },

  avatarText: {
    fontSize: 45,
  },

  title: {
    color: "white",
    fontSize: 30,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 9,
  },

  subtitle: {
    color: "#CBD5E1",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    maxWidth: 330,
  },

  warningCard: {
    backgroundColor: "rgba(245,158,11,0.16)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.45)",
    padding: 16,
    marginBottom: 18,
  },

  warningTitle: {
    color: "#FBBF24",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 6,
  },

  warningText: {
    color: "#FDE68A",
    fontSize: 14,
    lineHeight: 20,
  },

  card: {
    backgroundColor: "rgba(255,255,255,0.11)",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    padding: 18,
    marginBottom: 18,
  },

  cardTitle: {
    color: "#FFB703",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 17,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 58,
  },

  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 58,
  },

  infoIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 13,
  },

  infoIconText: {
    fontSize: 21,
  },

  infoContent: {
    flex: 1,
  },

  infoLabel: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 4,
  },

  infoValue: {
    color: "white",
    fontSize: 15,
    fontWeight: "800",
  },

  separator: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginVertical: 10,
  },

  packRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 86,
  },

  packIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: "rgba(255,183,3,0.16)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 13,
  },

  packIcon: {
    fontSize: 25,
  },

  packContent: {
    flex: 1,
    paddingRight: 10,
  },

  packName: {
    color: "white",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 3,
  },

  packDescription: {
    color: "#94A3B8",
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 5,
  },

  packRemaining: {
    color: "#FFB703",
    fontSize: 13,
    fontWeight: "900",
  },

  packCountBadge: {
    minWidth: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#FFB703",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
  },

  packCountText: {
    color: "#111",
    fontSize: 18,
    fontWeight: "900",
  },

  premiumButton: {
    backgroundColor: "#FFB703",
    minHeight: 52,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 18,
  },

  premiumButtonText: {
    color: "#111",
    fontSize: 16,
    fontWeight: "900",
  },

  purchaseRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 58,
  },

  purchaseName: {
    color: "white",
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 4,
  },

  purchaseValue: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "700",
  },

  purchaseNumber: {
    color: "#FFB703",
    fontSize: 21,
    fontWeight: "900",
  },

  menuButton: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 52,
  },

  menuIcon: {
    width: 38,
    fontSize: 22,
  },

  menuText: {
    flex: 1,
    color: "white",
    fontSize: 15,
    fontWeight: "800",
  },

  menuArrow: {
    color: "#CBD5E1",
    fontSize: 28,
    fontWeight: "400",
  },

  logoutButton: {
    backgroundColor: "#DC2626",
    minHeight: 58,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },

  logoutButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "900",
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  footerText: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 25,
  },
});