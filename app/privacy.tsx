import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";

import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
} from "react-native";

export default function PrivacyScreen() {

  return (
    <LinearGradient
      colors={["#111827", "#312E81"]}
      style={styles.container}
    >

      <ScrollView
        showsVerticalScrollIndicator={false}
      >

        <Text style={styles.title}>
          Politique de confidentialité
        </Text>

        <Text style={styles.text}>

          ConteMagiqueIA respecte la vie privée de ses utilisateurs.

          {"\n\n"}

          Les informations fournies lors de l’inscription (prénom, email) sont utilisées uniquement pour permettre l’utilisation de l’application et améliorer l’expérience utilisateur.

          {"\n\n"}

          Les histoires générées peuvent être temporairement stockées afin de permettre leur lecture dans l’application.

          {"\n\n"}

          ConteMagiqueIA ne revend pas les données personnelles des utilisateurs.

          {"\n\n"}

          Certaines fonctionnalités utilisent des services d’intelligence artificielle externes afin de générer du texte, des images et des voix.

          {"\n\n"}

          Les utilisateurs doivent éviter de transmettre des informations personnelles sensibles dans les prompts envoyés à l’intelligence artificielle.

          {"\n\n"}

          Les parents restent responsables de l’utilisation de l’application par leurs enfants.

          {"\n\n"}

          Cette politique pourra évoluer afin d’améliorer la sécurité et les fonctionnalités de l’application.

        </Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() => router.back()}
        >
          <Text style={styles.buttonText}>
            Retour
          </Text>
        </TouchableOpacity>

      </ScrollView>

    </LinearGradient>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    padding: 24,
    paddingTop: 60,
  },

  title: {
    color: "white",
    fontSize: 30,
    fontWeight: "900",
    marginBottom: 24,
  },

  text: {
    color: "white",
    fontSize: 16,
    lineHeight: 28,
    marginBottom: 40,
  },

  button: {
    backgroundColor: "#FFB703",
    padding: 18,
    borderRadius: 18,
    alignItems: "center",
    marginBottom: 30,
  },

  buttonText: {
    color: "#111",
    fontWeight: "900",
    fontSize: 16,
  },

});