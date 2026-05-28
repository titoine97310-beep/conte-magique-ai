import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useState } from "react";

import {
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../services/firebase";

export default function RegisterScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedCGU, setAcceptedCGU] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleRegister() {
    if (!name || !email || !password) {
      Alert.alert("Erreur", "Remplis tous les champs.");
      return;
    }

    if (!acceptedCGU) {
      Alert.alert(
        "Validation requise",
        "Tu dois accepter les CGU et la politique de confidentialité pour continuer."
      );
      return;
    }

    try {
      await createUserWithEmailAndPassword(auth, email, password);

      Alert.alert(
        "Compte créé 🎉",
        "Bienvenue dans ConteMagiqueIA ✨"
      );

      router.push("/premium");
    } catch (e: any) {
      console.log(e);

      Alert.alert(
        "Erreur",
        e?.message || "Impossible de créer le compte."
      );
    }
  }

  return (
    <LinearGradient
      colors={["#111827", "#312E81"]}
      style={styles.container}
    >
      <Text style={styles.title}>
        Crée ton compte ✨
      </Text>

      <Text style={styles.subtitle}>
        Continue l’aventure magique
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Prénom"
        placeholderTextColor="#999"
        value={name}
        onChangeText={setName}
      />

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#999"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.passwordInput}
          placeholder="Mot de passe"
          placeholderTextColor="#999"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
        />

        <TouchableOpacity
          onPress={() => setShowPassword(!showPassword)}
        >
          <Text style={styles.eyeText}>
            {showPassword ? "🙈" : "👁️"}
          </Text>
        </TouchableOpacity>
      </View>

      <Text
        style={styles.forgotPassword}
        onPress={() => router.push("/forgot-password" as any)}
      >
        Mot de passe oublié ?
      </Text>

      <TouchableOpacity
        style={styles.cguRow}
        onPress={() => setAcceptedCGU(!acceptedCGU)}
      >
        <Text style={styles.checkbox}>
          {acceptedCGU ? "☑️" : "⬜"}
        </Text>

        <Text style={styles.cguText}>
          J’accepte les CGU et la politique de confidentialité
        </Text>
      </TouchableOpacity>

      <Text
        style={styles.link}
        onPress={() => router.push("/cgu")}
      >
        Lire les CGU
      </Text>

      <Text
        style={styles.link}
        onPress={() => router.push("/privacy")}
      >
        Politique de confidentialité
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={handleRegister}
      >
        <Text style={styles.buttonText}>
          Continuer
        </Text>
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
    marginBottom: 10,
  },

  subtitle: {
    color: "#DDD",
    fontSize: 16,
    marginBottom: 30,
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
    color: "#CBD5E1",
    textAlign: "right",
    marginBottom: 20,
    fontWeight: "700",
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

  link: {
    color: "#FFB703",
    fontWeight: "800",
    marginBottom: 10,
  },

  button: {
    backgroundColor: "#FFB703",
    padding: 18,
    borderRadius: 18,
    alignItems: "center",
    marginTop: 10,
  },

  buttonText: {
    color: "#111",
    fontWeight: "900",
    fontSize: 16,
  },
});