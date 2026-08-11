import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import LegalCard from "../../components/LegalCard";
import { legalDocuments } from "../../data/legalDocuments";

export default function LegalCenterScreen() {
  return (
    <LinearGradient
      colors={["#020617", "#312E81"]}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.headerIcon}>⚖️</Text>

          <Text style={styles.title}>
            Centre juridique
          </Text>

          <Text style={styles.subtitle}>
            Retrouvez ici les documents juridiques, les engagements de
            confidentialité et les informations de confiance de ConteMagiqueIA.
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>
            🛡️ Transparence & protection
          </Text>

          <Text style={styles.infoText}>
            Ces documents expliquent simplement vos droits, le fonctionnement
            de l’application et la manière dont ConteMagiqueIA protège les
            utilisateurs et les familles.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>
          Documents
        </Text>

        <View style={styles.documentsSection}>
          {legalDocuments.map((doc) => (
            <LegalCard
              key={doc.id}
              icon={doc.icon}
              title={doc.title}
              subtitle={doc.subtitle}
              onPress={() =>
                router.push(`/legal/${doc.id}` as any)
              }
            />
          ))}
        </View>

        <View style={styles.trustCard}>
          <Text style={styles.trustTitle}>
            🛡️ Sécurité & confiance
          </Text>

          <View style={styles.trustRow}>
            <Text style={styles.trustIcon}>✓</Text>
            <Text style={styles.trustText}>
              Protection des données personnelles
            </Text>
          </View>

          <View style={styles.trustRow}>
            <Text style={styles.trustIcon}>✓</Text>
            <Text style={styles.trustText}>
              Engagement spécifique pour la protection des enfants
            </Text>
          </View>

          <View style={styles.trustRow}>
            <Text style={styles.trustIcon}>✓</Text>
            <Text style={styles.trustText}>
              Paiements réalisés via les plateformes officielles
            </Text>
          </View>

          <View style={styles.trustRow}>
            <Text style={styles.trustIcon}>✓</Text>
            <Text style={styles.trustText}>
              Utilisation transparente de l’intelligence artificielle
            </Text>
          </View>

          <View style={styles.trustRow}>
            <Text style={styles.trustIcon}>✓</Text>
            <Text style={styles.trustText}>
              Possibilité de supprimer son compte
            </Text>
          </View>
        </View>

        <View style={styles.contactCard}>
          <Text style={styles.contactTitle}>
            Besoin d’aide ?
          </Text>

          <Text style={styles.contactText}>
            Pour toute question juridique, relative aux données personnelles
            ou à l’utilisation de ConteMagiqueIA :
          </Text>

          <Text style={styles.contactEmail}>
            contact@contemagiqueia.fr
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerBrand}>
            ✨ ConteMagiqueIA
          </Text>

          <Text style={styles.footerText}>
            Documents juridiques — Version 1.0
          </Text>

          <Text style={styles.footerText}>
            © 2026 ConteMagiqueIA
          </Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  content: {
    padding: 22,
    paddingTop: 55,
    paddingBottom: 50,
  },

  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingRight: 18,
    marginBottom: 14,
  },

  backText: {
    color: "#CBD5E1",
    fontSize: 15,
    fontWeight: "800",
  },

  header: {
    alignItems: "center",
    marginBottom: 22,
  },

  headerIcon: {
    fontSize: 54,
    marginBottom: 12,
  },

  title: {
    color: "white",
    fontSize: 32,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 10,
  },

  subtitle: {
    color: "#CBD5E1",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    maxWidth: 350,
  },

  infoCard: {
    backgroundColor: "rgba(255,183,3,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,183,3,0.30)",
    borderRadius: 20,
    padding: 17,
    marginBottom: 24,
  },

  infoTitle: {
    color: "#FFB703",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 7,
  },

  infoText: {
    color: "#E2E8F0",
    fontSize: 14,
    lineHeight: 21,
  },

  sectionTitle: {
    color: "white",
    fontSize: 19,
    fontWeight: "900",
    marginBottom: 13,
  },

  documentsSection: {
    marginBottom: 18,
  },

  trustCard: {
    backgroundColor: "rgba(255,255,255,0.09)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    borderRadius: 22,
    padding: 18,
    marginBottom: 18,
  },

  trustTitle: {
    color: "#FFB703",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 15,
  },

  trustRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 11,
  },

  trustIcon: {
    width: 26,
    color: "#4ADE80",
    fontSize: 17,
    fontWeight: "900",
  },

  trustText: {
    flex: 1,
    color: "white",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
  },

  contactCard: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
    alignItems: "center",
  },

  contactTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 8,
  },

  contactText: {
    color: "#CBD5E1",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginBottom: 10,
  },

  contactEmail: {
    color: "#FFB703",
    fontSize: 15,
    fontWeight: "900",
  },

  footer: {
    alignItems: "center",
    marginTop: 8,
  },

  footerBrand: {
    color: "#FFB703",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 7,
  },

  footerText: {
    color: "#94A3B8",
    fontSize: 12,
    marginBottom: 4,
  },
});