import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { auth } from "../services/firebase";
import {
  getLanguageFlag,
  getTranslations,
  loadLanguage,
  saveLanguage,
  type AppLanguage,
} from "../services/languageService";

export default function HomeScreen() {
  const [loadingIntro, setLoadingIntro] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [user, setUser] = useState<User | null>(auth.currentUser);

  const [language, setLanguage] = useState<AppLanguage>("fr");
  const [languageModalVisible, setLanguageModalVisible] =
    useState(false);

const [helpModalVisible, setHelpModalVisible] =
  useState(false);

  const t = getTranslations(language);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setLoadingIntro(false);
    }, 2200);

    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setCheckingAuth(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    async function initializeLanguage() {
      const savedLanguage = await loadLanguage();
      setLanguage(savedLanguage);
    }

    initializeLanguage();
  }, []);

  async function changeLanguage(
    newLanguage: AppLanguage
  ) {
    setLanguage(newLanguage);
    await saveLanguage(newLanguage);
    setLanguageModalVisible(false);
  }

  function handleAccountPress() {
    if (user) {
      router.push("/account" as any);
    } else {
      router.push("/register");
    }
  }

  function getFirstName() {
    const displayName = user?.displayName?.trim();

    if (!displayName) {
      return "";
    }

    return displayName.split(" ")[0];
  }

  if (loadingIntro) {
    return (
      <LinearGradient
        colors={["#020617", "#111827"]}
        style={styles.introContainer}
      >
        <Image
          source={require("../assets/images/icon.png")}
          style={styles.introLogo}
          resizeMode="contain"
        />

        <Text style={styles.introTitle}>
          {t.common.appName}
        </Text>

        <Text style={styles.introSubtitle}>
          {t.home.introSubtitle}
        </Text>

        <ActivityIndicator
          size="large"
          color="#FFB703"
          style={styles.introLoader}
        />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={["#1B1B3A", "#312E81", "#020617"]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <TouchableOpacity
          style={styles.languageButton}
          onPress={() =>
            setLanguageModalVisible(true)
          }
        >
          <Text style={styles.languageButtonText}>
            🌐 {getLanguageFlag(language)}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.helpButton}
          onPress={() => setHelpModalVisible(true)}
        >
          <Text style={styles.helpButtonText}>ⓘ</Text>
        </TouchableOpacity>

        <View style={styles.content}>
          <Image
            source={require("../assets/images/icon.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />

          <Text style={styles.logo}>
            {t.common.appName}
          </Text>

          <Text style={styles.subtitle}>
            {t.home.subtitle}
          </Text>

          {user && getFirstName() ? (
            <View style={styles.welcomeContainer}>
              <Text style={styles.welcomeText}>
                {t.home.hello} {getFirstName()} 👋
              </Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() =>
              router.push("/create-story")
            }
          >
            <Text style={styles.primaryText}>
              {t.home.createStory}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() =>
              router.push("/saved-stories" as any)
            }
          >
            <Text style={styles.secondaryText}>
              {t.home.savedStories}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() =>
              router.push("/saved-videos" as any)
            }
          >
            <Text style={styles.secondaryText}>
              {t.home.savedVideos}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.accountButton,
              checkingAuth && styles.buttonDisabled,
            ]}
            onPress={handleAccountPress}
            disabled={checkingAuth}
          >
            {checkingAuth ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.accountText}>
                {user
                  ? t.home.account
                  : t.home.login}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <Modal
          visible={languageModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() =>
            setLanguageModalVisible(false)
          }
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>
                {t.home.chooseLanguage}
              </Text>

              <TouchableOpacity
                style={styles.languageOption}
                onPress={() =>
                  changeLanguage("fr")
                }
              >
                <Text
                  style={styles.languageOptionText}
                >
                  🇫🇷 {t.languages.fr}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.languageOption}
                onPress={() =>
                  changeLanguage("en")
                }
              >
                <Text
                  style={styles.languageOptionText}
                >
                  🇬🇧 {t.languages.en}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.languageOption}
                onPress={() =>
                  changeLanguage("es")
                }
              >
                <Text
                  style={styles.languageOptionText}
                >
                  🇪🇸 {t.languages.es}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={() =>
                  setLanguageModalVisible(false)
                }
              >
                <Text style={styles.closeButtonText}>
                  ✕
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal
  visible={helpModalVisible}
  transparent
  animationType="fade"
  onRequestClose={() => setHelpModalVisible(false)}
>
  <View style={styles.modalOverlay}>
    <ScrollView
  style={styles.helpModalCard}
  contentContainerStyle={styles.helpModalContent}
  showsVerticalScrollIndicator={false}
>
      <Text style={styles.helpTitle}>
        {t.home.helpTitle}
      </Text>

      <Text style={styles.helpSectionTitle}>
        {t.home.helpCreateTitle}
      </Text>
      <Text style={styles.helpText}>
        {t.home.helpCreateText}
      </Text>

      <Text style={styles.helpSectionTitle}>
        {t.home.helpIllustratedTitle}
      </Text>
      <Text style={styles.helpText}>
        {t.home.helpIllustratedText}
      </Text>

      <View style={styles.helpImportant}>
        <Text style={styles.helpSectionTitle}>
          {t.home.helpVideoTitle}
        </Text>
        <Text style={styles.helpText}>
          {t.home.helpVideoText}
        </Text>
      </View>

      <Text style={styles.helpSectionTitle}>
        {t.home.helpSavedTitle}
      </Text>
      <Text style={styles.helpText}>
        {t.home.helpSavedText}
      </Text>

      <Text style={styles.helpSectionTitle}>
        {t.home.helpAudioTitle}
      </Text>
      <Text style={styles.helpText}>
        {t.home.helpAudioText}
      </Text>

      <Text style={styles.helpSectionTitle}>
        {t.home.helpLanguageTitle}
      </Text>
      <Text style={styles.helpText}>
        {t.home.helpLanguageText}
      </Text>

      <TouchableOpacity
        style={styles.helpUnderstoodButton}
        onPress={() => setHelpModalVisible(false)}
      >
        <Text style={styles.helpUnderstoodText}>
          {t.home.helpUnderstood}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  </View>
</Modal>

      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  introContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },

  introLogo: {
    width: 180,
    height: 180,
    marginBottom: 20,
  },

  introTitle: {
    color: "white",
    fontSize: 34,
    fontWeight: "900",
    marginBottom: 10,
  },

  introSubtitle: {
    color: "#CBD5E1",
    fontSize: 16,
    textAlign: "center",
  },

  introLoader: {
    marginTop: 30,
  },

  container: {
    flex: 1,
  },

  safeArea: {
    flex: 1,
  },

  languageButton: {
    position: "absolute",
    top: 35,
    right: 18,
    zIndex: 10,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },

  languageButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "900",
  },

  content: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
  },

  logoImage: {
    width: 140,
    height: 140,
    marginBottom: 20,
  },

  logo: {
    fontSize: 38,
    fontWeight: "900",
    color: "white",
    marginBottom: 12,
    textAlign: "center",
  },

  subtitle: {
    fontSize: 18,
    color: "white",
    textAlign: "center",
    marginBottom: 22,
    lineHeight: 28,
  },

  welcomeContainer: {
    backgroundColor: "rgba(255,183,3,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,183,3,0.45)",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginBottom: 22,
  },

  welcomeText: {
    color: "#FFB703",
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
  },

  primaryButton: {
    backgroundColor: "#FFB703",
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 18,
    width: "100%",
    alignItems: "center",
    marginBottom: 14,
  },

  primaryText: {
    color: "#111",
    fontSize: 17,
    fontWeight: "900",
  },

  secondaryButton: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 18,
    width: "100%",
    alignItems: "center",
    marginBottom: 14,
  },

  secondaryText: {
    color: "white",
    fontSize: 17,
    fontWeight: "900",
  },

  accountButton: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    minHeight: 56,
    paddingHorizontal: 28,
    borderRadius: 18,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },

  accountText: {
    color: "white",
    fontSize: 17,
    fontWeight: "900",
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  modalCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#111827",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },

  modalTitle: {
    color: "white",
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 20,
  },

  languageOption: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: 12,
  },

  languageOptionText: {
    color: "white",
    fontSize: 18,
    fontWeight: "800",
  },

  closeButton: {
    alignSelf: "center",
    marginTop: 8,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },

  closeButtonText: {
    color: "white",
    fontSize: 20,
    fontWeight: "900",
  },

  helpButton: {
  position: "absolute",
  top: 35,
  left: 18,
  zIndex: 10,
  width: 42,
  height: 42,
  borderRadius: 21,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "rgba(255,255,255,0.14)",
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.25)",
},

helpButtonText: {
  color: "white",
  fontSize: 23,
  fontWeight: "900",
},

helpModalCard: {
  width: "100%",
  maxWidth: 390,
  maxHeight: "85%",
  backgroundColor: "#111827",
  borderRadius: 24,
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.15)",
},

helpModalContent: {
  padding: 22,
},

helpTitle: {
  color: "#FFB703",
  fontSize: 22,
  fontWeight: "900",
  textAlign: "center",
  marginBottom: 18,
},

helpSectionTitle: {
  color: "white",
  fontSize: 16,
  fontWeight: "900",
  marginBottom: 4,
},

helpText: {
  color: "#CBD5E1",
  fontSize: 14,
  lineHeight: 20,
  marginBottom: 12,
},

helpImportant: {
  backgroundColor: "rgba(255,183,3,0.12)",
  borderWidth: 1,
  borderColor: "rgba(255,183,3,0.35)",
  borderRadius: 14,
  padding: 12,
  marginBottom: 12,
},

helpUnderstoodButton: {
  backgroundColor: "#FFB703",
  borderRadius: 16,
  paddingVertical: 13,
  alignItems: "center",
  marginTop: 4,
},

helpUnderstoodText: {
  color: "#111827",
  fontSize: 16,
  fontWeight: "900",
},
});