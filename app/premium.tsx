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

import { auth } from "../services/firebase";


import { setUserMode } from "../services/usageService";

import { addStories } from "../services/userService";

export default function PremiumScreen() {
  function redirectToRegister() {
    Alert.alert(
      "Compte requis",
      "Crée gratuitement ton compte pour acheter et conserver tes carnets.",
      [
        {
          text: "Créer mon compte",
          onPress: () =>
            router.replace({
              pathname: "/register",
              params: { mode: "register" },
            } as any),
        },
        {
          text: "J’ai déjà un compte",
          onPress: () =>
            router.replace({
              pathname: "/register",
              params: { mode: "login" },
            } as any),
        },
        {
          text: "Annuler",
          style: "cancel",
        },
      ]
    );
  }

  async function buyTextPack() {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    redirectToRegister();
    return;
  }

  try {
    await setUserMode();

    await addStories(
      currentUser.uid,
      "text",
      15
    );

    Alert.alert(
      "Carnet Texte activé 🎉",
      "Tu as maintenant 15 histoires en texte seul.",
      [
        {
          text: "Créer une histoire",
          onPress: () =>
            router.replace("/create-story"),
        },
      ]
    );
  } catch (error) {
    console.log(error);

    Alert.alert(
      "Erreur",
      "Impossible d'activer le carnet."
    );
  }
}


  async function buyPremiumPack() {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    redirectToRegister();
    return;
  }

  try {
    await setUserMode();

    await addStories(
      currentUser.uid,
      "illustrated",
      15
    );

    Alert.alert(
      "Carnet Illustré activé 🎉",
      "Tu as maintenant 15 histoires illustrées.",
      [
        {
          text: "Créer une histoire",
          onPress: () =>
            router.replace("/create-story"),
        },
      ]
    );
  } catch (error) {
    console.log(error);

    Alert.alert(
      "Erreur",
      "Impossible d'activer le carnet."
    );
  }
}

  return (
    <LinearGradient
      colors={["#020617", "#312E81"]}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Continue la magie ✨</Text>

        <Text style={styles.subtitle}>
          Choisis ton carnet et continue à créer des histoires personnalisées.
        </Text>

        <View style={styles.benefitsBox}>
          <Text style={styles.benefit}>🔊 Narration IA immersive</Text>
          <Text style={styles.benefit}>🌙 Mode dodo magique</Text>
          <Text style={styles.benefit}>💾 Histoires sauvegardées</Text>
          <Text style={styles.benefit}>🎨 Illustrations selon le carnet</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardIcon}>📖</Text>
          <Text style={styles.cardTitle}>Carnet Texte</Text>
          <Text style={styles.cardPrice}>2,99 €</Text>

          <Text style={styles.cardDescription}>
            15 histoires en texte seul. Idéal pour profiter de la narration
            sans générer d’illustrations.
          </Text>

          <TouchableOpacity
            style={styles.button}
            onPress={buyTextPack}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>
              Choisir le carnet texte
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.premiumCard}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Le plus magique</Text>
          </View>

          <Text style={styles.cardIcon}>🌟</Text>
          <Text style={styles.cardTitle}>Carnet Illustré</Text>
          <Text style={styles.cardPrice}>9,99 €</Text>

          <Text style={styles.cardDescription}>
            15 histoires complètes avec texte et illustrations. L’expérience
            la plus immersive de ConteMagiqueIA.
          </Text>

          <TouchableOpacity
            style={styles.premiumButton}
            onPress={buyPremiumPack}
            activeOpacity={0.85}
          >
            <Text style={styles.premiumButtonText}>
              Choisir le carnet illustré
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footerText}>
          Paiement simulé pendant les tests. Le paiement Google Play sera ajouté
          plus tard.
        </Text>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  scrollContent: {
    padding: 24,
    paddingTop: 55,
    paddingBottom: 40,
  },

  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingRight: 18,
    marginBottom: 15,
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
    textAlign: "center",
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
    textAlign: "center",
  },

  footerText: {
    color: "#CBD5E1",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 18,
  },
});
