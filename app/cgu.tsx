import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";

import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
} from "react-native";

export default function CGUScreen() {

  return (
    <LinearGradient
      colors={["#111827", "#312E81"]}
      style={styles.container}
    >

      <ScrollView
        showsVerticalScrollIndicator={false}
      >

        <Text style={styles.title}>
          Conditions Générales d’Utilisation
        </Text>

        <Text style={styles.text}>

          ConteMagiqueIA est une application de création d’histoires assistée par intelligence artificielle.

          {"\n\n"}

          L’application est destinée à un usage familial et doit être utilisée sous la supervision d’un parent.

          {"\n\n"}

          Les histoires, images et voix sont générées automatiquement par une intelligence artificielle et peuvent parfois contenir des erreurs ou des incohérences.

          {"\n\n"}

          L’utilisateur s’engage à utiliser l’application de manière respectueuse et légale.

          {"\n\n"}

          Les contenus générés ne doivent pas être utilisés à des fins illégales, haineuses ou dangereuses.

          {"\n\n"}

          Les achats numériques donnent accès à des crédits d’utilisation dans l’application.

          {"\n\n"}

          Les crédits consommés ne peuvent pas être remboursés une fois utilisés.

          {"\n\n"}

          ConteMagiqueIA peut modifier ou améliorer ses fonctionnalités à tout moment afin d’améliorer l’expérience utilisateur.

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