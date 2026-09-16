import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import {
  ErrorCode,
  useIAP,
  type ProductAndroid,
} from "expo-iap";

import { auth } from "../services/firebase";
import { setUserMode } from "../services/usageService";

import {
  getTranslations,
  loadLanguage,
  type AppLanguage,
} from "../services/languageService";

const BACKEND_URL =
  "https://conte-magique-ai.onrender.com";

const TEXT_PRODUCT_ID =
  "carnet_15_textes";

const ILLUSTRATED_PRODUCT_ID =
  "carnet_15_histoires";

const VIDEO_SHORT_PRODUCT_ID =
  "dessin_anime_4_scenes";

const VIDEO_MEDIUM_PRODUCT_ID =
  "dessin_anime_6_scenes";

const PRODUCT_IDS = [
  TEXT_PRODUCT_ID,
  ILLUSTRATED_PRODUCT_ID,
  VIDEO_SHORT_PRODUCT_ID,
  VIDEO_MEDIUM_PRODUCT_ID,
];

const STORE_NAME =
  Platform.OS === "ios"
    ? "l’App Store"
    : "Google Play";

export default function PremiumScreen() {
  const [processing, setProcessing] =
    useState(false);

  const [language, setLanguage] =
    useState<AppLanguage>("fr");

  const t = getTranslations(language);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function refreshLanguage() {
        const savedLanguage =
          await loadLanguage();

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

  const {
    connected,
    products,
    fetchProducts,
    requestPurchase,
    finishTransaction,
  } = useIAP({
    onPurchaseSuccess: async (purchase) => {
      console.log(
        Platform.OS === "ios"
          ? "✅ Achat Apple reçu :"
          : "✅ Achat Google Play reçu :",
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

        const productId =
          purchase.productId;

        const purchaseToken =
          purchase.purchaseToken;

        const transactionId =
          purchase.transactionId;

        if (!productId) {
          throw new Error(
            "Achat reçu sans productId."
          );
        }

        if (
          Platform.OS === "android" &&
          !purchaseToken
        ) {
          throw new Error(
            "Achat Google Play reçu sans purchaseToken."
          );
        }

        if (
          Platform.OS === "ios" &&
          !transactionId
        ) {
          throw new Error(
            "Achat Apple reçu sans transactionId."
          );
        }

        const firebaseIdToken =
          await currentUser.getIdToken(
            true
          );

        const verifyUrl =
          Platform.OS === "ios"
            ? `${BACKEND_URL}/apple/verify-purchase`
            : `${BACKEND_URL}/google-play/verify-purchase`;

        const body =
          Platform.OS === "ios"
            ? {
                productId,
                transactionId,
              }
            : {
                productId,
                purchaseToken,
              };

        const response =
          await fetch(
            verifyUrl,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",

                Authorization:
                  `Bearer ${firebaseIdToken}`,
              },

              body:
                JSON.stringify(
                  body
                ),
            }
          );

        let result: any =
          null;

        try {
          result =
            await response.json();
        } catch {
          throw new Error(
            "Le serveur a répondu dans un format inattendu."
          );
        }

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

        if (!result?.success) {
          throw new Error(
            "Le serveur n'a pas confirmé l'achat."
          );
        }

        await finishTransaction({
          purchase,
          isConsumable: true,
        });

        const isVideoPurchase =
          productId ===
            VIDEO_SHORT_PRODUCT_ID ||
          productId ===
            VIDEO_MEDIUM_PRODUCT_ID;

        /*
         * ============================
         * 🎬 ACHAT VIDÉO
         * ============================
         *
         * Nouveau fonctionnement simple :
         *
         * achat validé
         *      ↓
         * Mes histoires
         *      ↓
         * choix de l'histoire
         *      ↓
         * Créer le dessin animé
         */
        if (isVideoPurchase) {
          void setUserMode().catch(
            (error) => {
              console.log(
                "Mise à jour mode utilisateur ignorée :",
                error
              );
            }
          );

          const isShort =
            productId ===
            VIDEO_SHORT_PRODUCT_ID;

          Alert.alert(
            isShort
              ? t.premium.shortVideoActivated
              : t.premium.mediumVideoActivated,

            isShort
              ? t.premium.shortVideoAdded
              : t.premium.mediumVideoAdded,

            [
              {
                text:
                  t.premium.chooseStory,

                onPress: () =>
                  router.replace(
                    "/saved-stories"
                  ),
              },
            ]
          );

          return;
        }

        /*
         * Carnets classiques.
         */
        await setUserMode();

        if (
          productId ===
          TEXT_PRODUCT_ID
        ) {
          Alert.alert(
            t.premium.textPackActivated,
            t.premium.textPackAdded,
            [
              {
                text:
                  t.premium.createStory,

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
          productId ===
          ILLUSTRATED_PRODUCT_ID
        ) {
          Alert.alert(
            t.premium.illustratedPackActivated,
            t.premium.illustratedPackAdded,
            [
              {
                text:
                  t.premium.createStory,

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
          t.premium.purchaseValidated,
          t.premium.purchaseAdded
        );
      } catch (error: any) {
        console.error(
          "❌ Erreur traitement achat :",
          error
        );

        Alert.alert(
          t.premium.purchaseNotCompleted,
          t.premium.purchaseValidationError
        );
      } finally {
        setProcessing(false);
      }
    },

    onPurchaseError: (
      error
    ) => {
      console.log(
        Platform.OS === "ios"
          ? "Erreur App Store :"
          : "Erreur Google Play :",
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
        t.premium.paymentImpossible,
        t.premium.paymentError
      );
    },
  });

  useEffect(() => {
    if (!connected) {
      return;
    }

    fetchProducts({
      skus: PRODUCT_IDS,
      type: "in-app",
    }).catch((error) => {
      console.error(
        `Erreur chargement produits ${STORE_NAME} :`,
        error
      );
    });
  }, [
    connected,
    fetchProducts,
  ]);

  function redirectToRegister() {
    Alert.alert(
      t.premium.accountRequired,
      t.premium.accountRequiredMessage,

      [
        {
          text:
            t.premium.createAccount,

          onPress: () =>
            router.replace({
              pathname:
                "/register",

              params: {
                mode:
                  "register",
              },
            } as any),
        },

        {
          text:
            t.premium.alreadyHaveAccount,

          onPress: () =>
            router.replace({
              pathname:
                "/register",

              params: {
                mode:
                  "login",
              },
            } as any),
        },

        {
          text:
            t.common.cancel,

          style:
            "cancel",
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
        `${STORE_NAME} ${t.premium.storeUnavailable}`,
        t.premium.storeNotReady
      );

      return;
    }

    if (processing) {
      return;
    }

    const storeProduct =
      products.find(
        (product) =>
          product.id ===
          productId
      );

    if (!storeProduct) {
      Alert.alert(
        t.premium.productUnavailable,
        t.premium.productUnavailableMessage
      );

      return;
    }

    try {
      setProcessing(true);

      let googleOfferToken:
        | string
        | undefined;

      if (
        Platform.OS ===
        "android"
      ) {
        const androidProduct =
          storeProduct as ProductAndroid;

        const offers =
          androidProduct.discountOffers ??
          [];

        const discountOffer =
          offers.find(
            (offer) =>
              (offer.percentageDiscountAndroid ??
                0) > 0
          );

        if (discountOffer) {
          googleOfferToken =
            discountOffer.offerTokenAndroid ??
            undefined;

          console.log(
            "🛒 Offre Google sélectionnée :",
            {
              productId,
              price:
                discountOffer.displayPrice,
              discount:
                discountOffer.percentageDiscountAndroid,
            }
          );
        }
      }

      await requestPurchase({
        request: {
          google: {
            skus: [
              productId,
            ],

            ...(googleOfferToken
              ? {
                  offerToken:
                    googleOfferToken,
                }
              : {}),
          },

          apple: {
            sku: productId,
          },
        },

        type:
          "in-app",
      });
    } catch (error: any) {
      setProcessing(false);

      console.error(
        "Erreur lancement paiement :",
        error
      );

      Alert.alert(
        t.premium.paymentImpossible,
        t.premium.storeOpenError
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

  async function buyShortVideo() {
    await buyProduct(
      VIDEO_SHORT_PRODUCT_ID
    );
  }

  async function buyMediumVideo() {
    await buyProduct(
      VIDEO_MEDIUM_PRODUCT_ID
    );
  }

  function getStorePrice(
    productId: string,
    fallback: string
  ) {
    const product =
      products.find(
        (item) =>
          item.id ===
          productId
      );

    if (!product) {
      return fallback;
    }

    if (
      Platform.OS === "ios"
    ) {
      return (
        product.displayPrice ||
        fallback
      );
    }

    const androidProduct =
      product as ProductAndroid;

    const offers =
      androidProduct.discountOffers ??
      [];

    const discountOffer =
      offers.find(
        (offer) =>
          (offer.percentageDiscountAndroid ??
            0) > 0
      );

    if (discountOffer) {
      return (
        discountOffer.displayPrice ||
        product.displayPrice ||
        fallback
      );
    }

    return (
      product.displayPrice ||
      fallback
    );
  }

  return (
    <LinearGradient
      colors={[
        "#020617",
        "#312E81",
      ]}
      style={
        styles.container
      }
    >
      <SafeAreaView
        style={
          styles.safeArea
        }
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
            style={
              styles.backButton
            }
            onPress={() =>
              router.back()
            }
            disabled={
              processing
            }
          >
            <Text
              style={
                styles.backText
              }
            >
              {t.premium.back}
            </Text>
          </TouchableOpacity>

          <Text
            style={
              styles.title
            }
          >
            {t.premium.title}
          </Text>

          <Text
            style={
              styles.subtitle
            }
          >
            {t.premium.subtitle}
          </Text>

          <View
            style={
              styles.benefitsBox
            }
          >
            <Text
              style={
                styles.benefit
              }
            >
              {t.premium.benefitNarration}
            </Text>

            <Text
              style={
                styles.benefit
              }
            >
              {t.premium.benefitBedtime}
            </Text>

            <Text
              style={
                styles.benefit
              }
            >
              {t.premium.benefitSaved}
            </Text>

            <Text
              style={
                styles.benefit
              }
            >
              {t.premium.benefitIllustrations}
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
                {t.premium.storeConnecting}{" "}
                {STORE_NAME}…
              </Text>
            </View>
          )}

          <View
            style={
              styles.card
            }
          >
            <Text
              style={
                styles.cardIcon
              }
            >
              📖
            </Text>

            <Text
              style={
                styles.cardTitle
              }
            >
              {t.premium.textPackTitle}
            </Text>

            <Text
              style={
                styles.cardPrice
              }
            >
              {getStorePrice(
                TEXT_PRODUCT_ID,
                "2,99 €"
              )}
            </Text>

            <Text
              style={
                styles.cardDescription
              }
            >
              {t.premium.textPackDescription}
            </Text>

            <TouchableOpacity
              style={[
                styles.button,

                (!connected ||
                  processing) &&
                  styles.disabledButton,
              ]}
              onPress={
                buyTextPack
              }
              activeOpacity={
                0.85
              }
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
                  {t.premium.chooseTextPack}
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
              style={
                styles.badge
              }
            >
              <Text
                style={
                  styles.badgeText
                }
              >
                {t.premium.mostMagical}
              </Text>
            </View>

            <Text
              style={
                styles.cardIcon
              }
            >
              🌟
            </Text>

            <Text
              style={
                styles.cardTitle
              }
            >
              {t.premium.illustratedPackTitle}
            </Text>

            <Text
              style={
                styles.cardPrice
              }
            >
              {getStorePrice(
                ILLUSTRATED_PRODUCT_ID,
                "5,99 €"
              )}
            </Text>

            <Text
              style={
                styles.cardDescription
              }
            >
              {t.premium.illustratedPackDescription}
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
              activeOpacity={
                0.85
              }
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
                  {t.premium.chooseIllustratedPack}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <View
            style={
              styles.videoCard
            }
          >
            <View
              style={
                styles.videoBadge
              }
            >
              <Text
                style={
                  styles.videoBadgeText
                }
              >
                {t.premium.fourScenes}
              </Text>
            </View>

            <Text
              style={
                styles.cardIcon
              }
            >
              🎬
            </Text>

            <Text
              style={
                styles.cardTitle
              }
            >
              {t.premium.shortVideoTitle}
            </Text>

            <Text
              style={
                styles.cardPrice
              }
            >
              {getStorePrice(
                VIDEO_SHORT_PRODUCT_ID,
                "6,99 €"
              )}
            </Text>

            <Text
              style={
                styles.cardDescription
              }
            >
              {t.premium.shortVideoDescription}
            </Text>

            <TouchableOpacity
              style={[
                styles.videoPurchaseButton,

                (!connected ||
                  processing) &&
                  styles.disabledButton,
              ]}
              onPress={
                buyShortVideo
              }
              activeOpacity={
                0.85
              }
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
                    styles.videoPurchaseButtonText
                  }
                >
                  {t.premium.buyShortVideo}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <View
            style={
              styles.videoCard
            }
          >
            <View
              style={
                styles.videoBadge
              }
            >
              <Text
                style={
                  styles.videoBadgeText
                }
              >
                {t.premium.sixScenes}
              </Text>
            </View>

            <Text
              style={
                styles.cardIcon
              }
            >
              🎬
            </Text>

            <Text
              style={
                styles.cardTitle
              }
            >
              {t.premium.mediumVideoTitle}
            </Text>

            <Text
              style={
                styles.cardPrice
              }
            >
              {getStorePrice(
                VIDEO_MEDIUM_PRODUCT_ID,
                Platform.OS === "ios"
                  ? "12,99 €"
                  : "11,99 €"
              )}
            </Text>

            <Text
              style={
                styles.cardDescription
              }
            >
              {t.premium.mediumVideoDescription}
            </Text>

            <TouchableOpacity
              style={[
                styles.videoPurchaseButton,

                (!connected ||
                  processing) &&
                  styles.disabledButton,
              ]}
              onPress={
                buyMediumVideo
              }
              activeOpacity={
                0.85
              }
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
                    styles.videoPurchaseButtonText
                  }
                >
                  {t.premium.buyMediumVideo}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <Text
            style={
              styles.footerText
            }
          >
            {t.premium.securePayment}{" "}
            {STORE_NAME}. {t.premium.packContains}
          </Text>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
    },

    safeArea: {
      flex: 1,
    },

    scrollContent: {
      width: "100%",
      maxWidth: 800,
      alignSelf: "center",
      paddingHorizontal: 24,
      paddingTop: 20,
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
      textAlign: "center",
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

    videoCard: {
      backgroundColor: "#EDE9FE",
      borderRadius: 28,
      padding: 24,
      marginBottom: 22,
      alignItems: "center",
      borderWidth: 2,
      borderColor: "#C4B5FD",
    },

    videoBadge: {
      backgroundColor: "#7C3AED",
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 999,
      marginBottom: 14,
    },

    videoBadgeText: {
      color: "white",
      fontWeight: "900",
      fontSize: 13,
    },

    videoPurchaseButton: {
      backgroundColor: "#7C3AED",
      paddingVertical: 16,
      paddingHorizontal: 28,
      borderRadius: 18,
      width: "100%",
      alignItems: "center",
    },

    videoPurchaseButtonText: {
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