import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useState } from "react";

import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity
} from "react-native";

export default function HomeScreen() {
  const [loadingIntro, setLoadingIntro] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setLoadingIntro(false);
    }, 2200);

    return () => clearTimeout(timeout);
  }, []);

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

        <Text style={styles.introTitle}>ConteMagiqueIA</Text>

        <Text style={styles.introSubtitle}>
          Des histoires magiques pour les enfants ✨
        </Text>

        <ActivityIndicator
          size="large"
          color="#FFB703"
          style={{ marginTop: 30 }}
        />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={["#1B1B3A", "#312E81", "#020617"]}
      style={styles.container}
    >
      <Image
        source={require("../assets/images/icon.png")}
        style={styles.logoImage}
        resizeMode="contain"
      />

      <Text style={styles.logo}>ConteMagiqueIA</Text>

      <Text style={styles.subtitle}>
        Crée des histoires magiques avec l’IA, des images et une narration immersive ✨
      </Text>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => router.push("/create-story")}
      >
        <Text style={styles.primaryText}>Créer une histoire</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => router.push("/saved-stories" as any)}
      >
        <Text style={styles.secondaryText}>Mes histoires</Text>
      </TouchableOpacity>
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

  container: {
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
    marginBottom: 40,
    lineHeight: 28,
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
  },

  secondaryText: {
    color: "white",
    fontSize: 17,
    fontWeight: "900",
  },
});