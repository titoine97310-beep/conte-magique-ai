import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { auth } from "../services/firebase";

export default function HomeScreen() {
  const [loadingIntro, setLoadingIntro] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [user, setUser] = useState<User | null>(auth.currentUser);

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

        <Text style={styles.introTitle}>ConteMagiqueIA</Text>

        <Text style={styles.introSubtitle}>
          Des histoires magiques pour les enfants ✨
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
      <Image
        source={require("../assets/images/icon.png")}
        style={styles.logoImage}
        resizeMode="contain"
      />

      <Text style={styles.logo}>ConteMagiqueIA</Text>

      <Text style={styles.subtitle}>
        Crée des histoires magiques avec l’IA, des images et une narration
        immersive ✨
      </Text>

      {user && getFirstName() ? (
        <View style={styles.welcomeContainer}>
          <Text style={styles.welcomeText}>
            Bonjour {getFirstName()} 👋
          </Text>
        </View>
      ) : null}

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
            {user ? "👤 Mon compte" : "🔐 Se connecter"}
          </Text>
        )}
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

  introLoader: {
    marginTop: 30,
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
});