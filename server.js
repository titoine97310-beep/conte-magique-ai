import {
  AppStoreServerAPIClient,
  Environment,
  SignedDataVerifier,
} from "@apple/app-store-server-library";
import RunwayML, { TaskFailedError } from "@runwayml/sdk";
import cors from "cors";
import crypto from "crypto";
import dotenv from "dotenv";
import express from "express";
import fs from "fs";
import { google } from "googleapis";
import OpenAI from "openai";

import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

dotenv.config();

console.log("Clé OpenAI présente :", !!process.env.OPENAI_API_KEY);

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));
  
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const runway = new RunwayML({
  apiKey: process.env.RUNWAY_API_KEY,
});

const GOOGLE_PLAY_PACKAGE_NAME = "com.contemagiqueia.app";

const GOOGLE_PLAY_PRODUCTS = {
  carnet_15_textes: {
    packType: "text",
    stories: 15,
  },

  carnet_15_histoires: {
    packType: "illustrated",
    stories: 15,
  },
};


const googlePlayAuth = new google.auth.GoogleAuth({
  keyFile: "/etc/secrets/google-play-service-account.json",
  scopes: ["https://www.googleapis.com/auth/androidpublisher"],
});

const androidPublisher = google.androidpublisher({
  version: "v3",
  auth: googlePlayAuth,
});

const APPLE_ISSUER_ID = process.env.APPLE_ISSUER_ID;
const APPLE_KEY_ID = process.env.APPLE_KEY_ID;

const APPLE_KEY_PATH = APPLE_KEY_ID
  ? `/etc/secrets/SubscriptionKey_${APPLE_KEY_ID}.p8`
  : null;

function getApplePrivateKey() {
  if (!APPLE_ISSUER_ID) {
    throw new Error("APPLE_ISSUER_ID manquant.");
  }

  if (!APPLE_KEY_ID) {
    throw new Error("APPLE_KEY_ID manquant.");
  }

  if (!APPLE_KEY_PATH || !fs.existsSync(APPLE_KEY_PATH)) {
    throw new Error(
      `Clé privée Apple introuvable : ${APPLE_KEY_PATH}`
    );
  }

  return fs.readFileSync(APPLE_KEY_PATH, "utf8");
}

const firebaseServiceAccount = JSON.parse(
  fs.readFileSync(
    "/etc/secrets/firebase-service-account.json",
    "utf8"
  )
);

const firebaseAdminApp = initializeApp({
  credential: cert(firebaseServiceAccount),
  projectId: "contemagiqueia",
});

const firebaseAuth = getAuth(firebaseAdminApp);
const adminDb = getFirestore(firebaseAdminApp);

function createAppleClient(environment) {
  const privateKey = getApplePrivateKey();

  return new AppStoreServerAPIClient(
    privateKey,
    APPLE_KEY_ID,
    APPLE_ISSUER_ID,
    APPLE_BUNDLE_ID,
    environment
  );
}

app.get("/", (req, res) => {
  res.send("Backend ConteMagiqueIA OK");
});
function detectRequestedLanguage(prompt = "") {
  const text = prompt.toLowerCase();

  const languages = [
    {
      name: "espagnol",
      patterns: ["en espagnol", "en español", "in spanish"],
    },
    {
      name: "anglais",
      patterns: ["en anglais", "in english", "en inglés"],
    },
    {
      name: "français",
      patterns: ["en français", "in french", "en francés"],
    },
    {
      name: "portugais",
      patterns: ["en portugais", "em português", "in portuguese"],
    },
    {
      name: "italien",
      patterns: ["en italien", "in italian", "in italiano"],
    },
    {
      name: "allemand",
      patterns: ["en allemand", "auf deutsch", "in german"],
    },
    {
      name: "créole guadeloupéen",
      patterns: [
        "en créole guadeloupéen",
        "en creole guadeloupeen",
        "an kréyòl gwadloupéyen",
      ],
    },
    {
      name: "créole martiniquais",
      patterns: [
        "en créole martiniquais",
        "en creole martiniquais",
        "an kréyòl matnik",
      ],
    },
    {
      name: "créole guyanais",
      patterns: [
        "en créole guyanais",
        "en creole guyanais",
        "an kréyòl gwiyannen",
      ],
    },
    {
      name: "créole réunionnais",
      patterns: [
        "en créole réunionnais",
        "en creole reunionnais",
        "an kréol réyoné",
      ],
    },
    {
      name: "créole haïtien",
      patterns: [
        "en créole haïtien",
        "en creole haitien",
        "an kreyòl ayisyen",
      ],
    },
  ];

  for (const language of languages) {
    if (language.patterns.some((pattern) => text.includes(pattern))) {
      return language.name;
    }
  }

  return null;
}

app.post("/story", async (req, res) => {
  try {
    const { prompt, type = "magic", sceneCount = 4 } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt manquant" });
    }

    const requestedLanguage = detectRequestedLanguage(prompt);

    console.log("Langue explicitement demandée :", requestedLanguage);
    console.log("Prompt reçu :", prompt);

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
Tu es un conteur pour enfants talentueux, chaleureux et expressif.

OBJECTIF :
Créer une histoire agréable à écouter à voix haute, avec du rythme, des émotions et des pauses naturelles.

Type d’histoire choisi : ${type}
Nombre exact de scènes : ${sceneCount}

Réponds UNIQUEMENT en JSON strict :

{
  "characters": "description précise des personnages principaux de CETTE histoire",
  "scenes": [
    {
      "text": "texte de la scène",
      "imagePrompt": "description visuelle précise en français",
      "ambience": "magic"
    }
  ]
}

Ambiences possibles :
magic, forest, ocean, night, danger, calm, victory

RÈGLES :
- Crée exactement ${sceneCount} scènes.
- Texte simple pour enfant de 4 à 8 ans.
- L’histoire doit suivre précisément l’idée de l’utilisateur.
- Chaque scène doit faire avancer l’histoire.
- Fin heureuse ou cliffhanger doux selon le type d’histoire.
- Pas de violence graphique.
- Si l’utilisateur demande un personnage connu, transforme-le en personnage original inspiré du rôle général.
- Retourne toujours une clé "characters".
- "characters" décrit uniquement les personnages principaux de CETTE histoire.
- Ne jamais réutiliser des personnages d’une autre histoire.
- Les personnages doivent rester cohérents dans toutes les scènes : mêmes couleurs, même apparence, mêmes accessoires.
- Les personnages secondaires et la famille doivent être cohérents avec le personnage principal.
- Si un enfant est métis, noir, asiatique ou possède des traits culturels spécifiques, sa famille et son entourage proche doivent généralement partager une cohérence visuelle et familiale.
- Évite que tous les personnages secondaires soient automatiquement blancs par défaut.
- Les personnages doivent représenter naturellement différentes origines et apparences selon l’histoire.
- Respecte la cohérence familiale, culturelle et visuelle entre les personnages.
- imagePrompt doit respecter les personnages décrits dans "characters".
- imagePrompt doit être visuel, cohérent, précis et adapté au style choisi.

NARRATION AUDIO :
- Le texte doit être naturel à lire à voix haute.
- Ajoute parfois des pauses avec "..." pour ralentir.
- Utilise quelques interjections simples seulement si utile : oh..., ah..., wouah..., zut...
- Varie les phrases courtes et moyennes.
- Utilise ? ! ... pour guider la voix.

ÉMOTIONS :
- Fais ressentir : surprise, joie, peur douce, curiosité.
- Adapte le ton selon le type d’histoire.
- Ajoute des moments calmes et des moments dynamiques.

AMBIANCES :
- magic : découverte magique, fée, objet magique, portail
- forest : forêt, animaux, nature, arbre, jungle
- ocean : mer, bateau, pirate, plage, vague
- night : nuit, sommeil, étoiles, histoire du soir
- danger : tension légère, méchant, poursuite, peur douce
- calm : moment tendre, repos, discussion, douceur
- victory : réussite, fête, fin heureuse, célébration

Selon le type :
- funny : drôle, absurde, léger, personnages rigolos.
- adventure : action, exploration, défi, rythme dynamique.
- magic : féerique, objets magiques, émerveillement.
- mystery : suspense doux, secret, indice, révélation.

VARIÉTÉ :
- Évite de réutiliser souvent les mêmes prénoms.
- N’utilise presque jamais : Léo, Nina, Noé, Emma, Lila, Lucas.
- Crée des noms originaux, rares, poétiques ou amusants.
- Utilise parfois des noms fantastiques, inventés, surnoms ou noms liés à l’univers.
- Les personnages doivent sembler uniques d’une histoire à l’autre.

LANGUE DE L’HISTOIRE :

- Détermine la langue finale à utiliser selon la demande de l’utilisateur.
- Si l’utilisateur demande explicitement une langue, cette demande est prioritaire, même si le reste du texte est écrit dans une autre langue.
- Exemple : si l’utilisateur écrit en français « raconte cette histoire en espagnol », écris toute l’histoire en espagnol.
- Si aucune langue n’est demandée explicitement, écris l’histoire dans la langue principale utilisée par l’utilisateur.
- L’utilisateur peut décrire son idée dans une langue et demander que l’histoire soit racontée dans une autre langue.
- Traduis naturellement l’idée de l’utilisateur dans la langue demandée, sans modifier le sens.
- Ne mélange pas plusieurs langues, sauf demande explicite.
- Tous les textes destinés à être lus doivent être dans la langue finale : scènes, dialogues et narration.
- La clé "characters" doit aussi être écrite dans la langue finale.
- La clé "imagePrompt" peut rester en français ou en anglais pour optimiser la génération des images.
- Pour les créoles, respecte précisément la variante demandée.

Aucun texte avant ou après le JSON.
          `,
        },
        {
  role: "user",
  content: requestedLanguage
    ? `
LANGUE FINALE OBLIGATOIRE : ${requestedLanguage}.

L’utilisateur a écrit sa demande dans une langue, mais il souhaite que toute
l’histoire soit rédigée exclusivement en ${requestedLanguage}.

Traduis naturellement son idée dans cette langue sans modifier le sens.
Ne réponds pas dans la langue utilisée pour écrire la demande.

Demande de l’utilisateur :
${prompt}
`
    : `
Aucune langue finale n’a été explicitement demandée.

Détecte la langue principale de la demande et rédige toute l’histoire dans
cette même langue.

Demande de l’utilisateur :
${prompt}
`,
},
      ],
    });

    let content = response.choices[0].message.content || "";

    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");

    if (start !== -1 && end !== -1) {
      content = content.slice(start, end + 1);
    }

    const story = JSON.parse(content);

    return res.json(story);
  } catch (e) {
    console.error("Erreur /story :", e);

    return res.status(500).json({
      error: "Erreur génération histoire",
      message: e?.message,
    });
  }
});

function sanitizePrompt(prompt) {
  return prompt
    .replace(/batman/gi, "super-héros original sombre avec cape noire")
    .replace(/superman/gi, "super-héros original lumineux avec cape rouge")
    .replace(/spider[- ]?man/gi, "héros agile en tenue rouge et bleue")
    .replace(/iron man/gi, "héros en armure futuriste")
    .replace(/hulk/gi, "géant vert puissant")
    .replace(/disney|marvel|dc/gi, "univers imaginaire");
}

function getImageStylePrompt(prompt) {
  const lowerPrompt = prompt.toLowerCase();

  if (
    lowerPrompt.includes("realistic") ||
    lowerPrompt.includes("réaliste") ||
    lowerPrompt.includes("cinematic")
  ) {
    return `
Photographie réaliste, style cinéma familial.
Lumière naturelle, profondeur de champ, détails précis.
Textures réalistes, environnement crédible.
Pas de style dessin, pas cartoon, pas illustration.
Adapté aux enfants, doux, rassurant.
Décris précisément l’apparence des personnages importants.
`;
  }

  if (lowerPrompt.includes("fantasy")) {
    return `
Illustration fantasy magique.
Lumières féeriques, couleurs riches, ambiance mystique.
Personnages expressifs, style premium, doux et familial.
`;
  }

  if (lowerPrompt.includes("comic") || lowerPrompt.includes("bd")) {
    return `
Style bande dessinée moderne.
Contours nets, couleurs dynamiques, composition lisible.
Ambiance familiale, expressive et adaptée aux enfants.
`;
  }

  return `
Illustration 3D familiale, colorée et lumineuse.
Personnages expressifs, ambiance magique et douce.
Style premium, cohérent entre les scènes.
`;
}

app.post("/image", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt?.trim()) {
      return res.status(400).json({
        error: "Prompt image manquant",
      });
    }

    const safePrompt = sanitizePrompt(prompt);
    const stylePrompt = getImageStylePrompt(safePrompt);

    const finalPrompt = `
${stylePrompt}

Consignes de sécurité :
- personnages originaux uniquement
- aucun logo
- aucune marque
- aucune violence graphique
- scène adaptée aux enfants

Scène à générer :
${safePrompt}
`;

    const result = await openai.images.generate({
      model: "gpt-image-1",
      prompt: finalPrompt,
      size: "1024x1024",
      quality: "medium",
    });

    const base64 = result.data?.[0]?.b64_json;

    if (!base64) {
      throw new Error("Aucune image retournée par OpenAI");
    }

    return res.json({
      imageUrl: `data:image/png;base64,${base64}`,
    });
  } catch (e) {
    console.error("Erreur /image complète :", e);

    return res.status(500).json({
      error: "Erreur génération image",
      message: e?.message,
      status: e?.status,
    });
  }
});

app.post("/tts", async (req, res) => {
  console.log("Requête TTS reçue :", req.body?.text?.slice(0, 80));

  try {
    const {
      text,
      mode = "story",
      emotion = "warm",
      narrator = "narratrice",
    } = req.body;

    if (!text?.trim()) {
      return res.status(400).json({
        error: "Texte manquant",
      });
    }

    const narratorProfiles = {
  narratrice: {
    voice: "nova",
    instructions: `
Lis comme une conteuse chaleureuse pour enfants.
Voix naturelle, douce, expressive.
Raconte comme une maman lisant une histoire.
`,
  },

  narrateur: {
    voice: "onyx",
    instructions: `
Lis comme un papa racontant une histoire.
Voix grave, rassurante, naturelle, expressive.
Prends ton temps et fais des pauses naturelles.
`,
  },

  magicien: {
    voice: "sage",
    instructions: `
Lis comme un vieux magicien bienveillant.
Voix mystérieuse mais chaleureuse, expressive, naturelle
`,
  },

  fee: {
    voice: "shimmer",
    instructions: `
Lis comme une fée joyeuse.
Voix légère, lumineuse, pleine d'émerveillement, naturelle, expressive.
`,
  },

  mamie: {
    voice: "ballad",
    instructions: `
Lis comme une grand-mère racontant un conte à ses petits-enfants.
Voix très douce, lente et affectueuse, expressive, naturelle.
`,
  },

  garcon: {
    voice: "echo",
    instructions: `
Lis comme un jeune garçon racontant une aventure.
Voix vive, enthousiaste et naturelle, expressive.
`,
  },
};

    const profile =
      narratorProfiles[narrator] || narratorProfiles.narratrice;

    console.log("Narrateur reçu :", narrator);
    console.log("Voix choisie :", profile.voice);

    let emotionInstructions = "";

    if (emotion === "danger") {
      emotionInstructions =
        "Ajoute un suspense très léger, sans jamais devenir effrayant.";
    } else if (emotion === "victory") {
      emotionInstructions =
        "Utilise un ton joyeux et chaleureux.";
    } else if (emotion === "calm") {
      emotionInstructions =
        "Utilise un ton doux et paisible.";
    } else if (emotion === "night") {
      emotionInstructions =
        "Utilise un ton calme et rassurant.";
    }

    const bedtimeInstructions =
      mode === "bedtime"
        ? `
Cette lecture est destinée au coucher.
Parle calmement et marque davantage les pauses.
`
        : "";

    const instructions = `
${profile.instructions}

${emotionInstructions}

${bedtimeInstructions}

Respecte exactement la langue du texte fourni.
Prononce les mots naturellement.
`;

    const response = await openai.audio.speech.create({
  model: "gpt-4o-mini-tts",
  voice: profile.voice,
  input: text,
  instructions,
  response_format: "mp3",
});

    const buffer = Buffer.from(await response.arrayBuffer());

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", buffer.length.toString());

    return res.send(buffer);
  } catch (e) {
    console.error("Erreur TTS complète :", e);

    return res.status(500).json({
      error: "Erreur génération TTS",
      message: e?.message,
      status: e?.status,
    });
  }
});

app.post("/google-play/verify-purchase", async (req, res) => {
  console.log("🛒 Requête Google Play reçue");
console.log("🛒 productId :", req.body?.productId);
console.log("🛒 purchaseToken présent :", !!req.body?.purchaseToken);
console.log("🔥 Authorization présente :", !!req.headers.authorization);

  try {
    const authorization = req.headers.authorization || "";

    if (!authorization.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Authentification Firebase requise.",
      });
    }

    const idToken = authorization.substring(7);

    const decodedToken =
      await firebaseAuth.verifyIdToken(idToken);

    const uid = decodedToken.uid;

    const { productId, purchaseToken } = req.body;

    if (!productId || !purchaseToken) {
      return res.status(400).json({
        error: "productId et purchaseToken sont obligatoires.",
      });
    }

    const productConfig =
      GOOGLE_PLAY_PRODUCTS[productId];

    if (!productConfig) {
      return res.status(400).json({
        error: "Produit Google Play inconnu.",
      });
    }

    const purchaseResponse =
      await androidPublisher.purchases.productsv2.getproductpurchasev2({
        packageName: GOOGLE_PLAY_PACKAGE_NAME,
        token: purchaseToken,
      });

    const purchase = purchaseResponse.data;

    const purchaseState =
      purchase.purchaseStateContext?.purchaseState;

    if (purchaseState !== "PURCHASED") {
      return res.status(400).json({
        error: "L'achat n'est pas encore validé.",
        purchaseState,
      });
    }

    const purchasedItem =
      purchase.productLineItem?.find(
        (item) => item.productId === productId
      );

    if (!purchasedItem) {
      return res.status(400).json({
        error:
          "Le produit acheté ne correspond pas au produit demandé.",
      });
    }

    const consumptionState =
      purchasedItem.productOfferDetails?.consumptionState;

    const purchaseHash = crypto
      .createHash("sha256")
      .update(purchaseToken)
      .digest("hex");

    const userRef =
      adminDb.collection("users").doc(uid);

    const purchaseRef =
      adminDb
        .collection("googlePlayPurchases")
        .doc(purchaseHash);

    let alreadyCredited = false;

    await adminDb.runTransaction(
      async (transaction) => {
        const purchaseSnapshot =
          await transaction.get(purchaseRef);

        if (purchaseSnapshot.exists) {
          const existingPurchase =
            purchaseSnapshot.data();

          if (
            existingPurchase.uid !== uid ||
            existingPurchase.productId !== productId
          ) {
            throw new Error(
              "Ce paiement a déjà été associé à un autre compte ou produit."
            );
          }

          alreadyCredited = true;
          return;
        }

        const userSnapshot =
          await transaction.get(userRef);

        if (!userSnapshot.exists) {
          throw new Error(
            "Profil utilisateur introuvable."
          );
        }

        transaction.update(userRef, {
          [`packs.${productConfig.packType}.storiesRemaining`]:
            FieldValue.increment(
              productConfig.stories
            ),

          [`packs.${productConfig.packType}.purchases`]:
            FieldValue.increment(1),
        });

        transaction.set(purchaseRef, {
          uid,
          productId,
          packType: productConfig.packType,
          stories: productConfig.stories,
          orderId: purchase.orderId || null,
          creditedAt:
            new Date().toISOString(),
          consumed: false,
        });
      }
    );

    return res.json({
      success: true,
      alreadyCredited,
      productId,
      packType: productConfig.packType,
      stories: productConfig.stories,
    });
  } catch (error) {
    console.error(
      "Erreur vérification Google Play :",
      error
    );

    return res.status(500).json({
      error:
        "Impossible de vérifier l'achat Google Play.",
      message: error?.message,
    });
  }
});

const APPLE_APP_ID = 6805620727;

const APPLE_ROOT_CA_URLS = [
  "https://www.apple.com/appleca/AppleIncRootCertificate.cer",
  "https://www.apple.com/certificateauthority/AppleRootCA-G2.cer",
  "https://www.apple.com/certificateauthority/AppleRootCA-G3.cer",
];

let appleRootCertificatesCache = null;

async function getAppleRootCertificates() {
  if (appleRootCertificatesCache) {
    return appleRootCertificatesCache;
  }

  const certificates = await Promise.all(
    APPLE_ROOT_CA_URLS.map(async (url) => {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(
          `Impossible de télécharger un certificat Apple (${response.status}).`
        );
      }

      return Buffer.from(await response.arrayBuffer());
    })
  );

  appleRootCertificatesCache = certificates;

  return certificates;
}

async function createAppleVerifier(environment) {
  const rootCertificates =
    await getAppleRootCertificates();

  return new SignedDataVerifier(
    rootCertificates,
    true,
    environment,
    APPLE_BUNDLE_ID,
    environment === Environment.PRODUCTION
      ? APPLE_APP_ID
      : undefined
  );
}

async function verifyAppleTransaction(transactionId) {
  const environments = [
    Environment.PRODUCTION,
    Environment.SANDBOX,
  ];

  let lastError = null;

  for (const environment of environments) {
    try {
      const client =
        createAppleClient(environment);

      const response =
        await client.getTransactionInfo(
          transactionId
        );

      if (!response?.signedTransactionInfo) {
        throw new Error(
          "Apple n'a retourné aucune transaction signée."
        );
      }

      const verifier =
        await createAppleVerifier(environment);

      const transaction =
        await verifier.verifyAndDecodeTransaction(
          response.signedTransactionInfo
        );

      return {
        transaction,
        environment,
      };
    } catch (error) {
      lastError = error;

      console.log(
        `Échec vérification Apple ${environment} :`,
        error?.message || error
      );
    }
  }

  throw (
    lastError ||
    new Error(
      "Impossible de vérifier la transaction Apple."
    )
  );
}

app.post(
  "/apple/verify-purchase",
  async (req, res) => {
    console.log("🍎 Requête Apple reçue");
    console.log(
      "🍎 productId :",
      req.body?.productId
    );
    console.log(
      "🍎 transactionId présent :",
      !!req.body?.transactionId
    );

    try {
      const authorization =
        req.headers.authorization || "";

      if (
        !authorization.startsWith("Bearer ")
      ) {
        return res.status(401).json({
          error:
            "Authentification Firebase requise.",
        });
      }

      const idToken =
        authorization.substring(7);

      const decodedToken =
        await firebaseAuth.verifyIdToken(
          idToken
        );

      const uid = decodedToken.uid;

      const {
        productId,
        transactionId,
      } = req.body;

      if (!productId || !transactionId) {
        return res.status(400).json({
          error:
            "productId et transactionId sont obligatoires.",
        });
      }

      const productConfig =
        APPLE_PRODUCTS[productId];

      if (!productConfig) {
        return res.status(400).json({
          error:
            "Produit Apple inconnu.",
        });
      }

      const {
        transaction,
        environment,
      } = await verifyAppleTransaction(
        String(transactionId)
      );

      if (
        transaction.bundleId !==
        APPLE_BUNDLE_ID
      ) {
        return res.status(400).json({
          error:
            "La transaction ne correspond pas à ConteMagiqueIA.",
        });
      }

      if (
        transaction.productId !==
        productId
      ) {
        return res.status(400).json({
          error:
            "Le produit acheté ne correspond pas au produit demandé.",
        });
      }

      if (!transaction.transactionId) {
        return res.status(400).json({
          error:
            "Identifiant de transaction Apple manquant.",
        });
      }

      if (transaction.revocationDate) {
        return res.status(400).json({
          error:
            "Cette transaction Apple a été révoquée ou remboursée.",
        });
      }

      const verifiedTransactionId =
        String(
          transaction.transactionId
        );

      const purchaseHash = crypto
        .createHash("sha256")
        .update(verifiedTransactionId)
        .digest("hex");

      const userRef =
        adminDb
          .collection("users")
          .doc(uid);

      const purchaseRef =
        adminDb
          .collection("applePurchases")
          .doc(purchaseHash);

      let alreadyCredited = false;

      await adminDb.runTransaction(
        async (firestoreTransaction) => {
          const purchaseSnapshot =
            await firestoreTransaction.get(
              purchaseRef
            );

          if (
            purchaseSnapshot.exists
          ) {
            const existingPurchase =
              purchaseSnapshot.data();

            if (
              existingPurchase.uid !== uid ||
              existingPurchase.productId !==
                productId
            ) {
              throw new Error(
                "Cette transaction Apple a déjà été associée à un autre compte ou produit."
              );
            }

            alreadyCredited = true;
            return;
          }

          const userSnapshot =
            await firestoreTransaction.get(
              userRef
            );

          if (!userSnapshot.exists) {
            throw new Error(
              "Profil utilisateur introuvable."
            );
          }

          firestoreTransaction.update(
            userRef,
            {
              [`packs.${productConfig.packType}.storiesRemaining`]:
                FieldValue.increment(
                  productConfig.stories
                ),

              [`packs.${productConfig.packType}.purchases`]:
                FieldValue.increment(1),
            }
          );

          firestoreTransaction.set(
            purchaseRef,
            {
              uid,
              productId,
              packType:
                productConfig.packType,

              stories:
                productConfig.stories,

              transactionId:
                verifiedTransactionId,

              originalTransactionId:
                transaction.originalTransactionId
                  ? String(
                      transaction.originalTransactionId
                    )
                  : null,

              environment:
                String(environment),

              purchaseDate:
                transaction.purchaseDate
                  ? new Date(
                      transaction.purchaseDate
                    ).toISOString()
                  : null,

              creditedAt:
                new Date().toISOString(),
            }
          );
        }
      );

      return res.json({
        success: true,
        alreadyCredited,
        productId,
        packType:
          productConfig.packType,
        stories:
          productConfig.stories,
        transactionId:
          verifiedTransactionId,
      });
    } catch (error) {
      console.error(
        "Erreur vérification Apple :",
        error
      );

      return res.status(500).json({
        error:
          "Impossible de vérifier l'achat Apple.",
        message: error?.message,
      });
    }
  }
);

// =========================
// 🎬 RUNWAY - IMAGE TO VIDEO
// =========================
app.post("/video", async (req, res) => {
  try {
    const { imageUrl, prompt } = req.body;

    if (!imageUrl) {
      return res.status(400).json({
        error: "imageUrl manquant",
      });
    }

    console.log("🎬 Génération vidéo Runway...");

    const task = await runway.imageToVideo
      .create({
        model: "gen4.5",
        promptImage: imageUrl,
        promptText:
          prompt ||
          "Gentle children's story animation. Subtle natural movements, soft cinematic camera movement, preserve the original characters, faces, clothing, colors and visual style.",
        ratio: "720:1280",
        duration: 5,
      })
      .waitForTaskOutput();

    const videoUrl = task?.output?.[0];

    if (!videoUrl) {
      throw new Error(
        "Runway n'a retourné aucune vidéo"
      );
    }

    console.log("✅ Vidéo Runway générée");

    return res.json({
      videoUrl,
    });
  } catch (error) {
    console.error(
      "❌ Erreur génération vidéo Runway :",
      error
    );

    if (error instanceof TaskFailedError) {
      console.error(
        "Détails Runway :",
        error.taskDetails
      );
    }

    return res.status(500).json({
      error: "Erreur génération vidéo",
      details: error?.message,
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend lancé sur ${PORT}`);
});