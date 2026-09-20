import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
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

const MAGIC_CREATE = require("../assets/images/magic-create.png");
const MAGIC_STORIES = require("../assets/images/magic-stories.png");
const MAGIC_VIDEOS = require("../assets/images/magic-videos.png");

type SparkleBurstProps = {
  burstKey: number;
};

const PARTICLES = [
  { x: -86, y: -30, size: 5 },
  { x: -68, y: 24, size: 3 },
  { x: -50, y: -46, size: 4 },
  { x: -32, y: 38, size: 5 },
  { x: -14, y: -52, size: 3 },
  { x: 4, y: 44, size: 4 },
  { x: 20, y: -48, size: 5 },
  { x: 38, y: 34, size: 3 },
  { x: 54, y: -38, size: 4 },
  { x: 70, y: 22, size: 5 },
  { x: 86, y: -22, size: 3 },
  { x: -78, y: 5, size: 4 },
  { x: -42, y: -8, size: 3 },
  { x: -8, y: 8, size: 5 },
  { x: 28, y: -10, size: 3 },
  { x: 62, y: 4, size: 4 },
  { x: -58, y: 48, size: 3 },
  { x: 48, y: 48, size: 3 },
];

function SparkleBurst({ burstKey }: SparkleBurstProps) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (burstKey === 0) return;

    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 520,
      useNativeDriver: true,
    }).start();
  }, [burstKey, progress]);

  if (burstKey === 0) return null;

  return (
    <View pointerEvents="none" style={styles.sparkleLayer}>
      {PARTICLES.map((particle, index) => {
        const translateX = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, particle.x],
        });
        const translateY = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, particle.y],
        });
        const opacity = progress.interpolate({
          inputRange: [0, 0.18, 0.72, 1],
          outputRange: [0, 1, 0.8, 0],
        });
        const scale = progress.interpolate({
          inputRange: [0, 0.25, 1],
          outputRange: [0.2, 1.15, 0.35],
        });

        return (
          <Animated.View
            key={`${burstKey}-${index}`}
            style={[
              styles.sparkle,
              {
                width: particle.size,
                height: particle.size,
                borderRadius: particle.size,
                opacity,
                transform: [{ translateX }, { translateY }, { scale }],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

export default function HomeScreen() {
  const [loadingIntro, setLoadingIntro] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [language, setLanguage] = useState<AppLanguage>("fr");
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [helpModalVisible, setHelpModalVisible] = useState(false);
  const [createBurst, setCreateBurst] = useState(0);
  const [storiesBurst, setStoriesBurst] = useState(0);
  const [videosBurst, setVideosBurst] = useState(0);

  const t = getTranslations(language);

  useEffect(() => {
    const timeout = setTimeout(() => setLoadingIntro(false), 2200);
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
    void initializeLanguage();
  }, []);

  async function changeLanguage(newLanguage: AppLanguage) {
    setLanguage(newLanguage);
    await saveLanguage(newLanguage);
    setLanguageModalVisible(false);
  }

  function handleAccountPress() {
    if (user) router.push("/account" as any);
    else router.push("/register");
  }

  function getFirstName() {
    const displayName = user?.displayName?.trim();
    if (!displayName) return "";
    return displayName.split(" ")[0];
  }

  function magicalNavigate(
    destination: string,
    setBurst: React.Dispatch<React.SetStateAction<number>>
  ) {
    setBurst((value) => value + 1);
    setTimeout(() => router.push(destination as any), 250);
  }

  if (loadingIntro) {
    return (
      <LinearGradient
        colors={["#020617", "#17174A", "#312E81"]}
        style={styles.introContainer}
      >
        <Image
          source={require("../assets/images/magico.png")}
          style={styles.introLogo}
          resizeMode="contain"
        />
        <Text style={styles.introTitle}>{t.common.appName}</Text>
        <Text style={styles.introSubtitle}>{t.home.introSubtitle}</Text>
        <Text style={styles.introStars}>✦  ✨  ✦</Text>
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
      colors={["#121542", "#29246D", "#11133C", "#070B24"]}
      locations={[0, 0.38, 0.72, 1]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topBar}>
            <View style={styles.brandRow}>
              <Image
                source={require("../assets/images/icon.png")}
                style={styles.smallLogo}
                resizeMode="contain"
              />
              <Text style={styles.brandName}>{t.common.appName}</Text>
            </View>

            <TouchableOpacity
              style={styles.languageButton}
              onPress={() => setLanguageModalVisible(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.languageButtonText}>
                🌐 {getLanguageFlag(language)}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.heroSection}>
            <View style={styles.heroTextBlock}>
              <Text style={styles.helloText}>
                {user && getFirstName()
                  ? `${t.home.hello} ${getFirstName()} 👋`
                  : `${t.home.hello} 👋`}
              </Text>
              <Text style={styles.heroSubtitle}>
                {language === "fr"
                  ? "Prêt pour une nouvelle aventure ?"
                  : language === "en"
                    ? "Ready for a new adventure?"
                    : "¿Listo para una nueva aventura?"}
              </Text>
            </View>

            <View style={styles.magicoWrap}>
              <Text style={[styles.decorStar, styles.decorStarOne]}>✦</Text>
              <Text style={[styles.decorStar, styles.decorStarTwo]}>✧</Text>
              <Text style={[styles.decorStar, styles.decorStarThree]}>✦</Text>
              <Image
                source={require("../assets/images/magico.png")}
                style={styles.magicoImage}
                resizeMode="contain"
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.createButton}
            activeOpacity={0.86}
            onPress={() =>
              magicalNavigate("/create-story", setCreateBurst)
            }
          >
            <SparkleBurst burstKey={createBurst} />
            <View style={styles.createIconWrap}>
              <Image source={MAGIC_CREATE} style={styles.createMagicImage} resizeMode="contain" />
            </View>
            <View style={styles.createTextWrap}>
              <Text style={styles.createTitle}>{t.home.createStory}</Text>
              <Text style={styles.createCaption}>
                {language === "fr"
                  ? "Avec l’aide de Magico ✨"
                  : language === "en"
                    ? "With Magico’s help ✨"
                    : "Con la ayuda de Magico ✨"}
              </Text>
            </View>
            <View style={styles.goldArrowCircle}>
              <Text style={styles.goldArrow}>›</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.cardsRow}>
            <TouchableOpacity
              style={styles.libraryCardTouch}
              activeOpacity={0.86}
              onPress={() =>
                magicalNavigate("/saved-stories", setStoriesBurst)
              }
            >
              <LinearGradient
                colors={["#7A16C9", "#3C1A9B", "#24105F"]}
                style={styles.libraryCard}
              >
                <SparkleBurst burstKey={storiesBurst} />
                <View style={styles.magicIconHalo}>
                  <Image
                    source={MAGIC_STORIES}
                    style={styles.cardMagicImage}
                    resizeMode="contain"
                  />
                </View>
                <Text style={styles.cardTitle}>{t.home.savedStories}</Text>
                <Text style={styles.cardCaption}>
                  {language === "fr"
                    ? "Retrouve toutes tes aventures"
                    : language === "en"
                      ? "Find all your adventures"
                      : "Encuentra todas tus aventuras"}
                </Text>
                <View style={styles.cardArrowCircle}>
                  <Text style={styles.cardArrow}>›</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.libraryCardTouch}
              activeOpacity={0.86}
              onPress={() =>
                magicalNavigate("/saved-videos", setVideosBurst)
              }
            >
              <LinearGradient
                colors={["#0759C7", "#123F9E", "#17256D"]}
                style={styles.libraryCard}
              >
                <SparkleBurst burstKey={videosBurst} />
                <View style={styles.magicIconHalo}>
                  <Image
                    source={MAGIC_VIDEOS}
                    style={styles.cardMagicImage}
                    resizeMode="contain"
                  />
                </View>
                <Text style={styles.cardTitle}>
                  {String(t.home.savedVideos).replace(/^🎬\s*/u, "")}
                </Text>
                <Text style={styles.cardCaption}>
                  {language === "fr"
                    ? "Tes histoires en dessins animés"
                    : language === "en"
                      ? "Your stories as animated videos"
                      : "Tus historias en dibujos animados"}
                </Text>
                <View style={styles.cardArrowCircle}>
                  <Text style={styles.cardArrow}>›</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.premiumTouch}
            activeOpacity={0.86}
            onPress={() => router.push("/premium" as any)}
          >
            <LinearGradient
              colors={["#2A174F", "#5D168D", "#24135D"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.premiumCard}
            >
              <Text style={styles.premiumCrown}>👑</Text>
              <View style={styles.premiumTextWrap}>
                <Text style={styles.premiumTitle}>
                  {language === "fr"
                    ? "Découvrir Premium"
                    : language === "en"
                      ? "Discover Premium"
                      : "Descubrir Premium"}
                </Text>
                <Text style={styles.premiumCaption}>
                  {language === "fr"
                    ? "Encore plus de magie ✨"
                    : language === "en"
                      ? "Even more magic ✨"
                      : "Aún más magia ✨"}
                </Text>
              </View>
              <View style={styles.premiumArrowCircle}>
                <Text style={styles.premiumArrow}>›</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.accountCard, checkingAuth && styles.buttonDisabled]}
            onPress={handleAccountPress}
            disabled={checkingAuth}
            activeOpacity={0.86}
          >
            <View style={styles.accountIconCircle}>
              <Text style={styles.accountIcon}>{user ? "👤" : "🔐"}</Text>
            </View>
            {checkingAuth ? (
              <ActivityIndicator color="#FFCF4A" />
            ) : (
              <Text style={styles.accountText}>
                {user
                  ? t.home.account
                  : String(t.home.login).replace(/^🔐\s*/u, "")}
              </Text>
            )}
            <Text style={styles.accountArrow}>›</Text>
          </TouchableOpacity>

          <View style={styles.quickActionsRow}>
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => setLanguageModalVisible(true)}
            >
              <Text style={styles.quickIcon}>🌐</Text>
              <Text style={styles.quickText}>{getLanguageFlag(language)}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => setHelpModalVisible(true)}
            >
              <Text style={styles.quickIcon}>?</Text>
              <Text style={styles.quickText}>ⓘ</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footerMagic}>
            <Text style={styles.footerStars}>✦  ✨  ✦</Text>
            <Text style={styles.footerText}>{t.home.introSubtitle}</Text>
          </View>
        </ScrollView>

        <Modal
          visible={languageModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setLanguageModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>{t.home.chooseLanguage}</Text>

              <TouchableOpacity
                style={styles.languageOption}
                onPress={() => changeLanguage("fr")}
              >
                <Text style={styles.languageOptionText}>🇫🇷 {t.languages.fr}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.languageOption}
                onPress={() => changeLanguage("en")}
              >
                <Text style={styles.languageOptionText}>🇬🇧 {t.languages.en}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.languageOption}
                onPress={() => changeLanguage("es")}
              >
                <Text style={styles.languageOptionText}>🇪🇸 {t.languages.es}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setLanguageModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
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
              <Text style={styles.helpTitle}>{t.home.helpTitle}</Text>

              <Text style={styles.helpSectionTitle}>{t.home.helpCreateTitle}</Text>
              <Text style={styles.helpText}>{t.home.helpCreateText}</Text>

              <Text style={styles.helpSectionTitle}>
                {t.home.helpIllustratedTitle}
              </Text>
              <Text style={styles.helpText}>{t.home.helpIllustratedText}</Text>

              <View style={styles.helpImportant}>
                <Text style={styles.helpSectionTitle}>{t.home.helpVideoTitle}</Text>
                <Text style={styles.helpText}>{t.home.helpVideoText}</Text>
              </View>

              <Text style={styles.helpSectionTitle}>{t.home.helpSavedTitle}</Text>
              <Text style={styles.helpText}>{t.home.helpSavedText}</Text>

              <Text style={styles.helpSectionTitle}>{t.home.helpAudioTitle}</Text>
              <Text style={styles.helpText}>{t.home.helpAudioText}</Text>

              <Text style={styles.helpSectionTitle}>{t.home.helpLanguageTitle}</Text>
              <Text style={styles.helpText}>{t.home.helpLanguageText}</Text>

              <TouchableOpacity
                style={styles.helpUnderstoodButton}
                onPress={() => setHelpModalVisible(false)}
              >
                <Text style={styles.helpUnderstoodText}>{t.home.helpUnderstood}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 34 },

  introContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
    overflow: "hidden",
  },
  introLogo: { width: 250, height: 250, marginBottom: 8 },
  introTitle: { color: "white", fontSize: 34, fontWeight: "900", marginBottom: 10 },
  introSubtitle: { color: "#E6E7FF", fontSize: 16, textAlign: "center", lineHeight: 23 },
  introStars: { color: "#FFD45C", fontSize: 22, marginTop: 18, letterSpacing: 8 },
  introLoader: { marginTop: 22 },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  brandRow: { flexDirection: "row", alignItems: "center", flexShrink: 1 },
  smallLogo: { width: 54, height: 54, borderRadius: 14, marginRight: 10 },
  brandName: { color: "white", fontSize: 22, fontWeight: "900", flexShrink: 1 },
  languageButton: {
    backgroundColor: "rgba(64,55,145,0.72)",
    borderWidth: 1.2,
    borderColor: "rgba(255,202,74,0.65)",
    borderRadius: 22,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  languageButtonText: { color: "white", fontSize: 15, fontWeight: "900" },

  heroSection: {
    minHeight: 220,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    overflow: "visible",
  },
  heroTextBlock: { width: "48%", zIndex: 2 },
  helloText: { color: "white", fontSize: 29, lineHeight: 35, fontWeight: "900", marginBottom: 8 },
  heroSubtitle: { color: "#E6E7FF", fontSize: 15, lineHeight: 21 },
  magicoWrap: {
    width: "58%",
    height: 215,
    marginLeft: -2,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 12,
    overflow: "visible",
  },
  magicoImage: { width: 205, height: 205 },
  decorStar: { position: "absolute", color: "#FFD45C", zIndex: 3 },
  decorStarOne: { fontSize: 24, top: 15, left: 16 },
  decorStarTwo: { fontSize: 18, top: 62, right: 8 },
  decorStarThree: { fontSize: 15, bottom: 22, left: 8 },

  createButton: {
    minHeight: 104,
    backgroundColor: "#FFC13D",
    borderRadius: 30,
    paddingHorizontal: 17,
    flexDirection: "row",
    alignItems: "center",
    overflow: "visible",
    borderWidth: 1.5,
    borderColor: "#FFE08A",
    shadowColor: "#FFB703",
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 8,
    marginBottom: 16,
  },
  createIconWrap: {
    width: 86,
    height: 92,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -4,
  },
  createMagicImage: {
    width: 92,
    height: 92,
  },
  createTextWrap: { flex: 1, paddingHorizontal: 8 },
  createTitle: { color: "#171533", fontSize: 22, fontWeight: "900" },
  createCaption: { color: "#4B3672", fontSize: 13, fontWeight: "800", marginTop: 4 },
  goldArrowCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(130,78,10,0.24)",
    alignItems: "center",
    justifyContent: "center",
  },
  goldArrow: { color: "white", fontSize: 34, lineHeight: 36, marginTop: -2 },

  cardsRow: { flexDirection: "row", gap: 12, marginBottom: 14 },
  libraryCardTouch: { flex: 1, borderRadius: 26 },
  libraryCard: {
    minHeight: 176,
    borderRadius: 26,
    borderWidth: 1.3,
    borderColor: "rgba(166,145,255,0.72)",
    padding: 14,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  magicIconHalo: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 90,
  },
  cardMagicImage: {
    width: 118,
    height: 108,
  },
  cardMiniStars: { color: "#FFD45C", fontSize: 12, letterSpacing: 4, marginTop: 2 },
  cardTitle: { color: "white", fontSize: 18, fontWeight: "900", textAlign: "left" },
  cardCaption: { color: "#DDD9FF", fontSize: 11, lineHeight: 15, marginTop: 3, paddingRight: 26 },
  cardArrowCircle: {
    position: "absolute",
    right: 10,
    bottom: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.2,
    borderColor: "rgba(255,255,255,0.55)",
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardArrow: { color: "white", fontSize: 27, lineHeight: 29, marginTop: -2 },

  premiumTouch: { borderRadius: 22, marginBottom: 12 },
  premiumCard: {
    minHeight: 72,
    borderRadius: 22,
    borderWidth: 1.4,
    borderColor: "#F0B84A",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    overflow: "hidden",
  },
  premiumCrown: { fontSize: 38, marginRight: 12 },
  premiumTextWrap: { flex: 1 },
  premiumTitle: { color: "#FFD45C", fontSize: 17, fontWeight: "900" },
  premiumCaption: { color: "#E8E4FF", fontSize: 12, marginTop: 2 },
  premiumArrowCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.2,
    borderColor: "rgba(255,255,255,0.5)",
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  premiumArrow: { color: "white", fontSize: 29, lineHeight: 31, marginTop: -2 },

  accountCard: {
    minHeight: 66,
    borderRadius: 22,
    backgroundColor: "rgba(38,35,102,0.78)",
    borderWidth: 1,
    borderColor: "rgba(155,143,255,0.42)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  accountIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,183,3,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  accountIcon: { fontSize: 22 },
  accountText: { flex: 1, color: "white", fontSize: 16, fontWeight: "900" },
  accountArrow: { color: "#D7D2FF", fontSize: 30 },
  buttonDisabled: { opacity: 0.6 },

  quickActionsRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  quickAction: {
    flex: 1,
    minHeight: 58,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.13)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  quickIcon: { color: "white", fontSize: 20, fontWeight: "900" },
  quickText: { color: "#E9E7FF", fontSize: 14, fontWeight: "800" },

  footerMagic: { alignItems: "center", paddingTop: 2, paddingBottom: 4 },
  footerStars: { color: "#FFD45C", fontSize: 17, letterSpacing: 5, marginBottom: 5 },
  footerText: { color: "#BFC2E8", fontSize: 12, textAlign: "center" },

  sparkleLayer: {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: 1,
    height: 1,
    zIndex: 50,
  },
  sparkle: {
    position: "absolute",
    backgroundColor: "#FFF3B0",
    shadowColor: "#FFD23F",
    shadowOpacity: 1,
    shadowRadius: 5,
    elevation: 8,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#171747",
    borderRadius: 26,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255,202,74,0.28)",
  },
  modalTitle: { color: "white", fontSize: 22, fontWeight: "900", textAlign: "center", marginBottom: 20 },
  languageOption: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: 12,
  },
  languageOptionText: { color: "white", fontSize: 18, fontWeight: "800" },
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
  closeButtonText: { color: "white", fontSize: 20, fontWeight: "900" },

  helpModalCard: {
    width: "100%",
    maxWidth: 390,
    maxHeight: "85%",
    backgroundColor: "#171747",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,202,74,0.25)",
  },
  helpModalContent: { padding: 22 },
  helpTitle: { color: "#FFCA4A", fontSize: 22, fontWeight: "900", textAlign: "center", marginBottom: 18 },
  helpSectionTitle: { color: "white", fontSize: 16, fontWeight: "900", marginBottom: 4 },
  helpText: { color: "#CBD5E1", fontSize: 14, lineHeight: 20, marginBottom: 12 },
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
  helpUnderstoodText: { color: "#111827", fontSize: 16, fontWeight: "900" },
});
