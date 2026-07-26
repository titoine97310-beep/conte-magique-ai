import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function ContinueAdventureScreen() {
  function goToRegister() {
    router.push({
      pathname: "/register",
      params: {
        mode: "register",
      },
    } as any);
  }

  function goToLogin() {
    router.push({
      pathname: "/register",
      params: {
        mode: "login",
      },
    } as any);
  }

  return (
    <LinearGradient
      colors={["#111827", "#312E81", "#581C87"]}
      style={styles.container}
    >
      <StatusBar style="light" />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.replace("/")}
          >
            <Text style={styles.backText}>← Accueil</Text>
          </TouchableOpacity>

          <View style={styles.starsContainer}>
            <Text style={styles.starSmall}>✦</Text>
            <Text style={styles.starLarge}>✨</Text>
            <Text style={styles.starSmall}>✦</Text>
          </View>

          <View style={styles.giftCircle}>
            <Text style={styles.giftEmoji}>🎁</Text>
          </View>

          <Text style={styles.title}>Continue l’aventure</Text>

          <Text style={styles.subtitle}>
            Tu as découvert les premières histoires de ConteMagiqueIA.
            La magie ne fait que commencer.
          </Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Ton cadeau de bienvenue</Text>

            <Text style={styles.cardDescription}>
              Crée gratuitement ton compte et reçois ton premier carnet.
            </Text>

            <View style={styles.benefitRow}>
              <View style={styles.iconContainer}>
                <Text style={styles.benefitIcon}>📖</Text>
              </View>

              <View style={styles.benefitContent}>
                <Text style={styles.benefitTitle}>Un carnet offert</Text>
                <Text style={styles.benefitText}>
                  Commence une nouvelle collection d’aventures.
                </Text>
              </View>
            </View>

            <View style={styles.separator} />

            <View style={styles.benefitRow}>
              <View style={styles.iconContainer}>
                <Text style={styles.benefitIcon}>✨</Text>
              </View>

              <View style={styles.benefitContent}>
                <Text style={styles.benefitTitle}>2 nouvelles histoires</Text>
                <Text style={styles.benefitText}>
                  Crée deux histoires personnalisées supplémentaires.
                </Text>
              </View>
            </View>

            <View style={styles.separator} />

            <View style={styles.benefitRow}>
              <View style={styles.iconContainer}>
                <Text style={styles.benefitIcon}>💾</Text>
              </View>

              <View style={styles.benefitContent}>
                <Text style={styles.benefitTitle}>Tes histoires sauvegardées</Text>
                <Text style={styles.benefitText}>
                  Retrouve facilement les aventures que tu as créées.
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={goToRegister}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>
              Créer mon compte gratuitement
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={goToLogin}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryButtonText}>
              J’ai déjà un compte
            </Text>
          </TouchableOpacity>

          <Text style={styles.reassurance}>
            🔒 Aucune carte bancaire n’est demandée.
          </Text>
        </ScrollView>
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

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 40,
  },

  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 10,
    paddingRight: 20,
    marginBottom: 10,
  },

  backText: {
    color: "#CBD5E1",
    fontSize: 15,
    fontWeight: "800",
  },

  starsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 18,
    marginTop: 8,
    marginBottom: 12,
  },

  starSmall: {
    color: "#FDE68A",
    fontSize: 20,
  },

  starLarge: {
    fontSize: 28,
  },

  giftCircle: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.22)",
    marginBottom: 22,
  },

  giftEmoji: {
    fontSize: 58,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 14,
  },

  subtitle: {
    color: "#E2E8F0",
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    marginHorizontal: 8,
    marginBottom: 28,
  },

  card: {
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 26,
    padding: 22,
    marginBottom: 24,
  },

  cardTitle: {
    color: "#312E81",
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 8,
  },

  cardDescription: {
    color: "#475569",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 22,
  },

  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#F3E8FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  benefitIcon: {
    fontSize: 24,
  },

  benefitContent: {
    flex: 1,
  },

  benefitTitle: {
    color: "#1E293B",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 3,
  },

  benefitText: {
    color: "#64748B",
    fontSize: 13,
    lineHeight: 19,
  },

  separator: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 16,
  },

  primaryButton: {
    minHeight: 60,
    borderRadius: 19,
    backgroundColor: "#FFB703",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    marginBottom: 13,
  },

  primaryButtonText: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
  },

  secondaryButton: {
    minHeight: 58,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.45)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },

  secondaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },

  reassurance: {
    color: "#CBD5E1",
    fontSize: 13,
    textAlign: "center",
    marginTop: 18,
  },
});