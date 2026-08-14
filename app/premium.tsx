import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  ErrorCode,
  useIAP,
} from "expo-iap";

import { auth } from "../services/firebase";
import { setUserMode } from "../services/usageService";

const BACKEND_URL =
  "https://conte-magique-ai.onrender.com";

const TEXT_PRODUCT_ID = "carnet_15_textes";
const ILLUSTRATED_PRODUCT_ID =
  "carnet_15_histoires";

const PRODUCT_IDS = [
  TEXT_PRODUCT_ID,
  ILLUSTRATED_PRODUCT_ID,
];

export default function PremiumScreen() {
  const [processing, setProcessing] =
    useState(false);

  const {
    connected,
    products,
    fetchProducts,
    requestPurchase,
    finishTransaction,
  } = useIAP({

    onPurchaseSuccess: async (purchase) => {
      console.log(
        "✅ Achat Google Play reçu :",
        purchase.productId
      );

      setProcessing(true);

      try {
        const currentUser =
          auth.currentUser;

        if (!currentUser) {
          throw new Error(
            "Utilisateur Firebase non connecté."
          );
        }

        const purchaseToken =
          purchase.purchaseToken;

        if (!purchaseToken) {
          throw new Error(
            "Google Play n'a pas fourni de purchaseToken."
          );
        }

        /*
         * Récupération d'un Firebase ID token.
         * Le backend utilisera ce token pour identifier
         * réellement l'utilisateur.
         */
        const firebaseIdToken =
          await currentUser.getIdToken(true);

        const response = await fetch(
          `${BACKEND_URL}/google-play/verify-purchase`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${firebaseIdToken}`,
            },

            body: JSON.stringify({
              productId:
                purchase.productId,
              purchaseToken,
            }),
          }
        );

        const result =
          await response.json();

        if (!response.ok) {
          console.log(
            "❌ Validation serveur :",
            result
          );

          throw new Error(
            result?.error ||
              result?.message ||
              "L'achat n'a pas pu être validé."
          );
        }

        if (!result.success) {
          throw new Error(
            "Le serveur n'a pas confirmé l'achat."
          );
        }

        /*
         * Le serveur a :
         * - vérifié Google Play
         * - identifié l'utilisateur Firebase
         * - crédité Firestore
         *
         * Maintenant seulement nous terminons
         * la transaction Google Play.
         */
        await finishTransaction({
          purchase,
          isConsumable: true,
        });

        await setUserMode();

        if (
          purchase.productId ===
          TEXT_PRODUCT_ID
        ) {
          Alert.alert(
            "Carnet Texte activé 🎉",
            "15 histoires en texte ont été ajoutées à ton compte.",
            [
              {
                text: "Créer une histoire",
                onPress: () =>
                  router.replace(
                    "/create-story"
                  ),
              },
            ]
          );

          return;
        }

        if (
          purchase.productId ===
          ILLUSTRATED_PRODUCT_ID
        ) {
          Alert.alert(
            "Carnet Illustré activé 🎉",
            "15 histoires illustrées ont été ajoutées à ton compte.",
            [
              {
                text: "Créer une histoire",
                onPress: () =>
                  router.replace(
                    "/create-story"
                  ),
              },
            ]
          );

          return;
        }

        Alert.alert(
          "Achat validé 🎉",
          "Ton carnet a été ajouté à ton compte."
        );
      } catch (error: any) {
        console.error(
          "❌ Erreur traitement achat :",
          error
        );

        Alert.alert(
          "Achat non finalisé",
          error?.message ||
            "Impossible de valider l'achat. Ne relance pas immédiatement le paiement."
        );
      } finally {
        setProcessing(false);
      }
    },

    onPurchaseError: (error) => {
      console.log(
        "Erreur Google Play :",
        error
      );

      setProcessing(false);

      if (
        error.code ===
        ErrorCode.UserCancelled
      ) {
        return;
      }

      Alert.alert(
        "Paiement impossible",
        error.message ||
          "Google Play n'a pas pu effectuer le paiement."
      );
    },
  });

  /*
   * Récupération des deux produits configurés
   * dans Google Play Console.
   */
  useEffect(() => {
    if (!connected) {
      return;
    }

    fetchProducts({
      skus: PRODUCT_IDS,
      type: "in-app",
    }).catch((error) => {
      console.error(
        "Erreur chargement produits Google Play :",
        error
      );
    });
  }, [connected, fetchProducts]);

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
              params: {
                mode: "register",
              },
            } as any),
        },
        {
          text: "J’ai déjà un compte",
          onPress: () =>
            router.replace({
              pathname: "/register",
              params: {
                mode: "login",
              },
            } as any),
        },
        {
          text: "Annuler",
          style: "cancel",
        },
      ]
    );
  }

  async function buyProduct(
    productId: string
  ) {
    const currentUser =
      auth.currentUser;

    if (!currentUser) {
      redirectToRegister();
      return;
    }

    if (!connected) {
      Alert.alert(
        "Google Play indisponible",
        "La connexion à Google Play n'est pas encore prête. Réessaie dans quelques secondes."
      );

      return;
    }

    if (processing) {
      return;
    }

    /*
     * Vérifie également que Google Play
     * nous renvoie réellement ce produit.
     */
    const storeProduct =
      products.find(
        (product) =>
          product.id === productId
      );

    if (!storeProduct) {
      Alert.alert(
        "Produit indisponible",
        "Ce carnet n'est pas disponible sur Google Play pour le moment."
      );

      return;
    }

    try {
      setProcessing(true);

      /*
       * requestPurchase déclenche l'interface Google Play.
       * Le résultat final arrivera ensuite dans
       * onPurchaseSuccess / onPurchaseError.
       */
      await requestPurchase({
        request: {
          google: {
            skus: [productId],
          },

          apple: {
            sku: productId,
          },
        },

        type: "in-app",
      });
    } catch (error: any) {
      setProcessing(false);

      console.error(
        "Erreur lancement paiement :",
        error
      );

      Alert.alert(
        "Paiement impossible",
        error?.message ||
          "Impossible d'ouvrir Google Play."
      );
    }
  }

  async function buyTextPack() {
    await buyProduct(
      TEXT_PRODUCT_ID
    );
  }

  async function buyPremiumPack() {
    await buyProduct(
      ILLUSTRATED_PRODUCT_ID
    );
  }

  function getGooglePlayPrice(
    productId: string,
    fallback: string
  ) {
    const product =
      products.find(
        (item) =>
          item.id === productId
      );

    return (
      product?.displayPrice ||
      fallback
    );
  }

  return (
    <LinearGradient
      colors={[
        "#020617",
        "#312E81",
      ]}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={
          styles.scrollContent
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() =>
            router.back()
          }
          disabled={processing}
        >
          <Text
            style={styles.backText}
          >
            ← Retour
          </Text>
        </TouchableOpacity>

        <Text style={styles.title}>
          Continue la magie ✨
        </Text>

        <Text
          style={styles.subtitle}
        >
          Choisis ton carnet et
          continue à créer des
          histoires personnalisées.
        </Text>

        <View
          style={styles.benefitsBox}
        >
          <Text
            style={styles.benefit}
          >
            🔊 Narration IA immersive
          </Text>

          <Text
            style={styles.benefit}
          >
            🌙 Mode dodo magique
          </Text>

          <Text
            style={styles.benefit}
          >
            💾 Histoires sauvegardées
          </Text>

          <Text
            style={styles.benefit}
          >
            🎨 Illustrations selon le
            carnet
          </Text>
        </View>

        {!connected && (
          <View
            style={
              styles.storeStatus
            }
          >
            <ActivityIndicator />

            <Text
              style={
                styles.storeStatusText
              }
            >
              Connexion à Google Play…
            </Text>
          </View>
        )}

        <View style={styles.card}>
          <Text
            style={styles.cardIcon}
          >
            📖
          </Text>

          <Text
            style={styles.cardTitle}
          >
            Carnet Texte
          </Text>

          <Text
            style={styles.cardPrice}
          >
            {getGooglePlayPrice(
              TEXT_PRODUCT_ID,
              "2,99 €"
            )}
          </Text>

          <Text
            style={
              styles.cardDescription
            }
          >
            15 histoires en texte
            seul. Idéal pour profiter
            de la narration sans
            générer d’illustrations.
          </Text>

          <TouchableOpacity
            style={[
              styles.button,
              (!connected ||
                processing) &&
                styles.disabledButton,
            ]}
            onPress={buyTextPack}
            activeOpacity={0.85}
            disabled={
              !connected ||
              processing
            }
          >
            {processing ? (
              <ActivityIndicator />
            ) : (
              <Text
                style={
                  styles.buttonText
                }
              >
                Choisir le carnet texte
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View
          style={
            styles.premiumCard
          }
        >
          <View
            style={styles.badge}
          >
            <Text
              style={
                styles.badgeText
              }
            >
              Le plus magique
            </Text>
          </View>

          <Text
            style={styles.cardIcon}
          >
            🌟
          </Text>

          <Text
            style={styles.cardTitle}
          >
            Carnet Illustré
          </Text>

          <Text
            style={styles.cardPrice}
          >
            {getGooglePlayPrice(
              ILLUSTRATED_PRODUCT_ID,
              "9,99 €"
            )}
          </Text>

          <Text
            style={
              styles.cardDescription
            }
          >
            15 histoires complètes
            avec texte et
            illustrations.
            L’expérience la plus
            immersive de
            ConteMagiqueIA.
          </Text>

          <TouchableOpacity
            style={[
              styles.premiumButton,
              (!connected ||
                processing) &&
                styles.disabledButton,
            ]}
            onPress={
              buyPremiumPack
            }
            activeOpacity={0.85}
            disabled={
              !connected ||
              processing
            }
          >
            {processing ? (
              <ActivityIndicator />
            ) : (
              <Text
                style={
                  styles.premiumButtonText
                }
              >
                Choisir le carnet
                illustré
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <Text
          style={styles.footerText}
        >
          Paiement sécurisé par
          Google Play. Chaque carnet
          contient 15 créations.
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
    backgroundColor:
      "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor:
      "rgba(255,255,255,0.18)",
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

  storeStatus: {
    backgroundColor:
      "rgba(255,255,255,0.10)",
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
    alignItems: "center",
    gap: 8,
  },

  storeStatusText: {
    color: "#CBD5E1",
    fontSize: 13,
    fontWeight: "700",
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

  disabledButton: {
    opacity: 0.55,
  },

  footerText: {
    color: "#CBD5E1",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 18,
  },
});