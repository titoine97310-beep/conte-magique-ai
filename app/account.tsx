import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import {
  deleteUser,
  onAuthStateChanged,
  signOut,
  type User,
} from "firebase/auth";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import * as Application from "expo-application";
import { auth } from "../services/firebase";
import {
  deleteUserProfile,
  getUserProfile,
  updateUserDisplayName,
} from "../services/userService";
import type { UserProfile } from "../types/user";

export default function AccountScreen() {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);

  const [displayNameInput, setDisplayNameInput] = useState("");

  const [savingDisplayName, setSavingDisplayName] = useState(false);

  const appVersion = Application.nativeApplicationVersion ?? "1.0.0";
const buildVersion = Application.nativeBuildVersion ?? "-";

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

function openEditDisplayNameModal() {
  setDisplayNameInput(
    profile?.displayName ||
      user?.displayName ||
      ""
  );

  setEditModalVisible(true);
}

function closeEditDisplayNameModal() {
  if (savingDisplayName) {
    return;
  }

  setEditModalVisible(false);
  setDisplayNameInput("");
}

async function handleSaveDisplayName() {
  const currentUser = auth.currentUser;
  const cleanedDisplayName = displayNameInput.trim();

  if (!currentUser) {
    Alert.alert(
      "Erreur",
      "Ton compte utilisateur est introuvable."
    );
    return;
  }

  if (!cleanedDisplayName) {
    Alert.alert(
      "Nom obligatoire",
      "Entre un nom avant d’enregistrer."
    );
    return;
  }

  try {
    setSavingDisplayName(true);

    await updateUserDisplayName(
      currentUser.uid,
      cleanedDisplayName
    );

    setProfile((currentProfile) => {
      if (!currentProfile) {
        return currentProfile;
      }

      return {
        ...currentProfile,
        displayName: cleanedDisplayName,
      };
    });

    setEditModalVisible(false);
    setDisplayNameInput("");

    Alert.alert(
      "Nom modifié",
      "Ton nom affiché a bien été enregistré."
    );
  } catch (error) {
    console.log(
      "Erreur modification du nom :",
      error
    );

    Alert.alert(
      "Erreur",
      "Impossible de modifier ton nom pour le moment."
    );
  } finally {
    setSavingDisplayName(false);
  }
}

  const handleContact = async () => {
  const email = "contact@contemagiqueia.fr";
  const subject = encodeURIComponent("Support ConteMagiqueIA");
  const body = encodeURIComponent(
    "Bonjour,\n\nJe vous contacte au sujet de l'application ConteMagiqueIA.\n\n"
  );

  const url = `mailto:${email}?subject=${subject}&body=${body}`;

  try {
    const supported = await Linking.canOpenURL(url);

    if (!supported) {
      Alert.alert(
        "Application de messagerie indisponible",
        `Tu peux nous contacter à l'adresse : ${email}`
      );
      return;
    }

    await Linking.openURL(url);
  } catch (error) {
    console.error("Erreur lors de l'ouverture de la messagerie :", error);

    Alert.alert(
      "Une erreur est survenue",
      `Tu peux nous contacter à l'adresse : ${email}`
    );
  }
};

  const handleDeleteAccount = () => {
  Alert.alert(
    "Supprimer mon compte",
    "Cette action est définitive.\n\nTon profil et les données liées à ton compte seront supprimés.\n\nVeux-tu vraiment continuer ?",
    [
      {
        text: "Annuler",
        style: "cancel",
      },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          const currentUser = auth.currentUser;

          if (!currentUser) {
            Alert.alert(
              "Erreur",
              "Aucun utilisateur connecté n’a été trouvé."
            );
            return;
          }

          try {
            setDeletingAccount(true);

            const uid = currentUser.uid;

            // 1. Suppression du profil Firestore
            await deleteUserProfile(uid);

            // 2. Suppression du compte Firebase Auth
            await deleteUser(currentUser);

            // 3. Retour à l’accueil
            router.replace("/");
          } catch (error: any) {
            console.error(
              "Erreur lors de la suppression du compte :",
              error
            );

            if (error?.code === "auth/requires-recent-login") {
              Alert.alert(
                "Reconnexion nécessaire",
                "Pour des raisons de sécurité, déconnecte-toi puis reconnecte-toi avant de supprimer ton compte."
              );
              return;
            }

            Alert.alert(
              "Erreur",
              "La suppression du compte n’a pas pu être terminée."
            );
          } finally {
            setDeletingAccount(false);
          }
        },
      },
    ]
  );
};

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
  profile?.packs?.text?.storiesRemaining ?? 0;

const illustratedStoriesRemaining =
  profile?.packs?.illustrated?.storiesRemaining ?? 0;

const textPurchases =
  profile?.packs?.text?.purchases ?? 0;

const illustratedPurchases =
  profile?.packs?.illustrated?.purchases ?? 0;

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

  <View style={styles.card}>
  <Text style={styles.cardTitle}>
    Mes carnets
  </Text>

  <View style={styles.infoRow}>
    <View style={styles.infoIcon}>
      <Text style={styles.infoIconText}>👤</Text>
    </View>

    <View style={styles.infoContent}>
      <Text style={styles.infoLabel}>Nom affiché</Text>

      <Text style={styles.infoValue}>
        {getDisplayName()}
      </Text>

      <TouchableOpacity
        onPress={openEditDisplayNameModal}
        disabled={loggingOut}
        style={styles.editNameButton}
      >
        <Text style={styles.editNameButtonText}>
          Modifier
        </Text>
      </TouchableOpacity>
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
          <View style={styles.separator} />

<TouchableOpacity
  style={styles.menuButton}
  onPress={handleContact}
  disabled={loggingOut}
>
  <Text style={styles.menuIcon}>📧</Text>

  <View style={styles.menuTextContainer}>
    <Text style={styles.menuText}>
      Nous contacter
    </Text>

    <Text style={styles.menuSubText}>
      contact@contemagiqueia.fr
    </Text>
  </View>

  <Text style={styles.menuArrow}>›</Text>
</TouchableOpacity>
        </View>

        <TouchableOpacity
  style={[
    styles.deleteAccountButton,
    deletingAccount && styles.buttonDisabled,
  ]}
  onPress={handleDeleteAccount}
  disabled={loggingOut || deletingAccount}
>
  {deletingAccount ? (
    <ActivityIndicator color="#FCA5A5" />
  ) : (
    <Text style={styles.deleteAccountButtonText}>
      🗑️ Supprimer mon compte
    </Text>
  )}
</TouchableOpacity>

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

                <View style={styles.footerContainer}>
  <Text style={styles.footerText}>
    ConteMagiqueIA ✨
  </Text>

  <Text style={styles.footerVersion}>
    Version {appVersion} ({buildVersion})
  </Text>

  <Text style={styles.footerCopyright}>
    © 2026 ConteMagiqueIA
  </Text>
</View>
      </ScrollView>

      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeEditDisplayNameModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>
              Modifier mon nom
            </Text>

            <TextInput
              style={styles.modalInput}
              value={displayNameInput}
              onChangeText={setDisplayNameInput}
              placeholder="Ton nom affiché"
              placeholderTextColor="#94A3B8"
              autoCapitalize="words"
              editable={!savingDisplayName}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={closeEditDisplayNameModal}
                disabled={savingDisplayName}
              >
                <Text style={styles.cancelButtonText}>
                  Annuler
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveDisplayName}
                disabled={savingDisplayName}
              >
                {savingDisplayName ? (
                  <ActivityIndicator color="#111827" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    Enregistrer
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  editNameButton: {
  alignSelf: "flex-start",
  marginTop: 8,
  paddingHorizontal: 12,
  paddingVertical: 6,
  backgroundColor: "#FFB703",
  borderRadius: 10,
},

editNameButtonText: {
  color: "#111827",
  fontSize: 13,
  fontWeight: "800",
},
modalOverlay: {
  flex: 1,
  backgroundColor: "rgba(0,0,0,0.65)",
  justifyContent: "center",
  alignItems: "center",
  padding: 24,
},

modalContainer: {
  width: "100%",
  backgroundColor: "#1E293B",
  borderRadius: 22,
  padding: 22,
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.15)",
},

modalTitle: {
  color: "white",
  fontSize: 22,
  fontWeight: "900",
  marginBottom: 18,
},

modalInput: {
  backgroundColor: "rgba(255,255,255,0.08)",
  color: "white",
  borderRadius: 12,
  paddingHorizontal: 14,
  paddingVertical: 12,
  fontSize: 16,
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.15)",
},

modalButtons: {
  flexDirection: "row",
  justifyContent: "flex-end",
  marginTop: 24,
},

cancelButton: {
  paddingHorizontal: 16,
  paddingVertical: 10,
  marginRight: 10,
},

cancelButtonText: {
  color: "#CBD5E1",
  fontSize: 15,
  fontWeight: "700",
},

saveButton: {
  backgroundColor: "#FFB703",
  borderRadius: 12,
  paddingHorizontal: 18,
  paddingVertical: 10,
},

saveButtonText: {
  color: "#111827",
  fontWeight: "900",
  fontSize: 15,
},

menuTextContainer: {
  flex: 1,
},

menuSubText: {
  color: "#94A3B8",
  fontSize: 12,
  marginTop: 3,
},

footerContainer: {
  alignItems: "center",
  marginTop: 25,
  marginBottom: 30,
},

footerVersion: {
  color: "#94A3B8",
  fontSize: 13,
  marginTop: 6,
},

footerCopyright: {
  color: "#64748B",
  fontSize: 12,
  marginTop: 4,
},

deleteAccountButton: {
  marginTop: 18,
  marginBottom: 10,
  backgroundColor: "#7F1D1D",
  borderRadius: 14,
  paddingVertical: 15,
  alignItems: "center",
},

deleteAccountButtonText: {
  color: "#FCA5A5",
  fontSize: 16,
  fontWeight: "700",
},
});