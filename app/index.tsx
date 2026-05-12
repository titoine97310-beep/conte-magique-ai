import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StyleSheet, Text, TouchableOpacity } from "react-native";

export default function HomeScreen() {
  return (
    <LinearGradient colors={["#1B1B3A", "#6930C3", "#FFB703"]} style={styles.container}>
      <Text style={styles.logo}>StoryVoice AI</Text>

      <Text style={styles.subtitle}>
        Crée une histoire magique avec ta voix, des images et une narration.
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
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
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
    lineHeight: 26,
  },
  primaryButton: {
    backgroundColor: "white",
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 18,
    width: "100%",
    alignItems: "center",
    marginBottom: 14,
  },
  primaryText: {
    color: "#1B1B3A",
    fontSize: 17,
    fontWeight: "900",
  },
  secondaryButton: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
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