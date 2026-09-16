import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";

import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../services/firebase";

import {
  getTranslations,
  loadLanguage,
  type AppLanguage,
} from "../services/languageService";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");

  const [language, setLanguage] =
    useState<AppLanguage>("fr");

  const t = getTranslations(language);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function refreshLanguage() {
        const savedLanguage = await loadLanguage();

        if (isActive) {
          setLanguage(savedLanguage);
        }
      }

      void refreshLanguage();

      return () => {
        isActive = false;
      };
    }, [])
  );

  async function handleResetPassword() {
    if (!email.trim()) {
      Alert.alert(
        t.account.forgotPasswordTitle,
        t.account.forgotPasswordMissingEmail
      );
      return;
    }

    try {
      await sendPasswordResetEmail(
        auth,
        email.trim().toLowerCase()
      );

      Alert.alert(
        t.account.forgotPasswordSentTitle,
        t.account.forgotPasswordSentMessage,
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ],
        {
          cancelable: false,
        }
      );
    } catch (error) {
      console.log(
        "Erreur réinitialisation mot de passe :",
        error
      );

      Alert.alert(
        t.account.forgotPasswordTitle,
        t.account.forgotPasswordSendError
      );
    }
  }

  return (
    <LinearGradient
      colors={["#020617", "#312E81"]}
      style={styles.container}
    >
      <Text style={styles.title}>
        {t.account.forgotPasswordTitle}
      </Text>

      <Text style={styles.subtitle}>
        {t.account.forgotPasswordSubtitle}
      </Text>

      <TextInput
        style={styles.input}
        placeholder={t.account.forgotPasswordEmail}
        placeholderTextColor="#999"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleResetPassword}
      >
        <Text style={styles.buttonText}>
          {t.account.forgotPasswordSend}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Text style={styles.backText}>
          {t.account.forgotPasswordBack}
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