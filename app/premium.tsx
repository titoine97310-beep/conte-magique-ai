import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";

import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { addIllustratedStories, addTextStories } from "../services/usageService";

export default function PremiumScreen() {
  async function buyTextPack() {
    await addTextStories(20);

    Alert.alert("Pack activé 🎉", "Tu as maintenant 20 histoires texte.");

    router.push("/");
  }

  async function buyPremiumPack() {
    await addIllustratedStories(20);

    Alert.alert(
      "Pack Premium activé 🎉",
      "Tu as maintenant 20 histoires illustrées."
    );

    router.push("/");
  }

  return (
    <LinearGradient colors={["#020617", "#312E81"]} style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Continue la magie ✨</Text>

        <Text style={styles.subtitle}>
          Choisis ton pack et continue à créer des histoires pour enfants.
        </Text>

        <View style={styles.benefitsBox}>
          <Text style={styles.benefit}>🔊 Narration IA immersive</Text>
          <Text style={styles.benefit}>🌙 Mode dodo magique</Text>
          <Text style={styles.benefit}>💾 Histoires sauvegardées</Text>
          <Text style={styles.benefit}>🎨 Images disponibles avec Premium</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardIcon}>📖</Text>
          <Text style={styles.cardTitle}>Pack Texte</Text>
          <Text style={styles.cardPrice}>3€</Text>
          <Text style={styles.cardDescription}>
            10 histoires en texte seul. Idéal pour continuer à raconter sans
            images.
          </Text>

          <TouchableOpacity style={styles.button} onPress={buyTextPack}>
            <Text style={styles.buttonText}>Choisir le pack texte</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.premiumCard}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Le plus magique</Text>
          </View>

          <Text style={styles.cardIcon}>🌟</Text>
          <Text style={styles.cardTitle}>Pack Premium</Text>
          <Text style={styles.cardPrice}>9,99€</Text>

          <Text style={styles.cardDescription}>
            5 histoires complètes avec texte + images. L’expérience la plus
            immersive.
          </Text>

          <TouchableOpacity style={styles.premiumButton} onPress={buyPremiumPack}>
            <Text style={styles.premiumButtonText}>Débloquer Premium</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footerText}>
          Paiement simulé pour la version test. Le paiement réel sera ajouté
          plus tard.
        </Text>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },

  title: {
    color: "white",
    fontSize: 34,
    fontWeight: "900",
    marginTop: 40,
    marginBottom: 10,
  },

  subtitle: {
    color: "#CBD5E1",
    fontSize: 16,
    marginBottom: 22,
    lineHeight: 24,
  },

  benefitsBox: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: 20,
    padding: 18,
    marginBottom: 22,
  },

  benefit: {
    color: "white",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 8,
  },

  card: {
    backgroundColor: "white",
    borderRadius: 26,
    padding: 24,
    marginBottom: 22,
    alignItems: "center",
  },

  premiumCard: {
    backgroundColor: "#FFB703",
    borderRadius: 28,
    padding: 24,
    marginBottom: 22,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFE8A3",
  },

  badge: {
    backgroundColor: "#111827",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    marginBottom: 14,
  },

  badgeText: {
    color: "#FFB703",
    fontWeight: "900",
    fontSize: 13,
  },

  cardIcon: {
    fontSize: 50,
    marginBottom: 10,
  },

  cardTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: "#111",
    marginBottom: 6,
  },

  cardPrice: {
    fontSize: 42,
    fontWeight: "900",
    color: "#6930C3",
    marginBottom: 10,
  },

  cardDescription: {
    textAlign: "center",
    fontSize: 16,
    color: "#333",
    marginBottom: 24,
    lineHeight: 24,
  },

  button: {
    backgroundColor: "#111827",
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 18,
    width: "100%",
    alignItems: "center",
  },

  buttonText: {
    color: "white",
    fontWeight: "900",
    fontSize: 16,
  },

  premiumButton: {
    backgroundColor: "#111827",
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 18,
    width: "100%",
    alignItems: "center",
  },

  premiumButtonText: {
    color: "white",
    fontWeight: "900",
    fontSize: 16,
  },

  footerText: {
    color: "#CBD5E1",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 30,
  },
});