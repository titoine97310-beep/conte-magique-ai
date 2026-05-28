import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useState } from "react";

import {
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
} from "react-native";

import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../services/firebase";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");

  async function handleResetPassword() {
    if (!email.trim()) {
      Alert.alert("Erreur", "Entre ton adresse email.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email.trim());

      Alert.alert(
        "Email envoyé 📩",
        "Si ce compte existe, tu recevras un lien pour réinitialiser ton mot de passe."
      );

      router.back();
    } catch (e: any) {
      Alert.alert(
        "Erreur",
        e?.message || "Impossible d’envoyer l’email."
      );
    }
  }

  return (
    <LinearGradient colors={["#020617", "#312E81"]} style={styles.container}>
      <Text style={styles.title}>Mot de passe oublié ?</Text>

      <Text style={styles.subtitle}>
        Entre ton email pour recevoir un lien de réinitialisation.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#999"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TouchableOpacity style={styles.button} onPress={handleResetPassword}>
        <Text style={styles.buttonText}>Envoyer le lien</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>Retour</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },

  title: {
    color: "white",
    fontSize: 34,
    fontWeight: "900",
    marginBottom: 12,
  },

  subtitle: {
    color: "#CBD5E1",
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 28,
  },

  input: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
    fontSize: 16,
    color: "#111",
  },

  button: {
    backgroundColor: "#FFB703",
    padding: 18,
    borderRadius: 18,
    alignItems: "center",
  },

  buttonText: {
    color: "#111",
    fontWeight: "900",
    fontSize: 16,
  },

  backButton: {
    marginTop: 18,
    alignItems: "center",
  },

  backText: {
    color: "white",
    fontWeight: "800",
  },
});