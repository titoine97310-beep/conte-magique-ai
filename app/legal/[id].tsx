import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";

import {
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import { getLegalDocument } from "../../data/legalDocuments";

export default function LegalDocumentScreen() {
  const { id } = useLocalSearchParams();

  const document = getLegalDocument(id);

  const [searchQuery, setSearchQuery] = useState("");

  const filteredContent = useMemo(() => {
    if (!document) {
      return "";
    }

    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return document.content;
    }

    const paragraphs = document.content
      .split("\n")
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);

    return paragraphs
      .filter((paragraph) =>
        paragraph.toLowerCase().includes(query)
      )
      .join("\n\n");
  }, [document, searchQuery]);

  async function handleShare() {
    if (!document) {
      return;
    }

    try {
      await Share.share({
        title: document.title,
        message: `${document.title}

Version ${document.version}
Dernière mise à jour : ${document.updatedAt}

${document.content}

ConteMagiqueIA
contact@contemagiqueia.fr`,
      });
    } catch (error) {
      console.log("Erreur partage document :", error);
    }
  }

  if (!document) {
    return (
      <LinearGradient
        colors={["#020617", "#312E81"]}
        style={styles.container}
      >
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>📄</Text>

          <Text style={styles.errorTitle}>
            Document introuvable
          </Text>

          <Text style={styles.errorText}>
            Ce document juridique n’est pas disponible.
          </Text>

          <TouchableOpacity
            style={styles.errorButton}
            onPress={() => router.back()}
          >
            <Text style={styles.errorButtonText}>
              Retour
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={["#020617", "#312E81"]}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>
            ← Retour
          </Text>
        </TouchableOpacity>

        <View style={styles.headerCard}>
          <Text style={styles.icon}>
            {document.icon}
          </Text>

          <Text style={styles.title}>
            {document.title}
          </Text>

          <View style={styles.metaRow}>
            <View style={styles.metaBadge}>
              <Text style={styles.metaBadgeText}>
                Version {document.version}
              </Text>
            </View>

            <View style={styles.metaBadge}>
              <Text style={styles.metaBadgeText}>
                Mis à jour le {document.updatedAt}
              </Text>
            </View>
          </View>

          <Text style={styles.subtitle}>
            {document.subtitle}
          </Text>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleShare}
          >
            <Text style={styles.actionIcon}>📤</Text>

            <Text style={styles.actionText}>
              Partager
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchCard}>
          <Text style={styles.searchLabel}>
            🔎 Rechercher dans ce document
          </Text>

          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Ex : données personnelles, paiement, enfant..."
            placeholderTextColor="#94A3B8"
            returnKeyType="search"
          />

          {searchQuery.trim().length > 0 && (
            <TouchableOpacity
              style={styles.clearSearchButton}
              onPress={() => setSearchQuery("")}
            >
              <Text style={styles.clearSearchText}>
                Effacer la recherche
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.documentCard}>
          {searchQuery.trim().length > 0 &&
          !filteredContent ? (
            <View style={styles.noResultBox}>
              <Text style={styles.noResultIcon}>
                🔎
              </Text>

              <Text style={styles.noResultTitle}>
                Aucun résultat
              </Text>

              <Text style={styles.noResultText}>
                Aucun passage ne correspond à ta recherche.
              </Text>
            </View>
          ) : (
            <Text style={styles.body}>
              {filteredContent}
            </Text>
          )}
        </View>

        <View style={styles.footerCard}>
          <Text style={styles.footerLogo}>
            ✨ ConteMagiqueIA
          </Text>

          <Text style={styles.footerText}>
            Pour toute question concernant ce document :
          </Text>

          <Text style={styles.footerEmail}>
            contact@contemagiqueia.fr
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
    marginBottom: 16,
  },

  backText: {
    color: "#CBD5E1",
    fontSize: 15,
    fontWeight: "800",
  },

  headerCard: {
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: 24,
    padding: 22,
    marginBottom: 16,
  },

  icon: {
    fontSize: 52,
    textAlign: "center",
    marginBottom: 12,
  },

  title: {
    color: "white",
    fontSize: 27,
    lineHeight: 34,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 14,
  },

  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginBottom: 15,
  },

  metaBadge: {
    backgroundColor: "rgba(255,183,3,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,183,3,0.35)",
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
  },

  metaBadgeText: {
    color: "#FFB703",
    fontSize: 12,
    fontWeight: "900",
  },

  subtitle: {
    color: "#CBD5E1",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },

  actionsRow: {
    flexDirection: "row",
    marginBottom: 16,
  },

  actionButton: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFB703",
    borderRadius: 16,
    paddingHorizontal: 18,
  },

  actionIcon: {
    fontSize: 18,
    marginRight: 8,
  },

  actionText: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "900",
  },

  searchCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },

  searchLabel: {
    color: "white",
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 10,
  },

  searchInput: {
    backgroundColor: "rgba(255,255,255,0.08)",
    color: "white",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },

  clearSearchButton: {
    alignSelf: "flex-start",
    marginTop: 10,
  },

  clearSearchText: {
    color: "#FFB703",
    fontSize: 13,
    fontWeight: "800",
  },

  documentCard: {
    backgroundColor: "white",
    borderRadius: 22,
    padding: 20,
    marginBottom: 18,
  },

  body: {
    color: "#1F2937",
    fontSize: 15,
    lineHeight: 25,
  },

  noResultBox: {
    paddingVertical: 34,
    alignItems: "center",
  },

  noResultIcon: {
    fontSize: 40,
    marginBottom: 12,
  },

  noResultTitle: {
    color: "#111827",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 6,
  },

  noResultText: {
    color: "#64748B",
    fontSize: 14,
    textAlign: "center",
  },

  footerCard: {
    alignItems: "center",
    paddingVertical: 18,
  },

  footerLogo: {
    color: "#FFB703",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 8,
  },

  footerText: {
    color: "#CBD5E1",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 5,
  },

  footerEmail: {
    color: "white",
    fontSize: 14,
    fontWeight: "900",
  },

  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },

  errorIcon: {
    fontSize: 60,
    marginBottom: 18,
  },

  errorTitle: {
    color: "white",
    fontSize: 24,
    fontWeight: "900",
    marginBottom: 8,
  },

  errorText: {
    color: "#CBD5E1",
    fontSize: 15,
    textAlign: "center",
    marginBottom: 24,
  },

  errorButton: {
    backgroundColor: "#FFB703",
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 13,
  },

  errorButtonText: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "900",
  },
});