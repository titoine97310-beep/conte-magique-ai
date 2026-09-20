import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Image,
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

const MAGICO = require("../assets/images/magico.png");
const PREMIUM_HERO = require("../assets/images/premium-magico-hero.png");
const PREMIUM_TEXT = require("../assets/images/premium-carnet-texte.png");
const PREMIUM_ILLUSTRATED = require("../assets/images/premium-carnet-illustre.png");
const PREMIUM_VIDEO_SHORT = require("../assets/images/premium-video-court.png");
const PREMIUM_VIDEO_MEDIUM = require("../assets/images/premium-video-moyen.png");

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

  const [purchaseCelebration, setPurchaseCelebration] =
    useState<null | {
      title: string;
      message: string;
      actionText: string;
      onContinue: () => void;
    }>(null);

  const sparkleOpacity = useRef(new Animated.Value(0)).current;
  const sparkleScale = useRef(new Animated.Value(0.7)).current;
  const magicoScale = useRef(new Animated.Value(0.75)).current;
  const magicoOpacity = useRef(new Animated.Value(0)).current;

  function playSparkles() {
    sparkleOpacity.setValue(0);
    sparkleScale.setValue(0.7);

    Animated.parallel([
      Animated.sequence([
        Animated.timing(sparkleOpacity, {
          toValue: 1,
          duration: 130,
          useNativeDriver: true,
        }),
        Animated.timing(sparkleOpacity, {
          toValue: 0,
          duration: 520,
          delay: 90,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(sparkleScale, {
        toValue: 1.35,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }

  function showPurchaseCelebration(
    title: string,
    message: string,
    actionText: string,
    onContinue: () => void
  ) {
    magicoScale.setValue(0.75);
    magicoOpacity.setValue(0);

    setPurchaseCelebration({
      title,
      message,
      actionText,
      onContinue,
    });

    requestAnimationFrame(() => {
      Animated.parallel([
        Animated.spring(magicoScale, {
          toValue: 1,
          friction: 5,
          tension: 70,
          useNativeDriver: true,
        }),
        Animated.timing(magicoOpacity, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }

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

          showPurchaseCelebration(
            isShort
              ? t.premium.shortVideoActivated
              : t.premium.mediumVideoActivated,
            isShort
              ? t.premium.shortVideoAdded
              : t.premium.mediumVideoAdded,
            t.premium.chooseStory,
            () =>
              router.replace({
                pathname: "/saved-stories",
                params: {
                  videoPack: isShort ? "4" : "6",
                },
              } as any)
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
          showPurchaseCelebration(
            t.premium.textPackActivated,
            t.premium.textPackAdded,
            t.premium.createStory,
            () =>
              router.replace({
                pathname: "/create-story",
                params: { pack: "text" },
              } as any)
          );

          return;
        }

        if (
          productId ===
          ILLUSTRATED_PRODUCT_ID
        ) {
          showPurchaseCelebration(
            t.premium.illustratedPackActivated,
            t.premium.illustratedPackAdded,
            t.premium.createStory,
            () =>
              router.replace({
                pathname: "/create-story",
                params: { pack: "illustrated" },
              } as any)
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
        "#07142F",
        "#172A63",
        "#312E81",
        "#120A32",
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

          <View style={styles.heroRow}>
            <View style={styles.heroCopy}>
              <Text style={styles.eyebrow}>✦ CONTE MAGIQUE ✦</Text>
              <Text style={styles.title}>
                {t.premium.title}
              </Text>
            </View>

            <View style={styles.heroImageFrame}>
              <Image
                source={PREMIUM_HERO}
                style={styles.heroImage}
                resizeMode="cover"
              />
              <LinearGradient
                colors={["transparent", "rgba(7,20,47,0.88)"]}
                style={styles.heroImageShade}
              />
            </View>
          </View>

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

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>📚</Text>
            <View style={styles.sectionHeaderCopy}>
              <Text style={styles.sectionTitle}>
                {language === "fr"
                  ? "Histoires magiques"
                  : language === "es"
                  ? "Historias mágicas"
                  : "Magical stories"}
              </Text>
              <Text style={styles.sectionSubtitle}>
                {language === "fr"
                  ? "Choisis le carnet qui correspond à ton aventure."
                  : language === "es"
                  ? "Elige el cuaderno que corresponde a tu aventura."
                  : "Choose the story pack for your next adventure."}
              </Text>
            </View>
          </View>

          <View
            style={
              styles.card
            }
          >
            <Image
              source={PREMIUM_TEXT}
              style={styles.storyArtwork}
              resizeMode="cover"
            />
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
              onPress={() => {
                playSparkles();
                void buyTextPack();
              }}
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
            <Image
              source={PREMIUM_ILLUSTRATED}
              style={styles.storyArtwork}
              resizeMode="cover"
            />
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
              onPress={() => {
                playSparkles();
                void buyPremiumPack();
              }}
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

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>🎬</Text>
            <View style={styles.sectionHeaderCopy}>
              <Text style={styles.sectionTitle}>
                {language === "fr"
                  ? "Dessins animés magiques"
                  : language === "es"
                  ? "Dibujos animados mágicos"
                  : "Magical animated stories"}
              </Text>
              <Text style={styles.sectionSubtitle}>
                {language === "fr"
                  ? "Transforme une histoire enregistrée en dessin animé."
                  : language === "es"
                  ? "Transforma una historia guardada en un dibujo animado."
                  : "Turn a saved story into an animated adventure."}
              </Text>
            </View>
          </View>

          <View
            style={
              styles.videoCard
            }
          >

            <Image
              source={PREMIUM_VIDEO_SHORT}
              style={styles.videoArtwork}
              resizeMode="cover"
            />
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
              onPress={() => {
                playSparkles();
                void buyShortVideo();
              }}
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
            <Image
              source={PREMIUM_VIDEO_MEDIUM}
              style={styles.videoArtwork}
              resizeMode="cover"
            />
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
              onPress={() => {
                playSparkles();
                void buyMediumVideo();
              }}
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

        <Animated.View
          pointerEvents="none"
          style={[
            styles.sparkleLayer,
            {
              opacity: sparkleOpacity,
              transform: [{ scale: sparkleScale }],
            },
          ]}
        >
          <Text style={[styles.sparkle, styles.sparkleOne]}>✦</Text>
          <Text style={[styles.sparkle, styles.sparkleTwo]}>✨</Text>
          <Text style={[styles.sparkle, styles.sparkleThree]}>✧</Text>
          <Text style={[styles.sparkle, styles.sparkleFour]}>★</Text>
          <Text style={[styles.sparkle, styles.sparkleFive]}>✦</Text>
        </Animated.View>

        {purchaseCelebration && (
          <View style={styles.celebrationOverlay}>
            <LinearGradient
              colors={["#17104A", "#312E81", "#11183E"]}
              style={styles.celebrationCard}
            >
              <Text style={styles.celebrationStars}>✦ ✨ ✦</Text>

              <Animated.Image
                source={MAGICO}
                resizeMode="contain"
                style={[
                  styles.celebrationMagico,
                  {
                    opacity: magicoOpacity,
                    transform: [{ scale: magicoScale }],
                  },
                ]}
              />

              <View style={styles.successCheck}>
                <Text style={styles.successCheckText}>✓</Text>
              </View>

              <Text style={styles.celebrationTitle}>
                {purchaseCelebration.title}
              </Text>

              <Text style={styles.celebrationMessage}>
                {purchaseCelebration.message}
              </Text>

              <TouchableOpacity
                style={styles.celebrationButton}
                activeOpacity={0.85}
                onPress={() => {
                  const next = purchaseCelebration.onContinue;
                  setPurchaseCelebration(null);
                  next();
                }}
              >
                <Text style={styles.celebrationButtonText}>
                  {purchaseCelebration.actionText}
                </Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        )}
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
      paddingBottom: 70,
    },

    heroRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      marginBottom: 4,
    },

    heroCopy: {
      flex: 1,
    },

    eyebrow: {
      color: "#F7C948",
      fontSize: 12,
      fontWeight: "900",
      letterSpacing: 1.4,
      marginBottom: 5,
    },

    heroImageFrame: {
      width: 118,
      height: 118,
      borderRadius: 26,
      overflow: "hidden",
      borderWidth: 1.5,
      borderColor: "rgba(247,201,72,0.75)",
      backgroundColor: "#11183E",
    },

    heroImage: {
      width: "100%",
      height: "100%",
    },

    heroImageShade: {
      ...StyleSheet.absoluteFillObject,
    },

    storyArtwork: {
      width: "100%",
      height: 210,
      borderRadius: 20,
      marginBottom: 18,
    },

    videoArtwork: {
      width: "100%",
      height: 210,
      borderRadius: 20,
      marginBottom: 18,
    },

    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginTop: 8,
      marginBottom: 14,
      paddingHorizontal: 4,
    },

    sectionIcon: {
      fontSize: 30,
    },

    sectionHeaderCopy: {
      flex: 1,
    },

    sectionTitle: {
      color: "#FFFFFF",
      fontSize: 21,
      fontWeight: "900",
    },

    sectionSubtitle: {
      color: "#C9D3EA",
      fontSize: 13,
      lineHeight: 18,
      marginTop: 2,
    },

    sparkleLayer: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 40,
    },

    sparkle: {
      position: "absolute",
      color: "#FFD86B",
      fontWeight: "900",
      textShadowColor: "rgba(255,216,107,0.8)",
      textShadowRadius: 8,
    },

    sparkleOne: { left: "16%", top: "35%", fontSize: 28 },
    sparkleTwo: { right: "14%", top: "42%", fontSize: 30 },
    sparkleThree: { left: "28%", top: "54%", fontSize: 22 },
    sparkleFour: { right: "28%", top: "58%", fontSize: 20 },
    sparkleFive: { left: "48%", top: "31%", fontSize: 25 },

    celebrationOverlay: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 100,
      backgroundColor: "rgba(2,6,23,0.82)",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 22,
    },

    celebrationCard: {
      width: "100%",
      maxWidth: 430,
      borderRadius: 30,
      borderWidth: 2,
      borderColor: "#F7C948",
      paddingHorizontal: 24,
      paddingTop: 20,
      paddingBottom: 24,
      alignItems: "center",
      shadowColor: "#000",
      shadowOpacity: 0.35,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 16,
    },

    celebrationStars: {
      color: "#FFD86B",
      fontSize: 24,
      fontWeight: "900",
      marginBottom: 2,
    },

    celebrationMagico: {
      width: 150,
      height: 150,
      marginTop: -4,
      marginBottom: -12,
    },

    successCheck: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: "#F7C948",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
      borderWidth: 3,
      borderColor: "#FFF2B5",
    },

    successCheckText: {
      color: "#15204D",
      fontSize: 30,
      fontWeight: "900",
      marginTop: -2,
    },

    celebrationTitle: {
      color: "#FFFFFF",
      fontSize: 25,
      fontWeight: "900",
      textAlign: "center",
      marginBottom: 8,
    },

    celebrationMessage: {
      color: "#DCE5F7",
      fontSize: 15,
      lineHeight: 22,
      textAlign: "center",
      marginBottom: 20,
    },

    celebrationButton: {
      width: "100%",
      backgroundColor: "#F7C948",
      borderRadius: 18,
      paddingVertical: 16,
      paddingHorizontal: 18,
      alignItems: "center",
    },

    celebrationButtonText: {
      color: "#17204A",
      fontSize: 16,
      fontWeight: "900",
      textAlign: "center",
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
      fontSize: 32,
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
      backgroundColor: "rgba(11,28,70,0.96)",
      borderRadius: 26,
      borderWidth: 2,
      borderColor: "#4DB8FF",
      padding: 18,
      marginBottom: 22,
      alignItems: "center",
    },

    premiumCard: {
      backgroundColor: "rgba(54,24,105,0.97)",
      borderRadius: 28,
      padding: 18,
      marginBottom: 22,
      alignItems: "center",
      borderWidth: 2,
      borderColor: "#F7C948",
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
      color: "#FFFFFF",
      marginBottom: 6,
      textAlign: "center",
    },

    cardPrice: {
      fontSize: 42,
      fontWeight: "900",
      color: "#F7C948",
      marginBottom: 10,
    },

    cardDescription: {
      textAlign: "center",
      fontSize: 16,
      color: "#DCE5F7",
      marginBottom: 24,
      lineHeight: 24,
    },

    button: {
      backgroundColor: "#168CFF",
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
      backgroundColor: "#A52EFF",
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
      backgroundColor: "rgba(38,22,91,0.97)",
      borderRadius: 28,
      padding: 18,
      marginBottom: 22,
      alignItems: "center",
      borderWidth: 2,
      borderColor: "#9B6CFF",
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