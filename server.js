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
import OpenAI, { toFile } from "openai";

import { spawn } from "child_process";
import ffmpegPath from "ffmpeg-static";
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import os from "os";
import path from "path";

dotenv.config();

console.log("Clé OpenAI présente :", !!process.env.OPENAI_API_KEY);

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));
  
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function downloadFile(url, outputPath) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Erreur téléchargement vidéo : ${response.status}`
    );
  }

  const arrayBuffer = await response.arrayBuffer();

  await fs.promises.writeFile(
    outputPath,
    Buffer.from(arrayBuffer)
  );
}

async function mergeVideoClips(videoUrls, generationId) {
  if (!ffmpegPath) {
    throw new Error("FFmpeg introuvable.");
  }

  if (!Array.isArray(videoUrls) || videoUrls.length === 0) {
    throw new Error("Aucune vidéo à assembler.");
  }

  const tempDir = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), "contemagiqueia-video-")
  );

  try {
    const localFiles = [];

    for (let i = 0; i < videoUrls.length; i++) {
      const localPath = path.join(
        tempDir,
        `scene-${i + 1}.mp4`
      );

      await downloadFile(
        videoUrls[i],
        localPath
      );

      localFiles.push(localPath);
    }

    const concatFilePath = path.join(
      tempDir,
      "concat.txt"
    );

    const concatContent = localFiles
      .map(
        (filePath) =>
          `file '${filePath.replace(/'/g, "'\\''")}'`
      )
      .join("\n");

    await fs.promises.writeFile(
      concatFilePath,
      concatContent,
      "utf8"
    );

    const outputPath = path.join(
      tempDir,
      `${generationId}-final.mp4`
    );

    await new Promise((resolve, reject) => {
      const ffmpeg = spawn(
        ffmpegPath,
        [
          "-y",
          "-f",
          "concat",
          "-safe",
          "0",
          "-i",
          concatFilePath,
          "-c",
          "copy",
          outputPath,
        ],
        {
          windowsHide: true,
        }
      );

      let stderr = "";

      ffmpeg.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      ffmpeg.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(
            new Error(
              `FFmpeg a échoué avec le code ${code}.\n${stderr}`
            )
          );
        }
      });

      ffmpeg.on("error", reject);
    });

    function getNarratorProfile(narrator = "narratrice") {
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
Voix mystérieuse mais chaleureuse, expressive, naturelle.
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

  return (
    narratorProfiles[narrator] ||
    narratorProfiles.narratrice
  );
}

async function createNarrationMp3({
  text,
  mode = "story",
  emotion = "warm",
  narrator = "narratrice",
}) {
  if (!text?.trim()) {
    throw new Error(
      "Texte de narration manquant."
    );
  }

  const profile =
    getNarratorProfile(narrator);

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

  const response =
    await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: profile.voice,
      input: text,
      instructions,
      response_format: "mp3",
    });

  return Buffer.from(
    await response.arrayBuffer()
  );
}

async function createNarratedSceneVideo({
  videoUrl,
  sceneText,
  emotion,
  narrator,
  mode,
  sceneIndex,
  tempDir,
}) {
  if (!ffmpegPath) {
    throw new Error("FFmpeg introuvable.");
  }

  const sourceVideoPath =
    path.join(
      tempDir,
      `source-${sceneIndex + 1}.mp4`
    );

  const narrationPath =
    path.join(
      tempDir,
      `narration-${sceneIndex + 1}.mp3`
    );

  const outputPath =
    path.join(
      tempDir,
      `narrated-${sceneIndex + 1}.mp4`
    );

  await downloadFile(
    videoUrl,
    sourceVideoPath
  );

  const narrationBuffer =
    await createNarrationMp3({
      text: sceneText,
      mode,
      emotion,
      narrator,
    });

  await fs.promises.writeFile(
    narrationPath,
    narrationBuffer
  );

  await new Promise((resolve, reject) => {
    const ffmpeg = spawn(
      ffmpegPath,
      [
        "-y",

        // La vidéo de 5 s boucle si la narration est plus longue.
        "-stream_loop",
        "-1",
        "-i",
        sourceVideoPath,

        "-i",
        narrationPath,

        "-map",
        "0:v:0",
        "-map",
        "1:a:0",

        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "20",

        "-c:a",
        "aac",
        "-b:a",
        "160k",

        "-pix_fmt",
        "yuv420p",

        // Coupe dès que la narration se termine.
        "-shortest",

        "-movflags",
        "+faststart",

        outputPath,
      ],
      {
        windowsHide: true,
      }
    );

    let stderr = "";

    ffmpeg.stderr.on(
      "data",
      (data) => {
        stderr += data.toString();
      }
    );

    ffmpeg.on(
      "close",
      (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(
            new Error(
              `FFmpeg narration scène ${
                sceneIndex + 1
              } échouée.\n${stderr}`
            )
          );
        }
      }
    );

    ffmpeg.on(
      "error",
      reject
    );
  });

  return outputPath;
}

    const finalBuffer =
      await fs.promises.readFile(outputPath);

    return {
      buffer: finalBuffer,
      tempDir,
    };
  } catch (error) {
    await fs.promises.rm(
      tempDir,
      {
        recursive: true,
        force: true,
      }
    );

    throw error;
  }
}

const runway = new RunwayML({
  apiKey: process.env.RUNWAY_API_KEY,
});

const GOOGLE_PLAY_PACKAGE_NAME = "com.contemagiqueia.app";

const GOOGLE_PLAY_PRODUCTS = {
  carnet_15_textes: {
    type: "story",
    packType: "text",
    stories: 15,
  },

  carnet_15_histoires: {
    type: "story",
    packType: "illustrated",
    stories: 15,
  },

  dessin_anime_4_scenes: {
    type: "video",
    videoType: "short",
    scenes: 4,
    credits: 1,
  },

  dessin_anime_6_scenes: {
    type: "video",
    videoType: "medium",
    scenes: 6,
    credits: 1,
  },
};

const APPLE_PRODUCTS = {
  carnet_15_textes: {
    type: "story",
    packType: "text",
    stories: 15,
  },

  carnet_15_histoires: {
    type: "story",
    packType: "illustrated",
    stories: 15,
  },

  dessin_anime_4_scenes: {
    type: "video",
    videoType: "short",
    scenes: 4,
    credits: 1,
  },

  dessin_anime_6_scenes: {
    type: "video",
    videoType: "medium",
    scenes: 6,
    credits: 1,
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
  storageBucket: "contemagiqueia.firebasestorage.app",
});

const firebaseAuth = getAuth(firebaseAdminApp);
const adminDb = getFirestore(firebaseAdminApp);
const adminStorage = getStorage(firebaseAdminApp);

async function requireFirebaseUser(req, res) {
  const authorization =
    req.headers.authorization || "";

  if (!authorization.startsWith("Bearer ")) {
    res.status(401).json({
      error: "Authentification Firebase requise.",
    });

    return null;
  }

  try {
    const idToken = authorization.substring(7);

    const decodedToken =
      await firebaseAuth.verifyIdToken(idToken);

    return decodedToken;
  } catch (error) {
    console.error(
      "❌ Token Firebase invalide :",
      error?.message
    );

    res.status(401).json({
      error: "Session Firebase invalide.",
    });

    return null;
  }
}

async function requireAdminUser(req, res) {
  const decodedToken =
    await requireFirebaseUser(req, res);

  if (!decodedToken) {
    return null;
  }

  const userSnapshot =
    await adminDb
      .collection("users")
      .doc(decodedToken.uid)
      .get();

  if (!userSnapshot.exists) {
    res.status(403).json({
      error: "Profil administrateur introuvable.",
    });

    return null;
  }

  const userData =
    userSnapshot.data() || {};

  if (userData.role !== "admin") {
    res.status(403).json({
      error: "Accès administrateur requis.",
    });

    return null;
  }

  return decodedToken;
}

async function sendExpoPushNotification({
  to,
  title,
  body,
  data = {},
}) {
  const response = await fetch(
    "https://exp.host/--/api/v2/push/send",
    {
      method: "POST",

      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        to,
        sound: "default",
        title,
        body,
        data,
      }),
    }
  );

  const result =
    await response.json();

  if (!response.ok) {
    throw new Error(
      `Erreur Expo Push : ${JSON.stringify(result)}`
    );
  }

  return result;
}

async function reserveVideoCredit(
  uid,
  sceneCount,
  imagesHash,
  videoModel
) {
  const userRef =
    adminDb.collection("users").doc(uid);

  const generationRef =
    adminDb.collection("videoGenerations").doc();

  // 4 scènes = crédit Court
  // 6 scènes = crédit Moyen
  const videoType =
    sceneCount === 4
      ? "short"
      : sceneCount === 6
        ? "medium"
        : null;

  if (!videoType) {
    const error = new Error(
      "Nombre de scènes non compatible avec un crédit vidéo."
    );

    error.code = "INVALID_VIDEO_SCENE_COUNT";
    throw error;
  }

  await adminDb.runTransaction(
    async (transaction) => {
      const userSnapshot =
        await transaction.get(userRef);

      if (!userSnapshot.exists) {
        throw new Error(
          "Profil utilisateur introuvable."
        );
      }

      const userData =
        userSnapshot.data() || {};

      const remaining =
        userData.videoCredits?.[videoType]
          ?.remaining || 0;

      if (remaining <= 0) {
        const error = new Error(
          videoType === "short"
            ? "Aucun crédit dessin animé Court disponible."
            : "Aucun crédit dessin animé Moyen disponible."
        );

        error.code = "NO_VIDEO_CREDIT";
        throw error;
      }

      transaction.update(userRef, {
        [`videoCredits.${videoType}.remaining`]:
          FieldValue.increment(-1),

        [`videoCredits.${videoType}.reserved`]:
          FieldValue.increment(1),
      });

      transaction.set(generationRef, {
        uid,

        type: "full_story_video",
        videoType,
        appCredits: 1,

        status: "reserved",

        sceneCount,
        completedScenes: 0,

        // Permet de vérifier que la reprise
        // concerne bien les mêmes images.
        imagesHash,

        model: videoModel,
        secondsPerScene: 5,

        createdAt:
          FieldValue.serverTimestamp(),

        completedAt: null,
        refundedAt: null,
      });
    }
  );

  return generationRef;
}

async function refundVideoCredit(
  uid,
  generationRef
) {
  const userRef =
    adminDb.collection("users").doc(uid);

  await adminDb.runTransaction(
    async (transaction) => {
      const generationSnapshot =
        await transaction.get(generationRef);

      if (!generationSnapshot.exists) {
        return;
      }

      const generation =
        generationSnapshot.data();

      // Empêche tout double remboursement.
      if (
  generation.status !== "reserved" &&
  generation.status !== "partial"
) {
  return;
}

      if (generation.uid !== uid) {
        throw new Error(
          "Utilisateur incorrect pour ce remboursement."
        );
      }

      const videoType =
  generation.videoType;

if (
  videoType !== "short" &&
  videoType !== "medium"
) {
  throw new Error(
    "Type de crédit vidéo invalide pour le remboursement."
  );
}

transaction.update(userRef, {
  [`videoCredits.${videoType}.remaining`]:
    FieldValue.increment(1),

  [`videoCredits.${videoType}.reserved`]:
    FieldValue.increment(-1),
});

      transaction.update(generationRef, {
        status: "refunded",
        refundedAt:
          FieldValue.serverTimestamp(),
      });
    }
  );
}

async function completeVideoGeneration(
  uid,
  generationRef,
  videoUrls
) {
  const userRef =
    adminDb.collection("users").doc(uid);

  await adminDb.runTransaction(
    async (transaction) => {
      const generationSnapshot =
        await transaction.get(generationRef);

      if (!generationSnapshot.exists) {
        throw new Error(
          "Génération vidéo introuvable."
        );
      }

      const generation =
        generationSnapshot.data();

      // Empêche une double validation.
      if (
  generation.status !== "reserved" &&
  generation.status !== "partial"
) {
  return;
}

      if (generation.uid !== uid) {
        throw new Error(
          "Utilisateur incorrect pour cette génération."
        );
      }

      const videoType =
  generation.videoType;

if (
  videoType !== "short" &&
  videoType !== "medium"
) {
  throw new Error(
    "Type de crédit vidéo invalide pour la validation."
  );
}

transaction.update(userRef, {
  [`videoCredits.${videoType}.reserved`]:
    FieldValue.increment(-1),

  [`videoCredits.${videoType}.used`]:
    FieldValue.increment(1),
});

      transaction.update(generationRef, {
  status: "completed",
  videoUrls,
  completedScenes: Array.isArray(videoUrls)
    ? videoUrls.length
    : 0,
  completedAt:
    FieldValue.serverTimestamp(),
});
    }
  );
}

async function saveVideoSceneProgress(
  uid,
  generationRef,
  videoUrls
) {
  await adminDb.runTransaction(
    async (transaction) => {
      const generationSnapshot =
        await transaction.get(generationRef);

      if (!generationSnapshot.exists) {
        throw new Error(
          "Génération vidéo introuvable."
        );
      }

      const generation =
        generationSnapshot.data();

      if (generation.uid !== uid) {
        throw new Error(
          "Utilisateur incorrect pour cette génération."
        );
      }

      if (
        generation.status !== "reserved" &&
        generation.status !== "partial"
      ) {
        return;
      }

      transaction.update(generationRef, {
        status: "partial",
        videoUrls,
        completedScenes: videoUrls.length,
        nextSceneIndex: videoUrls.length,
        lastProgressAt:
          FieldValue.serverTimestamp(),
      });
    }
  );
}

async function savePartialVideoGeneration(
  uid,
  generationRef,
  videoUrls,
  failedSceneIndex
) {
  await adminDb.runTransaction(
    async (transaction) => {
      const generationSnapshot =
        await transaction.get(generationRef);

      if (!generationSnapshot.exists) {
        throw new Error(
          "Génération vidéo introuvable."
        );
      }

      const generation =
        generationSnapshot.data();

      if (generation.uid !== uid) {
        throw new Error(
          "Utilisateur incorrect pour cette génération."
        );
      }

      if (generation.status !== "reserved") {
        return;
      }

      transaction.update(generationRef, {
        status: "partial",

        videoUrls,

        completedScenes: videoUrls.length,

        nextSceneIndex: failedSceneIndex,

        lastErrorAt:
          FieldValue.serverTimestamp(),
      });
    }
  );
}

async function getPartialVideoGeneration(
  uid,
  generationId
) {
  const generationRef =
    adminDb
      .collection("videoGenerations")
      .doc(generationId);

  const generationSnapshot =
    await generationRef.get();

  if (!generationSnapshot.exists) {
    const error = new Error(
      "Génération vidéo introuvable."
    );
    error.code = "VIDEO_GENERATION_NOT_FOUND";
    throw error;
  }

  const generation =
    generationSnapshot.data();

  if (generation.uid !== uid) {
    const error = new Error(
      "Cette génération vidéo appartient à un autre utilisateur."
    );
    error.code = "VIDEO_GENERATION_FORBIDDEN";
    throw error;
  }

  if (generation.status !== "partial") {
    const error = new Error(
      "Cette génération vidéo ne peut pas être reprise."
    );
    error.code = "VIDEO_GENERATION_NOT_PARTIAL";
    throw error;
  }

  const videoUrls =
    Array.isArray(generation.videoUrls)
      ? generation.videoUrls
      : [];

  return {
    generationRef,
    generation,
    videoUrls,
    nextSceneIndex:
      Number.isInteger(generation.nextSceneIndex)
        ? generation.nextSceneIndex
        : videoUrls.length,
  };
}

function isVideoGenerationStale(generation) {
  const createdAt = generation?.createdAt;

  if (!createdAt) {
    return false;
  }

  const createdAtMs =
    typeof createdAt.toMillis === "function"
      ? createdAt.toMillis()
      : new Date(createdAt).getTime();

  if (!Number.isFinite(createdAtMs)) {
    return false;
  }

  // Une génération bloquée depuis plus de 30 minutes
  // est considérée comme ancienne.
  const STALE_AFTER_MS =
    30 * 60 * 1000;

  return (
    Date.now() - createdAtMs >
    STALE_AFTER_MS
  );
}

async function reconcileStaleVideoGeneration(
  uid,
  generationRef
) {
  const generationSnapshot =
    await generationRef.get();

  if (!generationSnapshot.exists) {
    return {
      action: "not_found",
    };
  }

  const generation =
    generationSnapshot.data();

  if (generation.uid !== uid) {
    throw new Error(
      "Utilisateur incorrect pour cette génération."
    );
  }

  if (!isVideoGenerationStale(generation)) {
    return {
      action: "not_stale",
    };
  }

  const videoUrls =
    Array.isArray(generation.videoUrls)
      ? generation.videoUrls
      : [];

  // Des scènes Runway existent déjà :
  // on conserve la génération pour permettre sa reprise.
  if (
    generation.status === "partial" ||
    videoUrls.length > 0
  ) {
    return {
      action: "keep_for_resume",
      completedScenes: videoUrls.length,
    };
  }

  // Aucun travail Runway terminé :
  // le crédit peut être rendu.
  if (generation.status === "reserved") {
    await refundVideoCredit(
      uid,
      generationRef
    );

    return {
      action: "refunded",
    };
  }

  return {
    action: "nothing",
  };
}

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
// =========================
// ☁️ FIREBASE STORAGE - IMAGES HISTOIRES
// =========================
app.post("/story-image/upload", async (req, res) => {
  try {
    const decodedToken =
      await requireFirebaseUser(req, res);

    if (!decodedToken) {
      return;
    }

    const uid = decodedToken.uid;

    const {
      storyId,
      sceneIndex,
      imageBase64,
      contentType = "image/png",
    } = req.body;

    if (
      !storyId ||
      !Number.isInteger(sceneIndex) ||
      !imageBase64
    ) {
      return res.status(400).json({
        error:
          "storyId, sceneIndex et imageBase64 sont obligatoires.",
      });
    }

    const allowedContentTypes = [
      "image/png",
      "image/jpeg",
      "image/webp",
    ];

    if (!allowedContentTypes.includes(contentType)) {
      return res.status(400).json({
        error: "Type d'image non autorisé.",
      });
    }

    const extension =
      contentType === "image/jpeg"
        ? "jpg"
        : contentType === "image/webp"
          ? "webp"
          : "png";

    const cleanBase64 = imageBase64.includes(",")
      ? imageBase64.split(",")[1]
      : imageBase64;

    const imageBuffer = Buffer.from(
      cleanBase64,
      "base64"
    );

    if (!imageBuffer.length) {
      return res.status(400).json({
        error: "Image Base64 invalide.",
      });
    }

    const bucket = adminStorage.bucket();

    const storagePath =
      `users/${uid}/stories/${storyId}/` +
      `scene-${sceneIndex}.${extension}`;

    const file = bucket.file(storagePath);

    await file.save(imageBuffer, {
      metadata: {
        contentType,
        cacheControl: "public,max-age=31536000",
      },
      resumable: false,
    });

    const [downloadUrl] =
      await file.getSignedUrl({
        action: "read",
        expires: "03-01-2500",
      });

    console.log(
      `☁️ Illustration ${sceneIndex + 1} sauvegardée :`,
      storagePath
    );

    return res.json({
      success: true,
      imageUrl: downloadUrl,
      storagePath,
    });
  } catch (error) {
    console.error(
      "❌ Erreur upload image histoire :",
      error
    );

    return res.status(500).json({
      error:
        "Impossible de sauvegarder l'illustration.",
      message: error?.message,
    });
  }
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
    const { prompt, referenceImage } = req.body;

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

    let result;

    if (referenceImage) {
      const match = referenceImage.match(
        /^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/
      );

      if (!match) {
        return res.status(400).json({
          error: "Format de photo de référence invalide",
        });
      }

      const mimeType = match[1];
      const base64Data = match[2];

      const extension =
        mimeType === "image/png"
          ? "png"
          : mimeType === "image/webp"
          ? "webp"
          : "jpg";

      const imageBuffer = Buffer.from(base64Data, "base64");

      const referenceFile = await toFile(
        imageBuffer,
        `reference.${extension}`,
        {
          type: mimeType === "image/jpg" ? "image/jpeg" : mimeType,
        }
      );

      result = await openai.images.edit({
        model: "gpt-image-2",
        image: referenceFile,
        prompt: `
Utilise la photo fournie comme référence visuelle principale et obligatoire.

OBJECTIF PRIORITAIRE :
Conserver les mêmes personnes et les mêmes éléments visuels importants dans toutes les illustrations de cette histoire.

PERSONNES DE RÉFÉRENCE :
Analyse attentivement la photo de référence avant de créer l'illustration.

Les personnes visibles sur la photo constituent la distribution de référence de l'histoire.

RÈGLES STRICTES :
- n'invente aucun enfant, bébé, adulte ou personnage humain supplémentaire
- n'ajoute jamais un frère, une sœur, un ami ou un autre enfant qui n'est pas demandé par la scène
- ne duplique jamais une personne
- ne fusionne jamais deux personnes
- ne remplace jamais une personne par une autre
- conserve l'âge apparent et les proportions relatives entre les personnes
- lorsqu'une scène met en scène toutes les personnes de référence, représente exactement ces personnes et aucune personne supplémentaire
- les personnages secondaires éventuellement nécessaires au décor doivent rester clairement en arrière-plan et ne jamais pouvoir être confondus avec les personnages principaux

PRIORITÉ ABSOLUE :
La fidélité et la continuité des personnages principaux sont plus importantes que l'ajout de détails décoratifs.
En cas de doute, simplifie le décor plutôt que d'inventer une personne, un vêtement ou un accessoire.

IDENTITÉ DES PERSONNAGES :
Conserve au maximum :
- la forme générale du visage
- la couleur de peau
- la coiffure
- la couleur et la longueur des cheveux
- les proportions générales
- les traits distinctifs visibles

VÊTEMENTS ET ACCESSOIRES :
Les vêtements doivent rester cohérents avec la photo de référence et entre toutes les scènes.
Conserve :
- les mêmes couleurs principales
- le même type de haut
- le même type de bas
- les mêmes chaussures lorsqu'elles sont visibles
- le même sac à dos
- les mêmes accessoires importants
- lorsqu'un sac à dos est porté ou visible dans la scène, conserve son apparence, sa couleur et ses caractéristiques principales
- le sac à dos peut naturellement être posé ou hors champ lorsque le contexte le justifie, par exemple lorsque l'enfant est assis en classe

RÈGLES STRICTES :
- ne change jamais volontairement la couleur d'un vêtement
- n'ajoute pas de chapeau, casquette, couronne, lunettes ou accessoire absent de la photo, sauf si la scène le demande explicitement
- ne remplace pas un sac à dos par un autre
- un accessoire peut ne pas être visible lorsque la situation le justifie naturellement, mais s'il réapparaît dans une autre scène, il doit conserver la même apparence
- n'invente pas de nouveaux logos, lettres, animaux, symboles ou motifs sur les vêtements
- si un motif précis est difficile à reproduire, simplifie-le mais garde le même motif simplifié dans toutes les scènes
- ne transforme pas un vêtement en costume
- privilégie la continuité visuelle plutôt que la créativité vestimentaire

IMPORTANT :
- ne change pas arbitrairement les couleurs des vêtements
- n'ajoute pas de lettres, logos, symboles ou dessins différents d'une scène à l'autre
- si un motif précis est difficile à reproduire, utilise un motif simple et cohérent plutôt que d'en inventer un nouveau à chaque scène
- garde les sacs à dos et accessoires reconnaissables d'une scène à l'autre

DOUDOU / OBJET IMPORTANT :
Si un doudou ou un objet important est visible :
- conserve sa forme
- conserve ses couleurs
- conserve ses proportions
- ne le remplace pas par un autre objet

COHÉRENCE ENTRE LES SCÈNES :
Cette illustration appartient à une série.
Les personnages doivent donner l'impression d'être exactement les mêmes personnages que dans les autres scènes.
La scène, l'action, la pose et le décor peuvent changer, mais l'identité visuelle des personnages ne doit pas changer.

STYLE :
Transforme les personnes photographiées en personnages illustrés.
Ne produis pas une photographie réaliste.
Garde une illustration douce, familiale, premium et adaptée aux enfants.


${finalPrompt}
`,
        size: "1024x1024",
        quality: "medium",
      });
    } else {
      result = await openai.images.generate({
        model: "gpt-image-2",
        prompt: finalPrompt,
        size: "1024x1024",
        quality: "medium",
      });
    }

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

        if (productConfig.type === "video") {
  transaction.update(userRef, {
    [`videoCredits.${productConfig.videoType}.remaining`]:
      FieldValue.increment(
        productConfig.credits
      ),

    [`videoCredits.${productConfig.videoType}.purchases`]:
      FieldValue.increment(1),
  });
} else {
  transaction.update(userRef, {
    [`packs.${productConfig.packType}.storiesRemaining`]:
      FieldValue.increment(
        productConfig.stories
      ),

    [`packs.${productConfig.packType}.purchases`]:
      FieldValue.increment(1),
  });
}

        transaction.set(purchaseRef, {
  uid,
  productId,

  type: productConfig.type,

  packType:
    productConfig.packType || null,

  stories:
    productConfig.stories || 0,

  videoType:
    productConfig.videoType || null,

  scenes:
    productConfig.scenes || 0,

  videoCredits:
    productConfig.credits || 0,

  orderId:
    purchase.orderId || null,

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

  type: productConfig.type,

  packType:
    productConfig.packType || null,

  stories:
    productConfig.stories || 0,

  videoType:
    productConfig.videoType || null,

  scenes:
    productConfig.scenes || 0,

  videoCredits:
    productConfig.credits || 0,
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

          if (productConfig.type === "video") {
  firestoreTransaction.update(
    userRef,
    {
      [`videoCredits.${productConfig.videoType}.remaining`]:
        FieldValue.increment(
          productConfig.credits
        ),

      [`videoCredits.${productConfig.videoType}.purchases`]:
        FieldValue.increment(1),
    }
  );
} else {
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
}

          firestoreTransaction.set(
  purchaseRef,
  {
    uid,
    productId,

    type: productConfig.type,

    packType:
      productConfig.packType || null,

    stories:
      productConfig.stories || 0,

    videoType:
      productConfig.videoType || null,

    scenes:
      productConfig.scenes || 0,

    videoCredits:
      productConfig.credits || 0,

    transactionId:
      verifiedTransactionId,

    environment:
      environment || null,

    creditedAt:
      new Date().toISOString(),

    consumed: false,
  }
);
        }
      );

      return res.json({
  success: true,
  alreadyCredited,
  productId,

  type: productConfig.type,

  packType:
    productConfig.packType || null,

  stories:
    productConfig.stories || 0,

  videoType:
    productConfig.videoType || null,

  scenes:
    productConfig.scenes || 0,

  videoCredits:
    productConfig.credits || 0,

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
  let generationRef = null;
  let uid = null;
  let runwaySucceeded = false;
  let videoUrls = [];

  try {
        const decodedToken =
      await requireFirebaseUser(req, res);

    if (!decodedToken) {
      return;
    }

    uid = decodedToken.uid;

    console.log(
      "🎬 Demande vidéo autorisée pour :",
      uid
    );
    const {
  images,
  prompt,
  generationId = null,
} = req.body;

const videoModel =
  req.body?.videoModel === "gen4.5"
    ? "gen4.5"
    : "gen4_turbo";

if (!Array.isArray(images) || images.length === 0) {
  return res.status(400).json({
    error: "Aucune image de scène reçue.",
  });
}

if (images.length !== 4 && images.length !== 6) {
  return res.status(400).json({
    error:
      "Le dessin animé doit contenir exactement 4 ou 6 scènes.",
  });
}

const sceneCount = images.length;
const imagesHash = crypto
  .createHash("sha256")
  .update(JSON.stringify(images))
  .digest("hex");

let startSceneIndex = 0;

// ========================================
// 🔄 REPRISE D'UNE GÉNÉRATION PARTIELLE
// ========================================
if (generationId) {
  const generationRefToCheck =
  adminDb
    .collection("videoGenerations")
    .doc(generationId);

const reconciliation =
  await reconcileStaleVideoGeneration(
    uid,
    generationRefToCheck
  );

if (reconciliation.action === "refunded") {
  return res.status(409).json({
    error:
      "Cette ancienne génération a été annulée et le crédit vidéo a été remboursé.",
    code:
      "VIDEO_GENERATION_REFUNDED",
  });
}
  const partial =
    await getPartialVideoGeneration(
      uid,
      generationId
    );

    // Sécurité : une génération reprise doit utiliser
    // le même modèle Runway que la génération d'origine.
    if (
      partial.generation.model &&
      partial.generation.model !== videoModel
    ) {
      return res.status(409).json({
        error:
          "Le modèle vidéo ne correspond pas à la génération d'origine.",
        code: "VIDEO_MODEL_MISMATCH",
      });
    }

  generationRef = partial.generationRef;

  videoUrls = partial.videoUrls;

  startSceneIndex =
    partial.nextSceneIndex;

  // Sécurité : l'histoire reprise doit avoir
  // le même nombre de scènes.
  if (
    partial.generation.sceneCount !==
    sceneCount
  ) {
    const error = new Error(
      "Le nombre de scènes ne correspond pas à la génération d'origine."
    );

    error.code =
      "VIDEO_SCENE_COUNT_MISMATCH";

    throw error;
  }

  if (
  partial.generation.imagesHash !==
  imagesHash
) {
  const error = new Error(
    "Les images ne correspondent pas à la génération vidéo d'origine."
  );

  error.code =
    "VIDEO_IMAGES_MISMATCH";

  throw error;
}

  console.log(
    `🔄 Reprise vidéo à la scène ${startSceneIndex + 1}/${sceneCount}`
  );
}

// ========================================
// 🆕 NOUVELLE GÉNÉRATION
// ========================================
else {
  generationRef =
  await reserveVideoCredit(
    uid,
    sceneCount,
    imagesHash,
    videoModel
  );

  console.log(
    "💳 Crédit vidéo réservé :",
    generationRef.id
  );
}

    console.log(
    "💳 Crédit vidéo réservé :",
    generationRef.id
    );

    console.log(
  `🎬 Génération de ${sceneCount} scènes vidéo Runway...`
);


for (
  let index = startSceneIndex;
  index < images.length;
  index++
) {
  const imageUrl = images[index];

  if (typeof imageUrl !== "string" || !imageUrl.trim()) {
    throw new Error(
      `Image invalide pour la scène ${index + 1}.`
    );
  }

  console.log(
    `🎬 Génération scène ${index + 1}/${sceneCount}...`
  );

  const task = await runway.imageToVideo
    .create({
      model: videoModel,
      promptImage: imageUrl,
      promptText:
        prompt ||
`Gentle children's story animation.

STRICT VISUAL PRESERVATION:
Preserve the exact original characters, faces, skin tones, hairstyles, clothing, colors, proportions and visual style from the source image.
Preserve all visible objects and accessories exactly as they appear in the source image.

IMPORTANT OBJECT CONSISTENCY:
Backpacks, bags, toys, comfort objects, hats, glasses, shoes and other visible accessories must remain the same throughout the entire video.
Keep their original shape, size, colors, patterns and position relative to the character.
Never replace one accessory with another.
Never invent a new accessory.
Never remove an important visible accessory.
A backpack must remain the same backpack and must not transform, change color, disappear or become another object.

CHARACTER CONSISTENCY:
Do not add, remove, duplicate, merge or replace characters.
Do not alter faces, hairstyles, clothing or body proportions.
Characters must remain recognizable as exactly the same characters from the source image.

MOTION:
Animate only subtle and natural movements.
Use gentle facial expressions, blinking, breathing, small body movements, subtle hair and clothing movement, and subtle environmental animation.
Avoid large movements that could distort characters, clothing or accessories.

CAMERA:
Locked camera and static framing.
No zoom, no pan, no dolly and no camera movement.
Keep all main characters fully visible throughout the entire video.
Do not crop heads, bodies, backpacks or important objects.

COMPOSITION:
Maintain the original composition, character positions and important objects as closely as possible.
Prioritize visual consistency over creative changes.

Smooth, soft, child-friendly animation.`,
ratio: "720:1280",
duration: 5,
    })
    .waitForTaskOutput();

  const sceneVideoUrl = task?.output?.[0];

  if (!sceneVideoUrl) {
    throw new Error(
      `Runway n'a retourné aucune vidéo pour la scène ${index + 1}.`
    );
  }

  videoUrls.push(sceneVideoUrl);

  await saveVideoSceneProgress(
  uid,
  generationRef,
  videoUrls
);

  console.log(
    `✅ Scène ${index + 1}/${sceneCount} générée.`
  );
}

runwaySucceeded = true;


console.log(
  `✅ Dessin animé complet généré : ${sceneCount} scènes`,
  generationRef.id
);

const narrationScenes =
  Array.isArray(req.body?.scenes)
    ? req.body.scenes
    : [];

const narrator =
  req.body?.narrator || "narratrice";

const mode =
  req.body?.mode || "story";

if (narrationScenes.length !== videoUrls.length) {
  throw new Error(
    "Le nombre de textes ne correspond pas au nombre de scènes vidéo."
  );
}

const narrationTempDir =
  await fs.promises.mkdtemp(
    path.join(
      os.tmpdir(),
      "contemagiqueia-narration-"
    )
  );

let mergedVideo = null;

try {
  const narratedVideoPaths = [];

  for (
    let index = 0;
    index < videoUrls.length;
    index++
  ) {
    const sceneData =
      narrationScenes[index] || {};

    const narratedPath =
      await createNarratedSceneVideo({
        videoUrl: videoUrls[index],
        sceneText: sceneData.text || "",
        emotion:
          sceneData.emotion || "warm",
        narrator,
        mode,
        sceneIndex: index,
        tempDir: narrationTempDir,
      });

    narratedVideoPaths.push(
      narratedPath
    );

    console.log(
      `🔊 Narration scène ${index + 1}/${videoUrls.length} créée.`
    );
  }

  mergedVideo =
    await mergeLocalVideoClips(
      narratedVideoPaths,
      generationRef.id
    );

  console.log(
    "🎬 Vidéo finale avec narration assemblée."
  );

  const bucket =
    getStorage().bucket();

  const finalVideoStoragePath =
    `videos/${uid}/${generationRef.id}/final.mp4`;

  const finalVideoFile =
    bucket.file(
      finalVideoStoragePath
    );

  const downloadToken =
    crypto.randomUUID();

  await finalVideoFile.save(
    mergedVideo.buffer,
    {
      resumable: false,

      metadata: {
        contentType: "video/mp4",
        cacheControl:
          "private,max-age=3600",

        metadata: {
          firebaseStorageDownloadTokens:
            downloadToken,
        },
      },
    }
  );

  const finalVideoUrl =
    `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(
      finalVideoStoragePath
    )}?alt=media&token=${downloadToken}`;

  await generationRef.update({
    finalVideoUrl,
  });

  await completeVideoGeneration(
    uid,
    generationRef,
    videoUrls
  );

  return res.json({
    success: true,
    videoUrls,
    finalVideoUrl,
    sceneCount,
    generationId:
      generationRef.id,
  });
} finally {
  await fs.promises.rm(
    narrationTempDir,
    {
      recursive: true,
      force: true,
    }
  );

  if (mergedVideo?.tempDir) {
    await fs.promises.rm(
      mergedVideo.tempDir,
      {
        recursive: true,
        force: true,
      }
    );
  }
}

} catch (error) {
  console.error(
    "❌ Erreur génération vidéo Runway :",
    error
  );

  if (
    uid &&
    generationRef &&
    !runwaySucceeded
  ) {
    try {
      if (videoUrls.length > 0) {
        await savePartialVideoGeneration(
          uid,
          generationRef,
          videoUrls,
          videoUrls.length
        );

        console.log(
          `⚠️ Génération partielle sauvegardée : ${videoUrls.length} scène(s) terminée(s).`
        );
      } else {
        await refundVideoCredit(
          uid,
          generationRef
        );

        console.log(
          "💰 Crédit vidéo remboursé :",
          generationRef.id
        );
      }
    } catch (creditError) {
      console.error(
        "❌ Erreur gestion crédit vidéo après échec :",
        creditError
      );
    }
  }

  if (
    error?.code ===
    "NO_VIDEO_CREDIT"
  ) {
    return res.status(402).json({
      error:
        "Aucun crédit vidéo disponible.",
      code:
        "NO_VIDEO_CREDIT",
    });
  }

  if (
    error instanceof TaskFailedError
  ) {
    console.error(
      "Détails Runway :",
      error.taskDetails
    );
  }

  return res.status(500).json({
    error:
      "Erreur génération vidéo",
    details:
      error?.message,
  });
}
});

async function mergeLocalVideoClips(
  localFiles,
  generationId
) {
  if (!ffmpegPath) {
    throw new Error("FFmpeg introuvable.");
  }

  if (
    !Array.isArray(localFiles) ||
    localFiles.length === 0
  ) {
    throw new Error(
      "Aucune scène locale à assembler."
    );
  }

  const tempDir =
    await fs.promises.mkdtemp(
      path.join(
        os.tmpdir(),
        "contemagiqueia-final-"
      )
    );

  const concatFilePath =
    path.join(
      tempDir,
      "concat.txt"
    );

  const concatContent =
    localFiles
      .map(
        (filePath) =>
          `file '${filePath.replace(
            /'/g,
            "'\\''"
          )}'`
      )
      .join("\n");

  await fs.promises.writeFile(
    concatFilePath,
    concatContent,
    "utf8"
  );

  const outputPath =
    path.join(
      tempDir,
      `${generationId}-final.mp4`
    );

  await new Promise(
    (resolve, reject) => {
      const ffmpeg = spawn(
        ffmpegPath,
        [
          "-y",
          "-f",
          "concat",
          "-safe",
          "0",
          "-i",
          concatFilePath,
          "-c",
          "copy",
          outputPath,
        ],
        {
          windowsHide: true,
        }
      );

      let stderr = "";

      ffmpeg.stderr.on(
        "data",
        (data) => {
          stderr +=
            data.toString();
        }
      );

      ffmpeg.on(
        "close",
        (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(
              new Error(
                `FFmpeg fusion finale échouée avec le code ${code}.\n${stderr}`
              )
            );
          }
        }
      );

      ffmpeg.on(
        "error",
        reject
      );
    }
  );

  const finalBuffer =
    await fs.promises.readFile(
      outputPath
    );

  return {
    buffer: finalBuffer,
    tempDir,
  };
}

app.post(
  "/admin/send-notification",
  async (req, res) => {
    try {
      const adminUser =
        await requireAdminUser(req, res);

      if (!adminUser) {
        return;
      }

      const {
        title,
        body,
        data = {},
      } = req.body || {};

      if (
        !title?.trim() ||
        !body?.trim()
      ) {
        return res.status(400).json({
          error:
            "Le titre et le message sont obligatoires.",
        });
      }

      const usersSnapshot =
        await adminDb
          .collection("users")
          .where(
            "pushNotificationsEnabled",
            "==",
            true
          )
          .get();

      const tokens = [];

      usersSnapshot.forEach(
        (docSnapshot) => {
          const userData =
            docSnapshot.data() || {};

          const token =
            userData.expoPushToken;

          if (
            typeof token === "string" &&
            token.startsWith(
              "ExponentPushToken["
            )
          ) {
            tokens.push(token);
          }
        }
      );

      if (tokens.length === 0) {
        return res.json({
          success: true,
          sent: 0,
          message:
            "Aucun appareil inscrit aux notifications.",
        });
      }

      const results = [];

      for (const token of tokens) {
        try {
          const result =
            await sendExpoPushNotification({
              to: token,
              title,
              body,
              data,
            });

          results.push({
            token,
            success: true,
            result,
          });
        } catch (error) {
          console.error(
            "Erreur envoi notification :",
            error
          );

          results.push({
            token,
            success: false,
            error:
              error instanceof Error
                ? error.message
                : String(error),
          });
        }
      }

      const sent =
        results.filter(
          (item) => item.success
        ).length;

      const failed =
        results.length - sent;

      return res.json({
        success: true,
        total: results.length,
        sent,
        failed,
      });
    } catch (error) {
      console.error(
        "Erreur route admin notification :",
        error
      );

      return res.status(500).json({
        error:
          "Erreur pendant l'envoi des notifications.",
        details:
          error instanceof Error
            ? error.message
            : String(error),
      });
    }
  }
);

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend lancé sur ${PORT}`);
});