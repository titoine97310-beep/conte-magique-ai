import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { useCallback, useState } from "react";
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
import { SafeAreaView } from "react-native-safe-area-context";

import { auth } from "../services/firebase";
import { setUserMode } from "../services/usageService";
import {
  addStories,
  createUserProfile,
  getUserProfile,
  updateLastLogin,
} from "../services/userService";

import {
  getTranslations,
  loadLanguage,
  type AppLanguage,
} from "../services/languageService";

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

  const isLogin = mode === "login";

  function cleanEmail() {
    return email.trim().toLowerCase();
  }

  function getFirebaseErrorMessage(errorCode?: string) {
    switch (errorCode) {
      case "auth/invalid-email":
        return t.account.invalidEmail;

      case "auth/missing-password":
        return t.account.missingPassword;

      case "auth/weak-password":
        return t.account.passwordMinLength;

      case "auth/email-already-in-use":
        return t.account.emailAlreadyUsed;

      case "auth/invalid-credential":
        return t.account.invalidCredential;

      case "auth/user-not-found":
        return t.account.userNotFound;

      case "auth/wrong-password":
        return t.account.wrongPassword;

      case "auth/too-many-requests":
        return t.account.tooManyRequests;

      case "auth/network-request-failed":
        return t.account.networkError;

      default:
        return isLogin
          ? t.account.defaultLoginError
          : t.account.defaultRegisterError;
    }
  }

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert(
        t.account.missingInfo,
        t.account.loginMissingInfo
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

      const textRemaining =
        profile?.packs?.text?.storiesRemaining ?? 0;

      const illustratedRemaining =
        profile?.packs?.illustrated?.storiesRemaining ?? 0;

      if (
        profile?.role === "admin" ||
        textRemaining > 0 ||
        illustratedRemaining > 0
      ) {
        router.replace("/create-story");
      } else {
        router.replace("/premium");
      }
    } catch (error: any) {
      console.log("Erreur connexion :", error);

      Alert.alert(
        t.account.loginImpossible,
        getFirebaseErrorMessage(error?.code)
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister() {
    if (!name.trim() || !email.trim() || !password) {
      Alert.alert(
        t.account.missingInfo,
        t.account.registerMissingInfo
      );
      return;
    }

    if (password.length < 6) {
      Alert.alert(
        t.account.passwordTooShort,
        t.account.passwordMinLength
      );
      return;
    }

    if (!acceptedCGU) {
      Alert.alert(
        t.account.validationRequired,
        t.account.legalRequired
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

        legal: {
          termsAccepted: true,
          termsVersion: "2026-08-12",

          privacyAcknowledged: true,
          privacyVersion: "2026-08-12",
        },
      });

      await setUserMode();

      await addStories(
        credential.user.uid,
        "text",
        2,
        false
      );

      Alert.alert(
        t.account.welcomeGift,
        t.account.welcomeGiftMessage,
        [
          {
            text: t.account.createStory,
            onPress: () =>
              router.replace("/create-story"),
          },
          {
            text: t.account.viewPacks,
            onPress: () =>
              router.replace("/premium"),
          },
        ],
        { cancelable: false }
      );
    } catch (error: any) {
      console.log("Erreur inscription :", error);

      Alert.alert(
        t.account.registerImpossible,
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
      <SafeAreaView style={styles.safeArea}>
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
              <Text style={styles.backText}>
                ← Accueil
              </Text>
            </TouchableOpacity>

            <Text style={styles.title}>
              {isLogin
                ? t.account.welcomeBack
                : t.account.createAccountTitle}
            </Text>

            <Text style={styles.subtitle}>
              {isLogin
                ? t.account.loginSubtitle
                : t.account.registerSubtitle}
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
                placeholder={t.account.firstName}
                placeholderTextColor="#999"
                value={name}
                onChangeText={setName}
                editable={!loading}
                autoCapitalize="words"
              />
            )}

            <TextInput
              style={styles.input}
              placeholder={t.account.email}
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
                placeholder={t.account.password}
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                editable={!loading}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <TouchableOpacity
                onPress={() =>
                  setShowPassword(!showPassword)
                }
                disabled={loading}
              >
                <Text style={styles.eyeText}>
                  {showPassword ? "🙈" : "👁️"}
                </Text>
              </TouchableOpacity>
            </View>

            {isLogin && (
              <TouchableOpacity
                onPress={() =>
                  router.push(
                    "/forgot-password" as any
                  )
                }
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
                  onPress={() =>
                    setAcceptedCGU(!acceptedCGU)
                  }
                  disabled={loading}
                >
                  <Text style={styles.checkbox}>
                    {acceptedCGU ? "☑️" : "⬜"}
                  </Text>

                  <Text style={styles.cguText}>
                    J’ai lu et j’accepte les CGU et je
                    reconnais avoir pris connaissance de la
                    politique de confidentialité
                  </Text>
                </TouchableOpacity>

                <View style={styles.legalLinks}>
                  <TouchableOpacity
                    onPress={() =>
                      router.push(
                        "/legal/cgu" as any
                      )
                    }
                    disabled={loading}
                  >
                    <Text style={styles.link}>
                      Lire les CGU
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() =>
                      router.push(
                        "/legal/privacy" as any
                      )
                    }
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
              style={[
                styles.button,
                loading && styles.buttonDisabled,
              ]}
              onPress={handleContinue}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#111" />
              ) : (
                <Text style={styles.buttonText}>
                  {isLogin
                    ? t.account.login
                    : t.account.createMyAccount}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.switchButton}
              onPress={() =>
                changeMode(
                  isLogin ? "register" : "login"
                )
              }
              disabled={loading}
            >
              <Text style={styles.switchText}>
                {isLogin
                  ? t.account.noAccount
                  : t.account.alreadyAccount}

                <Text style={styles.switchTextImportant}>
                  {isLogin
                    ? t.account.createAccount
                    : t.account.login}
                </Text>
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  safeArea: {
    flex: 1,
  },

  keyboardView: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    width: "100%",
    maxWidth: 700,
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingTop: 20,
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