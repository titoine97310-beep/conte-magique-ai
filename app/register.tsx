import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import {
  addStories,
  createUserProfile,
  getUserProfile,
  updateLastLogin,
} from "../services/userService";

import {
  setUserMode,
} from "../services/usageService";

import { auth } from "../services/firebase";

type AuthMode = "login" | "register";

export default function RegisterScreen() {
  const params = useLocalSearchParams<{
    mode?: string | string[];
  }>();

  const requestedMode = Array.isArray(params.mode)
    ? params.mode[0]
    : params.mode;

  const [mode, setMode] = useState<AuthMode>(
    requestedMode === "register" ? "register" : "login"
  );

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [acceptedCGU, setAcceptedCGU] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const isLogin = mode === "login";

  function cleanEmail() {
    return email.trim().toLowerCase();
  }

  function getFirebaseErrorMessage(errorCode?: string) {
    switch (errorCode) {
      case "auth/invalid-email":
        return "L’adresse e-mail n’est pas valide.";

      case "auth/missing-password":
        return "Entre ton mot de passe.";

      case "auth/weak-password":
        return "Le mot de passe doit contenir au moins 6 caractères.";

      case "auth/email-already-in-use":
        return "Un compte existe déjà avec cette adresse e-mail.";

      case "auth/invalid-credential":
        return "L’adresse e-mail ou le mot de passe est incorrect.";

      case "auth/user-not-found":
        return "Aucun compte ne correspond à cette adresse e-mail.";

      case "auth/wrong-password":
        return "Le mot de passe est incorrect.";

      case "auth/too-many-requests":
        return "Trop de tentatives. Réessaie dans quelques minutes.";

      case "auth/network-request-failed":
        return "Problème de connexion Internet.";

      default:
        return isLogin
          ? "Impossible de se connecter."
          : "Impossible de créer le compte.";
    }
  }

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert(
        "Informations manquantes",
        "Entre ton adresse e-mail et ton mot de passe."
      );
      return;
    }

    try {
      setLoading(true);

      const credential = await signInWithEmailAndPassword(
        auth,
        cleanEmail(),
        password
      );

      await setUserMode();
      await updateLastLogin(credential.user.uid);

      const profile = await getUserProfile(credential.user.uid);
      const textRemaining = profile?.packs?.text?.storiesRemaining ?? 0;
      const illustratedRemaining =
        profile?.packs?.illustrated?.storiesRemaining ?? 0;

      if (profile?.role === "admin" || textRemaining > 0 || illustratedRemaining > 0) {
        router.replace("/create-story");
      } else {
        router.replace("/premium");
      }
    } catch (error: any) {
      console.log("Erreur connexion :", error);

      Alert.alert(
        "Connexion impossible",
        getFirebaseErrorMessage(error?.code)
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister() {
    if (!name.trim() || !email.trim() || !password) {
      Alert.alert("Informations manquantes", "Remplis tous les champs.");
      return;
    }

    if (password.length < 6) {
      Alert.alert(
        "Mot de passe trop court",
        "Le mot de passe doit contenir au moins 6 caractères."
      );
      return;
    }

    if (!acceptedCGU) {
      Alert.alert(
        "Validation requise",
        "Tu dois accepter les CGU et la politique de confidentialité."
      );
      return;
    }

    try {
      setLoading(true);

      const credential =
  await createUserWithEmailAndPassword(
    auth,
    cleanEmail(),
    password
  );

await updateProfile(credential.user, {
  displayName: name.trim(),
});

await createUserProfile({
  uid: credential.user.uid,
  displayName: name.trim(),
  email: credential.user.email ?? cleanEmail(),
});

await setUserMode();

await addStories(
  credential.user.uid,
  "text",
  2,
  false
);

Alert.alert(
  "Bienvenue 🎁",
  "Ton compte est prêt et tu as reçu 2 histoires texte gratuites. Tu peux aussi acheter un carnet dès maintenant.",
  [
    {
      text: "Créer une histoire",
      onPress: () => router.replace("/create-story"),
    },
    {
      text: "Voir les carnets",
      onPress: () => router.replace("/premium"),
    },
  ],
  { cancelable: false }
);
    } catch (error: any) {
      console.log("Erreur inscription :", error);

      Alert.alert(
        "Création impossible",
        getFirebaseErrorMessage(error?.code)
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleContinue() {
    if (loading) return;

    if (isLogin) {
      await handleLogin();
    } else {
      await handleRegister();
    }
  }

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setPassword("");
    setShowPassword(false);
  }

  return (
    <LinearGradient
      colors={["#111827", "#312E81"]}
      style={styles.container}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.replace("/")}
            disabled={loading}
          >
            <Text style={styles.backText}>← Accueil</Text>
          </TouchableOpacity>

          <Text style={styles.title}>
            {isLogin ? "Bon retour ✨" : "Crée ton compte ✨"}
          </Text>

          <Text style={styles.subtitle}>
            {isLogin
              ? "Connecte-toi pour continuer l’aventure"
              : "Rejoins l’univers de ConteMagiqueIA"}
          </Text>

          <View style={styles.modeContainer}>
            <TouchableOpacity
              style={[
                styles.modeButton,
                isLogin && styles.modeButtonActive,
              ]}
              onPress={() => changeMode("login")}
              disabled={loading}
            >
              <Text
                style={[
                  styles.modeText,
                  isLogin && styles.modeTextActive,
                ]}
              >
                Se connecter
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeButton,
                !isLogin && styles.modeButtonActive,
              ]}
              onPress={() => changeMode("register")}
              disabled={loading}
            >
              <Text
                style={[
                  styles.modeText,
                  !isLogin && styles.modeTextActive,
                ]}
              >
                Créer un compte
              </Text>
            </TouchableOpacity>
          </View>

          {!isLogin && (
            <TextInput
              style={styles.input}
              placeholder="Prénom"
              placeholderTextColor="#999"
              value={name}
              onChangeText={setName}
              editable={!loading}
              autoCapitalize="words"
            />
          )}

          <TextInput
            style={styles.input}
            placeholder="Adresse e-mail"
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
            editable={!loading}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />

          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Mot de passe"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              editable={!loading}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              disabled={loading}
            >
              <Text style={styles.eyeText}>
                {showPassword ? "🙈" : "👁️"}
              </Text>
            </TouchableOpacity>
          </View>

          {isLogin && (
            <TouchableOpacity
              onPress={() => router.push("/forgot-password" as any)}
              disabled={loading}
            >
              <Text style={styles.forgotPassword}>
                Mot de passe oublié ?
              </Text>
            </TouchableOpacity>
          )}

          {!isLogin && (
            <>
              <TouchableOpacity
                style={styles.cguRow}
                onPress={() => setAcceptedCGU(!acceptedCGU)}
                disabled={loading}
              >
                <Text style={styles.checkbox}>
                  {acceptedCGU ? "☑️" : "⬜"}
                </Text>

                <Text style={styles.cguText}>
                  J’accepte les CGU et la politique de confidentialité
                </Text>
              </TouchableOpacity>

              <View style={styles.legalLinks}>
                <TouchableOpacity
                  onPress={() => router.push("/cgu")}
                  disabled={loading}
                >
                  <Text style={styles.link}>Lire les CGU</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.push("/privacy")}
                  disabled={loading}
                >
                  <Text style={styles.link}>
                    Politique de confidentialité
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#111" />
            ) : (
              <Text style={styles.buttonText}>
                {isLogin ? "Se connecter" : "Créer mon compte"}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchButton}
            onPress={() =>
              changeMode(isLogin ? "register" : "login")
            }
            disabled={loading}
          >
            <Text style={styles.switchText}>
              {isLogin
                ? "Pas encore de compte ? "
                : "Tu as déjà un compte ? "}
              <Text style={styles.switchTextImportant}>
                {isLogin ? "Créer un compte" : "Se connecter"}
              </Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  keyboardView: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },

  backButton: {
    alignSelf: "flex-start",
    marginBottom: 24,
  },

  backText: {
    color: "#CBD5E1",
    fontSize: 15,
    fontWeight: "800",
  },

  title: {
    color: "white",
    fontSize: 34,
    fontWeight: "900",
    marginBottom: 10,
  },

  subtitle: {
    color: "#DDD",
    fontSize: 16,
    marginBottom: 24,
  },

  modeContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 16,
    padding: 4,
    marginBottom: 22,
  },

  modeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 13,
    alignItems: "center",
  },

  modeButtonActive: {
    backgroundColor: "#FFB703",
  },

  modeText: {
    color: "#CBD5E1",
    fontSize: 14,
    fontWeight: "900",
    textAlign: "center",
  },

  modeTextActive: {
    color: "#111",
  },

  input: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    fontSize: 16,
    color: "#111",
  },

  passwordContainer: {
    backgroundColor: "white",
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },

  passwordInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: "#111",
  },

  eyeText: {
    fontSize: 22,
    paddingLeft: 10,
  },

  forgotPassword: {
    color: "#FFB703",
    textAlign: "right",
    marginBottom: 20,
    fontWeight: "800",
  },

  cguRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 14,
  },

  checkbox: {
    fontSize: 22,
    marginRight: 10,
  },

  cguText: {
    color: "white",
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },

  legalLinks: {
    marginBottom: 8,
  },

  link: {
    color: "#FFB703",
    fontWeight: "800",
    marginBottom: 10,
  },

  button: {
    backgroundColor: "#FFB703",
    minHeight: 58,
    paddingHorizontal: 18,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },

  buttonDisabled: {
    opacity: 0.65,
  },

  buttonText: {
    color: "#111",
    fontWeight: "900",
    fontSize: 16,
  },

  switchButton: {
    marginTop: 24,
    alignItems: "center",
    padding: 8,
  },

  switchText: {
    color: "#CBD5E1",
    fontSize: 14,
    textAlign: "center",
  },

  switchTextImportant: {
    color: "#FFB703",
    fontWeight: "900",
  },
});