import {
  AppStoreServerAPIClient,
  Environment,
  SignedDataVerifier,
} from "@apple/app-store-server-library";
import RunwayML, {
  TaskFailedError
} from "@runwayml/sdk";
import { spawn } from "child_process";
import cors from "cors";
import crypto from "crypto";
import dotenv from "dotenv";
import express from "express";
import ffmpegPath from "ffmpeg-static";
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import fs from "fs";
import { google } from "googleapis";
import OpenAI, { toFile } from "openai";
import os from "os";
import path from "path";
import {
  continuousScene,
} from "./backend/continuous-video.js";
dotenv.config();

console.log(
  "Clé OpenAI présente :",
  !!process.env.OPENAI_API_KEY
);

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function downloadFile(
  url,
  outputPath
) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Erreur téléchargement vidéo : ${response.status}`
    );
  }

  const arrayBuffer =
    await response.arrayBuffer();

  await fs.promises.writeFile(
    outputPath,
    Buffer.from(arrayBuffer)
  );
}

async function mergeVideoClips(
  videoUrls,
  generationId
) {
  if (!ffmpegPath) {
    throw new Error(
      "FFmpeg introuvable."
    );
  }

  if (
    !Array.isArray(videoUrls) ||
    videoUrls.length === 0
  ) {
    throw new Error(
      "Aucune vidéo à assembler."
    );
  }

  const tempDir =
    await fs.promises.mkdtemp(
      path.join(
        os.tmpdir(),
        "contemagiqueia-video-"
      )
    );

  try {
    const localFiles = [];

    for (
      let i = 0;
      i < videoUrls.length;
      i++
    ) {
      const localPath =
        path.join(
          tempDir,
          `scene-${i + 1}.mp4`
        );

      await downloadFile(
        videoUrls[i],
        localPath
      );

      localFiles.push(
        localPath
      );
    }

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
        const ffmpeg =
          spawn(
            ffmpegPath,
            [
              "-y",

              "-f",
              "concat",

              "-safe",
              "0",

              "-i",
              concatFilePath,

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

              "-movflags",
              "+faststart",

              outputPath,
            ],
            {
              windowsHide:
                true,
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
                  `FFmpeg a échoué avec le code ${code}.\n${stderr}`
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

    return outputPath;
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

function getNarratorProfile(
  narrator = "narratrice"
) {
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
  language = "fr",
}) {
  if (!text?.trim()) {
    throw new Error(
      "Texte de narration manquant."
    );
  }

  const profile =
    getNarratorProfile(
      narrator
    );

  const supportedLanguages = [
    "fr",
    "en",
    "es",
  ];

  const selectedLanguage =
    supportedLanguages.includes(
      language
    )
      ? language
      : "fr";

  const languageInstructions = {
    fr: `
Lis le texte en français.
Utilise une prononciation française naturelle et claire.
Ne traduis pas le texte.
`,

    en: `
Read the text in English.
Use natural, clear English pronunciation.
Do not translate the text.
`,

    es: `
Lee el texto en español.
Utiliza una pronunciación española natural y clara.
No traduzcas el texto.
`,
  };

  let emotionInstructions =
    "";

  if (
    emotion === "danger"
  ) {
    emotionInstructions =
      "Ajoute un suspense très léger, sans jamais devenir effrayant.";
  } else if (
    emotion === "victory"
  ) {
    emotionInstructions =
      "Utilise un ton joyeux et chaleureux.";
  } else if (
    emotion === "calm"
  ) {
    emotionInstructions =
      "Utilise un ton doux et paisible.";
  } else if (
    emotion === "night"
  ) {
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

${languageInstructions[selectedLanguage]}

${emotionInstructions}

${bedtimeInstructions}

Respecte exactement la langue du texte fourni.
Prononce les mots naturellement.
`;

  const response =
    await openai.audio.speech.create({
      model:
        "gpt-4o-mini-tts",

      voice:
        profile.voice,

      input:
        text,

      instructions,

      response_format:
        "mp3",
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
  language = "fr",
  sceneIndex,
  tempDir,
}) {
  if (!ffmpegPath) {
    throw new Error(
      "FFmpeg introuvable."
    );
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
      text:
        sceneText,

      mode,

      emotion,

      narrator,

      language,
    });

  await fs.promises.writeFile(
    narrationPath,
    narrationBuffer
  );

  await new Promise(
    (resolve, reject) => {
      const ffmpeg =
        spawn(
          ffmpegPath,
          [
            "-y",

            // Vidéo Runway :
            // jouée une seule fois.
            "-i",
            sourceVideoPath,

            // Narration.
            "-i",
            narrationPath,

            // Une fois la vidéo
            // terminée, conserve
            // sa dernière image.
            "-filter_complex",

            "[0:v]tpad=stop_mode=clone:stop_duration=600[v]",

            "-map",
            "[v]",

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

            // La scène s'arrête
            // à la fin de la
            // narration.
            "-shortest",

            "-movflags",
            "+faststart",

            outputPath,
          ],
          {
            windowsHide:
              true,
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
          if (
            code === 0
          ) {
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
    }
  );

  return outputPath;
}

const runway =
  new RunwayML({
    apiKey:
      process.env
        .RUNWAY_API_KEY,
  });

const GOOGLE_PLAY_PACKAGE_NAME =
  "com.contemagiqueia.app";

const GOOGLE_PLAY_PRODUCTS = {
  carnet_15_textes: {
    type: "story",
    packType: "text",
    stories: 15,
  },

  carnet_15_histoires: {
    type: "story",
    packType:
      "illustrated",
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
    packType:
      "illustrated",
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

const googlePlayAuth =
  new google.auth.GoogleAuth({
    keyFile:
      "/etc/secrets/google-play-service-account.json",

    scopes: [
      "https://www.googleapis.com/auth/androidpublisher",
    ],
  });

const androidPublisher =
  google.androidpublisher({
    version: "v3",
    auth: googlePlayAuth,
  });

const APPLE_ISSUER_ID =
  process.env
    .APPLE_ISSUER_ID;

const APPLE_KEY_ID =
  process.env
    .APPLE_KEY_ID;

const APPLE_BUNDLE_ID =
  process.env
    .APPLE_BUNDLE_ID;

const APPLE_KEY_PATH =
  APPLE_KEY_ID
    ? `/etc/secrets/SubscriptionKey_${APPLE_KEY_ID}.p8`
    : null;

function getApplePrivateKey() {
  if (!APPLE_ISSUER_ID) {
    throw new Error(
      "APPLE_ISSUER_ID manquant."
    );
  }

  if (!APPLE_KEY_ID) {
    throw new Error(
      "APPLE_KEY_ID manquant."
    );
  }

  if (
    !APPLE_KEY_PATH ||
    !fs.existsSync(
      APPLE_KEY_PATH
    )
  ) {
    throw new Error(
      `Clé privée Apple introuvable : ${APPLE_KEY_PATH}`
    );
  }

  return fs.readFileSync(
    APPLE_KEY_PATH,
    "utf8"
  );
}

const FIREBASE_SERVICE_ACCOUNT_PATH =
  fs.existsSync(
    "/etc/secrets/firebase-service-account.json"
  )
    ? "/etc/secrets/firebase-service-account.json"
    : path.join(
        process.cwd(),
        "secrets",
        "firebase-service-account.json"
      );

if (
  !fs.existsSync(
    FIREBASE_SERVICE_ACCOUNT_PATH
  )
) {
  throw new Error(
    `Clé Firebase introuvable : ${FIREBASE_SERVICE_ACCOUNT_PATH}`
  );
}

console.log(
  "🔥 Firebase Admin : clé de service trouvée."
);

const firebaseServiceAccount =
  JSON.parse(
    fs.readFileSync(
      FIREBASE_SERVICE_ACCOUNT_PATH,
      "utf8"
    )
  );

const firebaseAdminApp =
  initializeApp({
    credential: cert(
      firebaseServiceAccount
    ),

    projectId:
      "contemagiqueia",

    storageBucket:
      "contemagiqueia.firebasestorage.app",
  });

const firebaseAuth =
  getAuth(
    firebaseAdminApp
  );

const adminDb =
  getFirestore(
    firebaseAdminApp
  );

const adminStorage =
  getStorage(
    firebaseAdminApp
  );

async function requireFirebaseUser(
  req,
  res
) {
  const authorization =
    req.headers.authorization ||
    "";

  if (
    !authorization.startsWith(
      "Bearer "
    )
  ) {
    res.status(401).json({
      error:
        "Authentification Firebase requise.",
    });

    return null;
  }

  try {
    const idToken =
      authorization.substring(7);

    const decodedToken =
      await firebaseAuth
        .verifyIdToken(
          idToken
        );

    return decodedToken;
  } catch (error) {
    console.error(
      "❌ Token Firebase invalide :",
      error?.message
    );

    res.status(401).json({
      error:
        "Session Firebase invalide.",
    });

    return null;
  }
}

async function requireAdminUser(
  req,
  res
) {
  const decodedToken =
    await requireFirebaseUser(
      req,
      res
    );

  if (!decodedToken) {
    return null;
  }

  const userSnapshot =
    await adminDb
      .collection("users")
      .doc(decodedToken.uid)
      .get();

  if (
    !userSnapshot.exists
  ) {
    res.status(403).json({
      error:
        "Profil administrateur introuvable.",
    });

    return null;
  }

  const userData =
    userSnapshot.data() ||
    {};

  if (
    userData.role !== "admin"
  ) {
    res.status(403).json({
      error:
        "Accès administrateur requis.",
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
  const response =
    await fetch(
      "https://exp.host/--/api/v2/push/send",
      {
        method: "POST",

        headers: {
          Accept:
            "application/json",

          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            to,

            sound:
              "default",

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
      `Erreur Expo Push : ${JSON.stringify(
        result
      )}`
    );
  }

  return result;
}

async function reserveVideoCredit(
  uid,
  sceneCount,
  imagesHash,
  videoModel,
  requestId,
  narration
) {
  const userRef =
    adminDb
      .collection("users")
      .doc(uid);

  // Si le client fournit un requestId,
  // la même demande retrouvera toujours
  // le même document Firestore.
  //
  // Cela empêche un double débit si
  // la réponse HTTP est perdue et que
  // l'application renvoie la requête.
  const generationRef =
    requestId
      ? adminDb
          .collection(
            "videoGenerations"
          )
          .doc(requestId)
      : adminDb
          .collection(
            "videoGenerations"
          )
          .doc();

  // 4 scènes = crédit Court
  // 6 scènes = crédit Moyen
  const videoType =
    sceneCount === 4
      ? "short"
      : sceneCount === 6
        ? "medium"
        : null;

  if (!videoType) {
    const error =
      new Error(
        "Nombre de scènes non compatible avec un crédit vidéo."
      );

    error.code =
      "INVALID_VIDEO_SCENE_COUNT";

    throw error;
  }

  await adminDb.runTransaction(
    async (transaction) => {
      // IMPORTANT :
      // on vérifie d'abord si cette
      // génération existe déjà.
      const existingSnapshot =
        await transaction.get(
          generationRef
        );

      if (
        existingSnapshot.exists
      ) {
        const existing =
          existingSnapshot.data() ||
          {};

        // Le requestId appartient déjà
        // à un autre utilisateur.
        if (
          existing.uid !== uid
        ) {
          const error =
            new Error(
              "Cette demande ne correspond pas à cet utilisateur."
            );

          error.code =
            "VIDEO_REQUEST_MISMATCH";

          throw error;
        }

        // Le même requestId ne peut pas
        // être réutilisé pour une autre
        // narration.
        if (
          existing.narration !==
          narration
        ) {
          const error =
            new Error(
              "Cette demande ne correspond pas à la narration d'origine."
            );

          error.code =
            "VIDEO_REQUEST_MISMATCH";

          throw error;
        }

        // Même sécurité pour les images.
        if (
          existing.imagesHash !==
          imagesHash
        ) {
          const error =
            new Error(
              "Cette demande ne correspond pas aux images d'origine."
            );

          error.code =
            "VIDEO_REQUEST_MISMATCH";

          throw error;
        }

        // Même nombre de scènes.
        if (
          existing.sceneCount !==
          sceneCount
        ) {
          const error =
            new Error(
              "Cette demande ne correspond pas au nombre de scènes d'origine."
            );

          error.code =
            "VIDEO_REQUEST_MISMATCH";

          throw error;
        }

        // Même modèle vidéo.
        if (
          existing.model !==
          videoModel
        ) {
          const error =
            new Error(
              "Cette demande ne correspond pas au modèle vidéo d'origine."
            );

          error.code =
            "VIDEO_REQUEST_MISMATCH";

          throw error;
        }

        // La demande est strictement
        // identique.
        //
        // On ne débite surtout PAS
        // un deuxième crédit.
        return;
      }

      const userSnapshot =
        await transaction.get(
          userRef
        );

      if (
        !userSnapshot.exists
      ) {
        throw new Error(
          "Profil utilisateur introuvable."
        );
      }

      const userData =
        userSnapshot.data() ||
        {};

      const remaining =
        userData
          .videoCredits?.[
            videoType
          ]?.remaining ||
        0;

      if (
        remaining <= 0
      ) {
        const error =
          new Error(
            videoType ===
              "short"
              ? "Aucun crédit dessin animé Court disponible."
              : "Aucun crédit dessin animé Moyen disponible."
          );

        error.code =
          "NO_VIDEO_CREDIT";

        throw error;
      }

      transaction.update(
        userRef,
        {
          [`videoCredits.${videoType}.remaining`]:
            FieldValue.increment(
              -1
            ),

          [`videoCredits.${videoType}.reserved`]:
            FieldValue.increment(
              1
            ),
        }
      );

      transaction.set(
        generationRef,
        {
          uid,

          type:
            "full_story_video",

          videoType,

          appCredits: 1,

          status:
            "reserved",

          sceneCount,

          completedScenes:
            0,

          imagesHash,

          // Permet de garantir qu'un
          // requestId ne sera jamais
          // réutilisé avec une autre
          // narration.
          narration,

          model:
            videoModel,

          secondsPerScene:
            5,

          createdAt:
            FieldValue
              .serverTimestamp(),

          completedAt:
            null,

          refundedAt:
            null,
        }
      );
    }
  );

  return generationRef;
}

async function refundVideoCredit(
  uid,
  generationRef
) {
  const userRef =
    adminDb
      .collection("users")
      .doc(uid);

  await adminDb.runTransaction(
    async (transaction) => {
      const generationSnapshot =
        await transaction.get(
          generationRef
        );

      if (
        !generationSnapshot.exists
      ) {
        return;
      }

      const generation =
        generationSnapshot.data();

      // Empêche tout double
      // remboursement.
      if (
        generation.status !==
          "reserved" &&
        generation.status !==
          "partial"
      ) {
        return;
      }

      if (
        generation.uid !== uid
      ) {
        throw new Error(
          "Utilisateur incorrect pour ce remboursement."
        );
      }

      const videoType =
        generation.videoType;

      if (
        videoType !==
          "short" &&
        videoType !==
          "medium"
      ) {
        throw new Error(
          "Type de crédit vidéo invalide pour le remboursement."
        );
      }

      transaction.update(
        userRef,
        {
          [`videoCredits.${videoType}.remaining`]:
            FieldValue.increment(
              1
            ),

          [`videoCredits.${videoType}.reserved`]:
            FieldValue.increment(
              -1
            ),
        }
      );

      transaction.update(
        generationRef,
        {
          status:
            "refunded",

          refundedAt:
            FieldValue
              .serverTimestamp(),
        }
      );
    }
  );
}

async function completeVideoGeneration(
  uid,
  generationRef,
  videoUrls
) {
  const userRef =
    adminDb
      .collection("users")
      .doc(uid);

  await adminDb.runTransaction(
    async (transaction) => {
      const generationSnapshot =
        await transaction.get(
          generationRef
        );

      if (
        !generationSnapshot.exists
      ) {
        throw new Error(
          "Génération vidéo introuvable."
        );
      }

      const generation =
        generationSnapshot.data();

      // Empêche une double
      // validation.
      if (
        generation.status !==
          "reserved" &&
        generation.status !==
          "partial"
      ) {
        return;
      }

      if (
        generation.uid !== uid
      ) {
        throw new Error(
          "Utilisateur incorrect pour cette génération."
        );
      }

      const videoType =
        generation.videoType;

      if (
        videoType !==
          "short" &&
        videoType !==
          "medium"
      ) {
        throw new Error(
          "Type de crédit vidéo invalide pour la validation."
        );
      }

      transaction.update(
        userRef,
        {
          [`videoCredits.${videoType}.reserved`]:
            FieldValue.increment(
              -1
            ),
        }
      );

      transaction.update(
        generationRef,
        {
          status:
            "completed",

          videoUrls,

          completedScenes:
            Array.isArray(
              videoUrls
            )
              ? videoUrls.length
              : 0,

          completedAt:
            FieldValue
              .serverTimestamp(),
        }
      );
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
        await transaction.get(
          generationRef
        );

      if (
        !generationSnapshot.exists
      ) {
        throw new Error(
          "Génération vidéo introuvable."
        );
      }

      const generation =
        generationSnapshot.data();

      if (
        generation.uid !== uid
      ) {
        throw new Error(
          "Utilisateur incorrect pour cette génération."
        );
      }

      if (
        generation.status !==
          "reserved" &&
        generation.status !==
          "partial"
      ) {
        return;
      }

      transaction.update(
        generationRef,
        {
          status:
            "partial",

          videoUrls,

          completedScenes:
            videoUrls.length,

          nextSceneIndex:
            videoUrls.length,

          lastProgressAt:
            FieldValue
              .serverTimestamp(),
        }
      );
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
        await transaction.get(
          generationRef
        );

      if (
        !generationSnapshot.exists
      ) {
        throw new Error(
          "Génération vidéo introuvable."
        );
      }

      const generation =
        generationSnapshot.data();

      if (
        generation.uid !== uid
      ) {
        throw new Error(
          "Utilisateur incorrect pour cette génération."
        );
      }

      if (
        generation.status !==
          "reserved" &&
        generation.status !==
          "partial"
      ) {
        return;
      }

      transaction.update(
        generationRef,
        {
          status:
            "partial",

          videoUrls,

          completedScenes:
            videoUrls.length,

          nextSceneIndex:
            failedSceneIndex,

          lastErrorAt:
            FieldValue
              .serverTimestamp(),
        }
      );
    }
  );
}

async function getPartialVideoGeneration(
  uid,
  generationId
) {
  const generationRef =
    adminDb
      .collection(
        "videoGenerations"
      )
      .doc(
        generationId
      );

  const generationSnapshot =
    await generationRef.get();

  if (
    !generationSnapshot.exists
  ) {
    const error =
      new Error(
        "Génération vidéo introuvable."
      );

    error.code =
      "VIDEO_GENERATION_NOT_FOUND";

    throw error;
  }

  const generation =
    generationSnapshot.data();

  if (
    generation.uid !== uid
  ) {
    const error =
      new Error(
        "Cette génération vidéo appartient à un autre utilisateur."
      );

    error.code =
      "VIDEO_GENERATION_FORBIDDEN";

    throw error;
  }
    if (
    generation.status !==
    "partial"
  ) {
    const error =
      new Error(
        "Cette génération vidéo ne peut pas être reprise."
      );

    error.code =
      "VIDEO_GENERATION_NOT_PARTIAL";

    throw error;
  }

  const videoUrls =
    Array.isArray(
      generation.videoUrls
    )
      ? generation.videoUrls
      : [];

  return {
    generationRef,
    generation,
    videoUrls,

    nextSceneIndex:
      Number.isInteger(
        generation.nextSceneIndex
      )
        ? generation.nextSceneIndex
        : videoUrls.length,
  };
}

function isVideoGenerationStale(
  generation
) {
  const createdAt =
    generation?.createdAt;

  if (!createdAt) {
    return false;
  }

  const createdAtMs =
    typeof createdAt.toMillis ===
    "function"
      ? createdAt.toMillis()
      : new Date(
          createdAt
        ).getTime();

  if (
    !Number.isFinite(
      createdAtMs
    )
  ) {
    return false;
  }

  // Une génération bloquée
  // depuis plus de 30 minutes
  // est considérée comme ancienne.
  const STALE_AFTER_MS =
    30 * 60 * 1000;

  return (
    Date.now() -
      createdAtMs >
    STALE_AFTER_MS
  );
}

async function reconcileStaleVideoGeneration(
  uid,
  generationRef
) {
  const generationSnapshot =
    await generationRef.get();

  if (
    !generationSnapshot.exists
  ) {
    return {
      action:
        "not_found",
    };
  }

  const generation =
    generationSnapshot.data();

  if (
    generation.uid !== uid
  ) {
    throw new Error(
      "Utilisateur incorrect pour cette génération."
    );
  }

  if (
    !isVideoGenerationStale(
      generation
    )
  ) {
    return {
      action:
        "not_stale",
    };
  }

  const videoUrls =
    Array.isArray(
      generation.videoUrls
    )
      ? generation.videoUrls
      : [];

  // Des scènes Runway existent
  // déjà : on conserve la
  // génération pour permettre
  // sa reprise.
  if (
    generation.status ===
      "partial" ||
    videoUrls.length > 0
  ) {
    return {
      action:
        "keep_for_resume",

      completedScenes:
        videoUrls.length,
    };
  }

  // Aucun travail Runway terminé :
  // le crédit peut être rendu.
  if (
    generation.status ===
    "reserved"
  ) {
    await refundVideoCredit(
      uid,
      generationRef
    );

    return {
      action:
        "refunded",
    };
  }

  return {
    action:
      "nothing",
  };
}

function createAppleClient(
  environment
) {
  const privateKey =
    getApplePrivateKey();

  return new AppStoreServerAPIClient(
    privateKey,
    APPLE_KEY_ID,
    APPLE_ISSUER_ID,
    APPLE_BUNDLE_ID,
    environment
  );
}

app.get(
  "/",
  (req, res) => {
    res.send(
      "Backend ConteMagiqueIA OK"
    );
  }
);

// =========================
// 🔗 PARTAGE SÉCURISÉ
// =========================

function createShareToken() {
  return crypto
    .randomBytes(32)
    .toString(
      "base64url"
    );
}

function hashShareToken(
  token
) {
  return crypto
    .createHash(
      "sha256"
    )
    .update(token)
    .digest("hex");
}

// =========================
// 🔗 CRÉER UN LIEN DE PARTAGE
// =========================

app.post(
  "/share/create",

  async (req, res) => {
    try {
      const decodedToken =
        await requireFirebaseUser(
          req,
          res
        );

      if (!decodedToken) {
        return;
      }

      const uid =
        decodedToken.uid;

      const {
        type,
        contentId,
        story,
      } = req.body;

      if (
        type !== "story" &&
        type !== "video"
      ) {
        return res
          .status(400)
          .json({
            error:
              "Type de partage invalide.",
          });
      }

      if (!contentId) {
        return res
          .status(400)
          .json({
            error:
              "Identifiant du contenu manquant.",
          });
      }

      let sharedContent =
        null;

      // =========================
      // 🎬 PARTAGE VIDÉO
      // =========================

      if (
        type === "video"
      ) {
        const videoRef =
          adminDb
            .collection(
              "videoGenerations"
            )
            .doc(
              String(
                contentId
              )
            );

        const videoSnapshot =
          await videoRef.get();

        if (
          !videoSnapshot.exists
        ) {
          return res
            .status(404)
            .json({
              error:
                "Vidéo introuvable.",
            });
        }

        const video =
          videoSnapshot.data();

        if (
          video.uid !== uid
        ) {
          return res
            .status(403)
            .json({
              error:
                "Cette vidéo ne vous appartient pas.",
            });
        }

        if (
          video.status !==
            "completed" ||
          !video.finalVideoUrl
        ) {
          return res
            .status(400)
            .json({
              error:
                "Cette vidéo n'est pas disponible pour le partage.",
            });
        }

        sharedContent = {
          generationId:
            videoSnapshot.id,

          finalVideoUrl:
            video.finalVideoUrl,

          sceneCount:
            video.sceneCount ||
            0,

          videoType:
            video.videoType ||
            null,
        };
      }

      // =========================
      // 📖 PARTAGE HISTOIRE
      // =========================

      if (
        type === "story"
      ) {
        if (
          !story ||
          typeof story !==
            "object"
        ) {
          return res
            .status(400)
            .json({
              error:
                "Données de l'histoire manquantes.",
            });
        }

        if (
          String(
            story.id
          ) !==
          String(
            contentId
          )
        ) {
          return res
            .status(400)
            .json({
              error:
                "Identifiant de l'histoire incorrect.",
            });
        }

        if (
          !Array.isArray(
            story.scenes
          ) ||
          story.scenes
            .length === 0
        ) {
          return res
            .status(400)
            .json({
              error:
                "L'histoire ne contient aucune scène.",
            });
        }

        if (
          story.scenes
            .length > 20
        ) {
          return res
            .status(400)
            .json({
              error:
                "Cette histoire contient trop de scènes.",
            });
        }

        sharedContent = {
          id:
            String(
              story.id
            ),

          prompt:
            story.prompt ||
            "",

          title:
            story.title ||
            story.prompt ||
            "Histoire ConteMagiqueIA",

          imageStyle:
            story.imageStyle ||
            "cartoon",

          narrator:
            story.narrator ||
            "narratrice",

          scenes:
            story.scenes.map(
              (scene) => ({
                text:
                  scene?.text ||
                  "",

                imagePrompt:
                  scene
                    ?.imagePrompt ||
                  "",

                imageUrl:
                  scene?.imageUrl ||
                  null,

                ambience:
                  scene?.ambience ||
                  "magic",
              })
            ),
        };
      }

      // =========================
      // 🔐 CRÉATION DU JETON
      // =========================

      const shareToken =
        createShareToken();

      const tokenHash =
        hashShareToken(
          shareToken
        );

      const shareRef =
        adminDb
          .collection(
            "shareLinks"
          )
          .doc(
            tokenHash
          );

      await shareRef.set({
        ownerUid:
          uid,

        type,

        contentId:
          String(
            contentId
          ),

        content:
          sharedContent,

        active:
          true,

        createdAt:
          FieldValue
            .serverTimestamp(),

        lastAccessedAt:
          null,
      });

      const shareUrl =
        type === "video"
          ? `https://contemagiqueia.fr/video/${shareToken}`
          : `https://contemagiqueia.fr/histoire/${shareToken}`;

      return res.json({
        success: true,

        token:
          shareToken,

        shareUrl,
      });
    } catch (error) {
      console.error(
        "❌ Erreur création partage :",
        error
      );

      return res
        .status(500)
        .json({
          error:
            "Impossible de créer le lien de partage.",

          message:
            error?.message,
        });
    }
  }
);

// =========================
// 🔗 LIRE UN CONTENU PARTAGÉ
// =========================

app.get(
  "/share/:token",

  async (req, res) => {
    try {
      const token =
        String(
          req.params.token ||
            ""
        ).trim();

      if (!token) {
        return res
          .status(400)
          .json({
            error:
              "Jeton de partage manquant.",
          });
      }

      const tokenHash =
        hashShareToken(
          token
        );

      const shareRef =
        adminDb
          .collection(
            "shareLinks"
          )
          .doc(
            tokenHash
          );

      const shareSnapshot =
        await shareRef.get();

      if (
        !shareSnapshot.exists
      ) {
        return res
          .status(404)
          .json({
            error:
              "Lien de partage introuvable.",
          });
      }

      const share =
        shareSnapshot.data();

      if (
        share.active !==
        true
      ) {
        return res
          .status(410)
          .json({
            error:
              "Ce lien de partage n'est plus disponible.",
          });
      }

      await shareRef.update({
        lastAccessedAt:
          FieldValue
            .serverTimestamp(),
      });

      return res.json({
        success:
          true,

        type:
          share.type,

        contentId:
          share.contentId,

        content:
          share.content,
      });
    } catch (error) {
            console.error(
        "❌ Erreur lecture partage :",
        error
      );

      return res
        .status(500)
        .json({
          error:
            "Impossible d'ouvrir ce contenu partagé.",

          message:
            error?.message,
        });
    }
  }
);

// =========================
// ☁️ FIREBASE STORAGE
// IMAGES HISTOIRES
// =========================

app.post(
  "/story-image/upload",
  async (req, res) => {
    try {
      const decodedToken =
        await requireFirebaseUser(
          req,
          res
        );

      if (!decodedToken) {
        return;
      }

      const uid =
        decodedToken.uid;

      const {
        storyId,
        sceneIndex,
        imageBase64,
        contentType =
          "image/png",
      } = req.body;

      if (
        !storyId ||
        !Number.isInteger(
          sceneIndex
        ) ||
        !imageBase64
      ) {
        return res
          .status(400)
          .json({
            error:
              "storyId, sceneIndex et imageBase64 sont obligatoires.",
          });
      }

      const allowedContentTypes =
        [
          "image/png",
          "image/jpeg",
          "image/webp",
        ];

      if (
        !allowedContentTypes.includes(
          contentType
        )
      ) {
        return res
          .status(400)
          .json({
            error:
              "Type d'image non autorisé.",
          });
      }

      const extension =
        contentType ===
        "image/jpeg"
          ? "jpg"
          : contentType ===
              "image/webp"
            ? "webp"
            : "png";

      const cleanBase64 =
        imageBase64.includes(
          ","
        )
          ? imageBase64.split(
              ","
            )[1]
          : imageBase64;

      const imageBuffer =
        Buffer.from(
          cleanBase64,
          "base64"
        );

      if (
        !imageBuffer.length
      ) {
        return res
          .status(400)
          .json({
            error:
              "Image Base64 invalide.",
          });
      }

      const bucket =
        adminStorage.bucket();

      const storagePath =
        `users/${uid}/stories/${storyId}/` +
        `scene-${sceneIndex}.${extension}`;

      const file =
        bucket.file(
          storagePath
        );

      await file.save(
        imageBuffer,
        {
          metadata: {
            contentType,

            cacheControl:
              "public,max-age=31536000",
          },

          resumable:
            false,
        }
      );

      const [
        downloadUrl,
      ] =
        await file.getSignedUrl({
          action:
            "read",

          expires:
            "03-01-2500",
        });

      console.log(
        `☁️ Illustration ${sceneIndex + 1} sauvegardée :`,
        storagePath
      );

      return res.json({
        success: true,

        imageUrl:
          downloadUrl,

        storagePath,
      });
    } catch (error) {
      console.error(
        "❌ Erreur upload image histoire :",
        error
      );

      return res
        .status(500)
        .json({
          error:
            "Impossible de sauvegarder l'illustration.",

          message:
            error?.message,
        });
    }
  }
);

function detectRequestedLanguage(
  prompt = ""
) {
  const text =
    prompt.toLowerCase();

  const languages = [
    {
      name:
        "espagnol",

      patterns: [
        "en espagnol",
        "en español",
        "in spanish",
      ],
    },

    {
      name:
        "anglais",

      patterns: [
        "en anglais",
        "in english",
        "en inglés",
      ],
    },

    {
      name:
        "français",

      patterns: [
        "en français",
        "in french",
        "en francés",
      ],
    },

    {
      name:
        "portugais",

      patterns: [
        "en portugais",
        "em português",
        "in portuguese",
      ],
    },

    {
      name:
        "italien",

      patterns: [
        "en italien",
        "in italian",
        "in italiano",
      ],
    },

    {
      name:
        "allemand",

      patterns: [
        "en allemand",
        "auf deutsch",
        "in german",
      ],
    },

    {
      name:
        "créole guadeloupéen",

      patterns: [
        "en créole guadeloupéen",
        "en creole guadeloupeen",
        "an kréyòl gwadloupéyen",
      ],
    },

    {
      name:
        "créole martiniquais",

      patterns: [
        "en créole martiniquais",
        "en creole martiniquais",
        "an kréyòl matnik",
      ],
    },

    {
      name:
        "créole guyanais",

      patterns: [
        "en créole guyanais",
        "en creole guyanais",
        "an kréyòl gwiyannen",
      ],
    },

    {
      name:
        "créole réunionnais",

      patterns: [
        "en créole réunionnais",
        "en creole reunionnais",
        "an kréol réyoné",
      ],
    },

    {
      name:
        "créole haïtien",

      patterns: [
        "en créole haïtien",
        "en creole haitien",
        "an kreyòl ayisyen",
      ],
    },
  ];

  for (
    const language of
    languages
  ) {
    if (
      language.patterns.some(
        (pattern) =>
          text.includes(
            pattern
          )
      )
    ) {
      return language.name;
    }
  }

  return null;
}

// =========================
// 📚 TYPES D'HISTOIRE
// =========================

function normalizeStoryTypes(
  type
) {
  const allowedTypes =
    [
      "funny",
      "adventure",
      "magic",
      "mystery",
    ];

  let receivedTypes = [];

  if (
    Array.isArray(type)
  ) {
    receivedTypes =
      type;
  } else if (
    typeof type ===
      "string"
  ) {
    receivedTypes =
      type
        .split(",")
        .map(
          (value) =>
            value.trim()
        );
  }

  const validTypes =
    [
      ...new Set(
        receivedTypes.filter(
          (value) =>
            allowedTypes.includes(
              value
            )
        )
      ),
    ];

  if (
    validTypes.length === 0
  ) {
    return [
      "magic",
    ];
  }

  // Maximum deux types
  // d'histoire simultanément.
  return validTypes.slice(
    0,
    2
  );
}

function storyTypeDescription(
  type
) {
  const descriptions = {
    funny:
      "drôle, absurde, léger, avec des situations amusantes et des personnages rigolos",

    adventure:
      "aventure, exploration, défis et rythme dynamique",

    magic:
      "féerique, merveilleux, avec de la magie, de l'émerveillement et éventuellement des objets magiques",

    mystery:
      "mystère et suspense doux, avec des indices, un secret et une révélation adaptée aux enfants",
  };

  return (
    descriptions[type] ||
    descriptions.magic
  );
}

function buildStoryTypeInstructions(
  storyTypes
) {
  if (
    storyTypes.length === 1
  ) {
    const selectedType =
      storyTypes[0];

    return `
Type d'histoire sélectionné : ${selectedType}.

Caractéristiques du type sélectionné :
- ${selectedType} : ${storyTypeDescription(
      selectedType
    )}

Construis toute l'histoire autour de ce type.
`;
  }

  const [
    firstType,
    secondType,
  ] = storyTypes;

  return `
Deux types d'histoire ont été sélectionnés :
- ${firstType} : ${storyTypeDescription(
    firstType
  )}
- ${secondType} : ${storyTypeDescription(
    secondType
  )}

Fusionne naturellement ces deux types dans UNE SEULE histoire cohérente.

IMPORTANT :
- Ne crée pas deux histoires séparées.
- Les deux types doivent réellement influencer l'intrigue.
- Mélange leurs caractéristiques de manière naturelle.
- Conserve les mêmes personnages et le même fil narratif du début à la fin.
`;
}

app.post(
  "/story",
  async (req, res) => {
    try {
      const {
        prompt,

        type = "magic",

        sceneCount = 4,

        language = "fr",
      } = req.body;

      if (!prompt) {
        return res
          .status(400)
          .json({
            error:
              "Prompt manquant",
          });
      }

      const storyTypes =
        normalizeStoryTypes(
          type
        );

      const storyTypeInstructions =
        buildStoryTypeInstructions(
          storyTypes
        );

      const supportedLanguages =
        [
          "fr",
          "en",
          "es",
        ];

      const requestedLanguage =
        supportedLanguages.includes(
          language
        )
          ? language
          : "fr";

      const selectedLanguage =
        requestedLanguage;

      const languageInstructions =
        {
          fr: `
LANGUE OBLIGATOIRE :

- Écris toute l'histoire en français.
- Le titre, les textes des scènes et les descriptions destinées à l'histoire doivent être en français.
- Utilise un français naturel, chaleureux et adapté aux enfants.
`,

          en: `
MANDATORY LANGUAGE:

- Write the entire story in English.
- The title, scene texts and story content must be in English.
- Use natural, warm English suitable for children.
`,

          es: `
IDIOMA OBLIGATORIO:

- Escribe toda la historia en español.
- El título, los textos de las escenas y el contenido de la historia deben estar en español.
- Utiliza un español natural, cálido y apropiado para niños.
`,
        };

      console.log(
        "Langue choisie dans l'application :",
        selectedLanguage
      );

      console.log(
        "Type(s) d'histoire choisi(s) :",
        storyTypes
      );

      console.log(
        "Prompt reçu :",
        prompt
      );

      const response =
        await openai.chat.completions.create({
          model:
            "gpt-4o-mini",

          messages: [
            {
              role:
                "system",

              content: `
Tu es un conteur pour enfants talentueux, chaleureux et expressif.

OBJECTIF :

Créer une histoire agréable à écouter à voix haute, avec du rythme, des émotions et des pauses naturelles.

${storyTypeInstructions}

Nombre exact de scènes : ${sceneCount}

${languageInstructions[selectedLanguage]}

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
- L'histoire doit suivre précisément l'idée de l'utilisateur.
- Chaque scène doit faire avancer l'histoire.
- Fin heureuse ou cliffhanger doux selon le ou les types d'histoire.
- Pas de violence graphique.
- Si l'utilisateur demande un personnage connu, transforme-le en personnage original inspiré du rôle général.
- Retourne toujours une clé "characters".
- "characters" décrit uniquement les personnages principaux de CETTE histoire.
- Ne jamais réutiliser des personnages d'une autre histoire.
- Les personnages doivent rester cohérents dans toutes les scènes : mêmes couleurs, même apparence, mêmes accessoires.
- Les personnages secondaires et la famille doivent être cohérents avec le personnage principal.
- Si un enfant est métis, noir, asiatique ou possède des traits culturels spécifiques, sa famille et son entourage proche doivent généralement partager une cohérence visuelle et familiale.
- Évite que tous les personnages secondaires soient automatiquement blancs par défaut.
- Les personnages doivent représenter naturellement différentes origines et apparences selon l'histoire.
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
- Adapte le ton selon le ou les types d'histoire.
- Ajoute des moments calmes et des moments dynamiques.

CARACTÉRISTIQUES DES TYPES :

- funny : drôle, absurde, léger, personnages rigolos.
- adventure : action, exploration, défi, rythme dynamique.
- magic : féerique, objets magiques, émerveillement.
- mystery : suspense doux, secret, indice, révélation.

Utilise uniquement le ou les types sélectionnés plus haut.

AMBIANCES :

- magic : découverte magique, fée, objet magique, portail
- forest : forêt, animaux, nature, arbre, jungle
- ocean : mer, bateau, pirate, plage, vague
- night : nuit, sommeil, étoiles, histoire du soir
- danger : tension légère, méchant, poursuite, peur douce
- calm : moment tendre, repos, discussion, douceur
- victory : réussite, fête, fin heureuse, célébration

VARIÉTÉ :

- Évite de réutiliser souvent les mêmes prénoms.
- N'utilise presque jamais : Léo, Nina, Noé, Emma, Lila, Lucas.
- Crée des noms originaux, rares, poétiques ou amusants.
- Utilise parfois des noms fantastiques, inventés, surnoms ou noms liés à l'univers.
- Les personnages doivent sembler uniques d'une histoire à l'autre.

LANGUE DE L'HISTOIRE :

- Respecte obligatoirement la langue sélectionnée dans l'application.
- L'utilisateur peut décrire son idée dans une langue et demander que l'histoire soit racontée dans une autre langue.
- Traduis naturellement l'idée de l'utilisateur dans la langue demandée, sans modifier le sens.
- Ne mélange pas plusieurs langues, sauf demande explicite.
- Tous les textes destinés à être lus doivent être dans la langue finale : scènes, dialogues et narration.
- La clé "characters" doit aussi être écrite dans la langue finale.
- La clé "imagePrompt" peut rester en français ou en anglais pour optimiser la génération des images.

Aucun texte avant ou après le JSON.
`,
            },

            {
              role:
                "user",

              content: `
LANGUE FINALE OBLIGATOIRE : ${requestedLanguage}.

L'utilisateur a écrit sa demande dans une langue, mais toute l'histoire doit respecter la langue sélectionnée ci-dessus.

Traduis naturellement son idée dans cette langue sans modifier le sens.

Demande de l'utilisateur :

${prompt}
`,
            },
          ],
        });

      let content =
        response
          .choices[0]
          .message
          .content ||
        "";

      const start =
        content.indexOf(
          "{"
        );

      const end =
        content.lastIndexOf(
          "}"
        );

      if (
        start !== -1 &&
        end !== -1
      ) {
        content =
          content.slice(
            start,
            end + 1
          );
      }

      const story =
        JSON.parse(
          content
        );

      return res.json(
        story
      );
    } catch (e) {
      console.error(
        "Erreur /story :",
        e
      );

      return res
        .status(500)
        .json({
          error:
            "Erreur génération histoire",

          message:
            e?.message,
        });
    }
  }
);

function sanitizePrompt(
  prompt
) {
  return prompt
    .replace(
      /batman/gi,
      "super-héros original sombre avec cape noire"
    )
    .replace(
      /superman/gi,
      "super-héros original lumineux avec cape rouge"
    )
    .replace(
      /spider[- ]?man/gi,
      "héros agile en tenue rouge et bleue"
    )
    .replace(
      /iron man/gi,
      "héros en armure futuriste"
    )
    .replace(
      /hulk/gi,
      "géant vert puissant"
    )
    .replace(
      /disney|marvel|dc/gi,
      "univers imaginaire"
    );
}

function getImageStylePrompt(
  prompt
) {
  const lowerPrompt =
    prompt.toLowerCase();

  if (
    lowerPrompt.includes(
      "realistic"
    ) ||
    lowerPrompt.includes(
      "réaliste"
    ) ||
    lowerPrompt.includes(
      "cinematic"
    )
  ) {
    return `
Photographie réaliste, style cinéma familial.
Lumière naturelle, profondeur de champ, détails précis.
Textures réalistes, environnement crédible.
Pas de style dessin, pas cartoon, pas illustration.
Adapté aux enfants, doux, rassurant.
Décris précisément l'apparence des personnages importants.
`;
  }

  if (
    lowerPrompt.includes(
      "fantasy"
    )
  ) {
    return `
Illustration fantasy magique.
Lumières féeriques, couleurs riches, ambiance mystique.
Personnages expressifs, style premium, doux et familial.
`;
  }

  if (
    lowerPrompt.includes(
      "comic"
    ) ||
    lowerPrompt.includes(
      "bd"
    )
  ) {
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

app.post(
  "/image",
  async (req, res) => {
    try {
      const {
        prompt,
        referenceImage,
      } = req.body;

      if (
        !prompt?.trim()
      ) {
        return res
          .status(400)
          .json({
            error:
              "Prompt image manquant",
          });
      }

      const safePrompt =
        sanitizePrompt(
          prompt
        );

      const stylePrompt =
        getImageStylePrompt(
          safePrompt
        );

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

      if (
        referenceImage
      ) {
        const match =
          referenceImage.match(
            /^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/
          );

        if (!match) {
          return res
            .status(400)
            .json({
              error:
                "Format de photo de référence invalide",
            });
        }

        const mimeType =
          match[1];

        const base64Data =
          match[2];

        const extension =
          mimeType ===
          "image/png"
            ? "png"
            : mimeType ===
                "image/webp"
              ? "webp"
              : "jpg";
                      const imageBuffer =
          Buffer.from(
            base64Data,
            "base64"
          );

        const referenceFile =
          await toFile(
            imageBuffer,
            `reference.${extension}`,
            {
              type:
                mimeType ===
                "image/jpg"
                  ? "image/jpeg"
                  : mimeType,
            }
          );

        result =
          await openai.images.edit({
            model:
              "gpt-image-2",

            image:
              referenceFile,

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

IDENTITÉ DES PERSONNES :

L'identité visuelle de chaque personnage principal doit rester stable d'une scène à l'autre.

Considère chaque personne de référence comme un personnage fixe de la série.

Conserve strictement :

- la forme générale du visage
- la structure du visage
- la forme des yeux
- l'écartement des yeux
- la forme du nez
- la forme de la bouche
- la ligne de la mâchoire
- la couleur de peau
- la coiffure
- la couleur, la texture et la longueur des cheveux
- l'âge apparent
- les proportions générales
- les traits distinctifs visibles

RÈGLES STRICTES SUR LES VISAGES :

- ne redessine pas un visage différemment d'une scène à l'autre
- ne change pas arbitrairement la forme des yeux, du nez, de la bouche ou de la mâchoire
- ne rajeunis pas et ne vieillis pas un personnage
- ne modifie pas la couleur de peau
- ne change pas de coiffure sauf si la scène le demande explicitement
- ne transforme pas progressivement un personnage en une autre personne
- lorsque le même personnage réapparaît, il doit être immédiatement reconnaissable comme exactement la même personne
- la pose, l'expression et l'angle de vue peuvent changer, mais l'identité faciale doit rester stable

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

RÉFÉRENCE PRIORITAIRE :

En cas de conflit entre la créativité de la scène et la fidélité au personnage, privilégie toujours la fidélité au personnage.

Ne crée pas une nouvelle interprétation du visage à chaque illustration.

Traite la photo de référence comme la fiche d'identité visuelle permanente des personnages principaux pour toute l'histoire.

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

            size:
              "1024x1024",

            quality:
              "medium",
          });
      } else {
        result =
          await openai.images.generate({
            model:
              "gpt-image-2",

            prompt:
              finalPrompt,

            size:
              "1024x1024",

            quality:
              "medium",
          });
      }

      const base64 =
        result.data?.[0]
          ?.b64_json;

      if (!base64) {
        throw new Error(
          "Aucune image retournée par OpenAI"
        );
      }

      return res.json({
        imageUrl:
          `data:image/png;base64,${base64}`,
      });
    } catch (e) {
      console.error(
        "Erreur /image complète :",
        e
      );

      return res
        .status(500)
        .json({
          error:
            "Erreur génération image",

          message:
            e?.message,

          status:
            e?.status,
        });
    }
  }
);

// =========================
// 🔊 TTS
// =========================

app.post(
  "/tts",
  async (req, res) => {
    console.log(
      "Requête TTS reçue :",
      req.body?.text?.slice(
        0,
        80
      )
    );

    try {
      const {
        text,
        mode = "story",
        emotion = "warm",
        narrator =
          "narratrice",
        language = "fr",
      } = req.body;

      const supportedLanguages =
        [
          "fr",
          "en",
          "es",
        ];

      const selectedLanguage =
        supportedLanguages.includes(
          language
        )
          ? language
          : "fr";

      const languageInstructions =
        {
          fr: `
Lis le texte en français.
Utilise une prononciation française naturelle et claire.
Ne traduis pas le texte dans une autre langue.
`,

          en: `
Read the text in English.
Use natural, clear English pronunciation.
Do not translate the text into another language.
`,

          es: `
Lee el texto en español.
Utiliza una pronunciación española natural y clara.
No traduzcas el texto a otro idioma.
`,
        };

      if (!text?.trim()) {
        return res
          .status(400)
          .json({
            error:
              "Texte manquant",
          });
      }

      const narratorProfiles =
        {
          narratrice: {
            voice:
              "nova",

            instructions: `
Lis comme une conteuse chaleureuse pour enfants.
Voix naturelle, douce, expressive.
Raconte comme une maman lisant une histoire.
`,
          },

          narrateur: {
            voice:
              "onyx",

            instructions: `
Lis comme un papa racontant une histoire.
Voix grave, rassurante, naturelle, expressive.
Prends ton temps et fais des pauses naturelles.
`,
          },

          magicien: {
            voice:
              "sage",

            instructions: `
Lis comme un vieux magicien bienveillant.
Voix mystérieuse mais chaleureuse, expressive, naturelle.
`,
          },

          fee: {
            voice:
              "shimmer",

            instructions: `
Lis comme une fée joyeuse.
Voix légère, lumineuse, pleine d'émerveillement, naturelle, expressive.
`,
          },

          mamie: {
            voice:
              "ballad",

            instructions: `
Lis comme une grand-mère racontant un conte à ses petits-enfants.
Voix très douce, lente et affectueuse, expressive, naturelle.
`,
          },

          garcon: {
            voice:
              "echo",

            instructions: `
Lis comme un jeune garçon racontant une aventure.
Voix vive, enthousiaste et naturelle, expressive.
`,
          },
        };

      const profile =
        narratorProfiles[
          narrator
        ] ||
        narratorProfiles
          .narratrice;

      console.log(
        "Narrateur reçu :",
        narrator
      );

      console.log(
        "Voix choisie :",
        profile.voice
      );

      let emotionInstructions =
        "";

      if (
        emotion ===
        "danger"
      ) {
        emotionInstructions =
          "Ajoute un suspense très léger, sans jamais devenir effrayant.";
      } else if (
        emotion ===
        "victory"
      ) {
        emotionInstructions =
          "Utilise un ton joyeux et chaleureux.";
      } else if (
        emotion ===
        "calm"
      ) {
        emotionInstructions =
          "Utilise un ton doux et paisible.";
      } else if (
        emotion ===
        "night"
      ) {
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

${languageInstructions[selectedLanguage]}

${emotionInstructions}

${bedtimeInstructions}

Respecte exactement le texte fourni.
Ne traduis jamais le contenu.
Prononce les mots naturellement dans la langue sélectionnée.
`;

      console.log(
        "Langue TTS :",
        selectedLanguage
      );

      const response =
        await openai.audio.speech.create({
          model:
            "gpt-4o-mini-tts",

          voice:
            profile.voice,

          input:
            text,

          instructions,

          response_format:
            "mp3",
        });

      const buffer =
        Buffer.from(
          await response.arrayBuffer()
        );

      res.setHeader(
        "Content-Type",
        "audio/mpeg"
      );

      res.setHeader(
        "Content-Length",
        buffer.length.toString()
      );

      return res.send(
        buffer
      );
    } catch (e) {
      console.error(
        "Erreur TTS complète :",
        e
      );

      return res
        .status(500)
        .json({
          error:
            "Erreur génération TTS",

          message:
            e?.message,

          status:
            e?.status,
        });
    }
  }
);

// =========================
// 🛒 GOOGLE PLAY
// =========================

app.post(
  "/google-play/verify-purchase",
  async (req, res) => {
    console.log(
      "🛒 Requête Google Play reçue"
    );

    console.log(
      "🛒 productId :",
      req.body?.productId
    );

    console.log(
      "🛒 purchaseToken présent :",
      !!req.body
        ?.purchaseToken
    );

    console.log(
      "🔥 Authorization présente :",
      !!req.headers
        .authorization
    );

    try {
      const authorization =
        req.headers
          .authorization ||
        "";

      if (
        !authorization.startsWith(
          "Bearer "
        )
      ) {
        return res
          .status(401)
          .json({
            error:
              "Authentification Firebase requise.",
          });
      }

      const idToken =
        authorization.substring(
          7
        );

      const decodedToken =
        await firebaseAuth
          .verifyIdToken(
            idToken
          );

      const uid =
        decodedToken.uid;

      const {
        productId,
        purchaseToken,
      } = req.body;

      if (
        !productId ||
        !purchaseToken
      ) {
        return res
          .status(400)
          .json({
            error:
              "productId et purchaseToken sont obligatoires.",
          });
      }

      const productConfig =
        GOOGLE_PLAY_PRODUCTS[
          productId
        ];

      if (!productConfig) {
        return res
          .status(400)
          .json({
            error:
              "Produit Google Play inconnu.",
          });
      }

      const purchaseResponse =
        await androidPublisher
          .purchases
          .productsv2
          .getproductpurchasev2({
            packageName:
              GOOGLE_PLAY_PACKAGE_NAME,

            token:
              purchaseToken,
          });

      const purchase =
        purchaseResponse.data;

      const purchaseState =
        purchase
          .purchaseStateContext
          ?.purchaseState;

      if (
        purchaseState !==
        "PURCHASED"
      ) {
        return res
          .status(400)
          .json({
            error:
              "L'achat n'est pas encore validé.",

            purchaseState,
          });
      }

      const purchasedItem =
        purchase
          .productLineItem
          ?.find(
            (item) =>
              item.productId ===
              productId
          );

      if (!purchasedItem) {
        return res
          .status(400)
          .json({
            error:
              "Le produit acheté ne correspond pas au produit demandé.",
          });
      }

      const consumptionState =
        purchasedItem
          .productOfferDetails
          ?.consumptionState;

      const purchaseHash =
        crypto
          .createHash(
            "sha256"
          )
          .update(
            purchaseToken
          )
          .digest(
            "hex"
          );

      const userRef =
        adminDb
          .collection(
            "users"
          )
          .doc(uid);

      const purchaseRef =
        adminDb
          .collection(
            "googlePlayPurchases"
          )
          .doc(
            purchaseHash
          );

      let alreadyCredited =
        false;

      await adminDb.runTransaction(
        async (
          transaction
        ) => {
          const purchaseSnapshot =
            await transaction.get(
              purchaseRef
            );

          if (
            purchaseSnapshot.exists
          ) {
            const existingPurchase =
              purchaseSnapshot.data();

            if (
              existingPurchase.uid !==
                uid ||
              existingPurchase.productId !==
                productId
            ) {
              throw new Error(
                "Ce paiement a déjà été associé à un autre compte ou produit."
              );
            }

            alreadyCredited =
              true;

            return;
          }

          const userSnapshot =
            await transaction.get(
              userRef
            );

          if (
            !userSnapshot.exists
          ) {
            throw new Error(
              "Profil utilisateur introuvable."
            );
          }

          if (
            productConfig.type ===
            "video"
          ) {
            transaction.update(
              userRef,
              {
                [`videoCredits.${productConfig.videoType}.remaining`]:
                  FieldValue.increment(
                    productConfig.credits
                  ),

                [`videoCredits.${productConfig.videoType}.purchases`]:
                  FieldValue.increment(
                    1
                  ),
              }
            );
          } else {
            transaction.update(
              userRef,
              {
                [`packs.${productConfig.packType}.storiesRemaining`]:
                  FieldValue.increment(
                    productConfig.stories
                  ),

                [`packs.${productConfig.packType}.purchases`]:
                  FieldValue.increment(
                    1
                  ),
              }
            );
          }

          transaction.set(
            purchaseRef,
            {
              uid,

              productId,

              type:
                productConfig.type,

              packType:
                productConfig.packType ||
                null,

              stories:
                productConfig.stories ||
                0,

              videoType:
                productConfig.videoType ||
                null,

              scenes:
                productConfig.scenes ||
                0,

              videoCredits:
                productConfig.credits ||
                0,

              orderId:
                purchase.orderId ||
                null,

              creditedAt:
                new Date()
                  .toISOString(),

              consumed:
                false,
            }
          );
        }
      );

      return res.json({
        success:
          true,

        alreadyCredited,

        productId,

        type:
          productConfig.type,

        packType:
          productConfig.packType ||
          null,

        stories:
          productConfig.stories ||
          0,

        videoType:
                  productConfig.videoType ||
          null,

        scenes:
          productConfig.scenes ||
          0,

        videoCredits:
          productConfig.credits ||
          0,
      });
    } catch (error) {
      console.error(
        "Erreur vérification Google Play :",
        error
      );

      return res
        .status(500)
        .json({
          error:
            "Impossible de vérifier l'achat Google Play.",

          message:
            error?.message,
        });
    }
  }
);

// =========================
// 🍎 APPLE
// =========================

const APPLE_APP_ID =
  6805620727;

const APPLE_ROOT_CA_URLS =
  [
    "https://www.apple.com/appleca/AppleIncRootCertificate.cer",

    "https://www.apple.com/certificateauthority/AppleRootCA-G2.cer",

    "https://www.apple.com/certificateauthority/AppleRootCA-G3.cer",
  ];

let appleRootCertificatesCache =
  null;

async function getAppleRootCertificates() {
  if (
    appleRootCertificatesCache
  ) {
    return appleRootCertificatesCache;
  }

  const certificates =
    await Promise.all(
      APPLE_ROOT_CA_URLS.map(
        async (url) => {
          const response =
            await fetch(
              url
            );

          if (
            !response.ok
          ) {
            throw new Error(
              `Impossible de télécharger un certificat Apple (${response.status}).`
            );
          }

          return Buffer.from(
            await response.arrayBuffer()
          );
        }
      )
    );

  appleRootCertificatesCache =
    certificates;

  return certificates;
}

async function createAppleVerifier(
  environment
) {
  const rootCertificates =
    await getAppleRootCertificates();

  return new SignedDataVerifier(
    rootCertificates,
    true,
    environment,
    APPLE_BUNDLE_ID,

    environment ===
      Environment.PRODUCTION
      ? APPLE_APP_ID
      : undefined
  );
}

async function verifyAppleTransaction(
  transactionId
) {
  const environments = [
    Environment.PRODUCTION,
    Environment.SANDBOX,
  ];

  let lastError =
    null;

  for (
    const environment of
    environments
  ) {
    try {
      const client =
        createAppleClient(
          environment
        );

      const response =
        await client
          .getTransactionInfo(
            transactionId
          );

      if (
        !response
          ?.signedTransactionInfo
      ) {
        throw new Error(
          "Apple n'a retourné aucune transaction signée."
        );
      }

      const verifier =
        await createAppleVerifier(
          environment
        );

      const transaction =
        await verifier
          .verifyAndDecodeTransaction(
            response.signedTransactionInfo
          );

      return {
        transaction,
        environment,
      };
    } catch (error) {
      lastError =
        error;

      console.log(
        `Échec vérification Apple ${environment} :`,
        error?.message ||
          error
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
    console.log(
      "🍎 Requête Apple reçue"
    );

    console.log(
      "🍎 productId :",
      req.body?.productId
    );

    console.log(
      "🍎 transactionId présent :",
      !!req.body
        ?.transactionId
    );

    try {
      const authorization =
        req.headers
          .authorization ||
        "";

      if (
        !authorization.startsWith(
          "Bearer "
        )
      ) {
        return res
          .status(401)
          .json({
            error:
              "Authentification Firebase requise.",
          });
      }

      const idToken =
        authorization.substring(
          7
        );

      const decodedToken =
        await firebaseAuth
          .verifyIdToken(
            idToken
          );

      const uid =
        decodedToken.uid;

      const {
        productId,
        transactionId,
      } = req.body;

      if (
        !productId ||
        !transactionId
      ) {
        return res
          .status(400)
          .json({
            error:
              "productId et transactionId sont obligatoires.",
          });
      }

      const productConfig =
        APPLE_PRODUCTS[
          productId
        ];

      if (!productConfig) {
        return res
          .status(400)
          .json({
            error:
              "Produit Apple inconnu.",
          });
      }

      const {
        transaction,
        environment,
      } =
        await verifyAppleTransaction(
          String(
            transactionId
          )
        );

      if (
        transaction.bundleId !==
        APPLE_BUNDLE_ID
      ) {
        return res
          .status(400)
          .json({
            error:
              "La transaction ne correspond pas à ConteMagiqueIA.",
          });
      }

      if (
        transaction.productId !==
        productId
      ) {
        return res
          .status(400)
          .json({
            error:
              "Le produit acheté ne correspond pas au produit demandé.",
          });
      }

      if (
        !transaction.transactionId
      ) {
        return res
          .status(400)
          .json({
            error:
              "Identifiant de transaction Apple manquant.",
          });
      }

      if (
        transaction.revocationDate
      ) {
        return res
          .status(400)
          .json({
            error:
              "Cette transaction Apple a été révoquée ou remboursée.",
          });
      }

      const verifiedTransactionId =
        String(
          transaction.transactionId
        );

      const purchaseHash =
        crypto
          .createHash(
            "sha256"
          )
          .update(
            verifiedTransactionId
          )
          .digest(
            "hex"
          );

      const userRef =
        adminDb
          .collection(
            "users"
          )
          .doc(uid);

      const purchaseRef =
        adminDb
          .collection(
            "applePurchases"
          )
          .doc(
            purchaseHash
          );

      let alreadyCredited =
        false;

      await adminDb.runTransaction(
        async (
          firestoreTransaction
        ) => {
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
              existingPurchase.uid !==
                uid ||
              existingPurchase.productId !==
                productId
            ) {
              throw new Error(
                "Cette transaction Apple a déjà été associée à un autre compte ou produit."
              );
            }

            alreadyCredited =
              true;

            return;
          }

          const userSnapshot =
            await firestoreTransaction.get(
              userRef
            );

          if (
            !userSnapshot.exists
          ) {
            throw new Error(
              "Profil utilisateur introuvable."
            );
          }

          if (
            productConfig.type ===
            "video"
          ) {
            firestoreTransaction.update(
              userRef,
              {
                [`videoCredits.${productConfig.videoType}.remaining`]:
                  FieldValue.increment(
                    productConfig.credits
                  ),

                [`videoCredits.${productConfig.videoType}.purchases`]:
                  FieldValue.increment(
                    1
                  ),
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
                  FieldValue.increment(
                    1
                  ),
              }
            );
          }

          firestoreTransaction.set(
            purchaseRef,
            {
              uid,

              productId,

              type:
                productConfig.type,

              packType:
                productConfig.packType ||
                null,

              stories:
                productConfig.stories ||
                0,

              videoType:
                productConfig.videoType ||
                null,

              scenes:
                productConfig.scenes ||
                0,

              videoCredits:
                productConfig.credits ||
                0,

              transactionId:
                verifiedTransactionId,

              environment:
                environment ||
                null,

              creditedAt:
                new Date()
                  .toISOString(),

              consumed:
                false,
            }
          );
        }
      );

      return res.json({
        success:
          true,

        alreadyCredited,

        productId,

        type:
          productConfig.type,

        packType:
          productConfig.packType ||
          null,

        stories:
          productConfig.stories ||
          0,

        videoType:
          productConfig.videoType ||
          null,

        scenes:
          productConfig.scenes ||
          0,

        videoCredits:
          productConfig.credits ||
          0,

        transactionId:
          verifiedTransactionId,
      });
    } catch (error) {
      console.error(
        "Erreur vérification Apple :",
        error
      );

      return res
        .status(500)
        .json({
          error:
            "Impossible de vérifier l'achat Apple.",

          message:
            error?.message,
        });
    }
  }
);

// =========================
// 🎬 RUNWAY
// OUTILS DE SÉCURISATION
// =========================

function createVideoImagesHash(
  images
) {
  return crypto
    .createHash(
      "sha256"
    )
    .update(
      JSON.stringify(
        images
      )
    )
    .digest(
      "hex"
    );
}

function buildRunwayMotionPrompt(
  scenePrompt = ""
) {
  const cleanScenePrompt =
    String(scenePrompt || "")
      .replace(/\s+/g, " ")
      .trim();

  const basePrompt = `
Animate the exact source illustration as a lively children's animated movie scene.

PRESERVE THE SOURCE IMAGE:
Keep the same characters, faces, clothing, colors, proportions, environment and illustration style.

CHARACTER IDENTITY LOCK:
- same face and facial structure
- same skin tone
- same hairstyle and hair color
- same apparent age
- same body proportions
- same clothing and clothing colors
- same shoes and accessories
- same important objects
- do not redesign the characters

CHARACTER CONTINUITY:
- do not add characters
- do not remove characters
- do not duplicate characters
- do not merge characters
- do not replace characters
- do not transform one character into another
- do not change clothing
- do not invent new accessories

ACTION AND MOVEMENT:
Create clearly visible, natural and expressive movement.

The characters should actively perform the action suggested by the scene context.

When appropriate:
- characters can walk, run, turn, reach, point, wave or interact
- characters can move their arms, hands, head and body naturally
- characters can look at each other or react to events
- use expressive but natural body language
- animate hair and clothing naturally
- animate relevant objects in the scene
- animate the environment when appropriate
- use natural blinking and facial reactions

Do not keep the characters almost motionless.
Do not limit the animation to only blinking or breathing.

CAMERA:
Use gentle cinematic camera movement when it improves the scene.

Allowed camera movement:
- slow push-in
- slow pull-back
- gentle pan
- subtle tracking movement
- slight cinematic reframing

Keep camera movement smooth and child-friendly.

Do not use:
- violent camera shake
- rapid spinning
- extreme zoom
- abrupt cuts
- distorted perspective

Keep the important characters visible and avoid cropping faces.

SCENE DIRECTION:
The animation must visually express what is happening in the scene context.

Prioritize one clear main action instead of random movement.

If the scene describes movement, show that movement clearly.
If the scene describes a reaction, animate the character's reaction.
If the scene contains magic, animate the magical elements.
If the scene contains nature, give the environment gentle life.
If the scene is calm, use slower movement.
If the scene is exciting, use more energetic but controlled movement.

STYLE:
Preserve the exact illustration style, lighting, colors and atmosphere of the source image.

The result should feel like the original illustration has become a real animated children's movie scene.

Smooth, coherent, expressive and stable animation.
`;

  if (!cleanScenePrompt) {
    return basePrompt
      .trim()
      .slice(0, 1000);
  }

  const sceneContext = `
SCENE CONTEXT:
${cleanScenePrompt}

Animate the characters according to this specific scene while preserving their identity and the original illustration.
`;

  return `${basePrompt}
${sceneContext}`
    .trim()
    .slice(0, 1000);
}

function getRunwayTaskOutputUrl(
  task
) {
  const output =
    task?.output;

  if (
    Array.isArray(output) &&
    output.length > 0
  ) {
    const firstOutput =
      output[0];

    if (
      typeof firstOutput ===
      "string"
    ) {
      return firstOutput;
    }

    if (
      typeof firstOutput?.url ===
      "string"
    ) {
      return firstOutput.url;
    }
  }

  if (
    typeof output ===
    "string"
  ) {
    return output;
  }

  if (
    typeof task?.outputUrl ===
    "string"
  ) {
    return task.outputUrl;
  }

  return null;
}

async function saveRunwayTaskState({
  uid,
  generationRef,
  sceneIndex,
  taskId = null,
  status,
  sourceImage,
  videoUrl = null,
  errorMessage = null,
}) {
  if (
    !generationRef
  ) {
    return;
  }

  const generationSnapshot =
    await generationRef.get();

  if (
    !generationSnapshot.exists
  ) {
    throw new Error(
      "Génération vidéo introuvable."
    );
  }

  const generation =
    generationSnapshot.data();

  if (
    generation.uid !== uid
  ) {
    throw new Error(
      "Utilisateur incorrect pour cette tâche Runway."
    );
  }

  const update = {
    [`runwayTasks.${sceneIndex}.status`]:
      status,

    [`runwayTasks.${sceneIndex}.sourceImage`]:
      sourceImage ||
      null,

    [`runwayTasks.${sceneIndex}.updatedAt`]:
      FieldValue.serverTimestamp(),

    lastProgressAt:
      FieldValue.serverTimestamp(),
  };

  if (taskId) {
    update[
      `runwayTasks.${sceneIndex}.taskId`
    ] = taskId;
  }

  if (videoUrl) {
    update[
      `runwayTasks.${sceneIndex}.videoUrl`
    ] = videoUrl;
  }

  if (errorMessage) {
    update[
      `runwayTasks.${sceneIndex}.errorMessage`
    ] =
      String(
        errorMessage
      ).slice(
        0,
        1000
      );
  }

  await generationRef.update(
    update
  );
}

async function getRunwaySceneTask(
  generationRef,
  sceneIndex
) {
  const snapshot =
    await generationRef.get();

  if (
    !snapshot.exists
  ) {
    return null;
  }

  const generation =
    snapshot.data();

  return (
    generation
      ?.runwayTasks?.[
        sceneIndex
      ] ||
    null
  );
}

async function waitForRunwayTask(
  taskId
) {
  const maxAttempts =
    180;

  for (
    let attempt = 0;
    attempt <
    maxAttempts;
    attempt++
  ) {
    const task =
      await runway.tasks.retrieve(
        taskId
      );

    const status =
      String(
        task?.status ||
          ""
      ).toUpperCase();

    if (
      status ===
      "SUCCEEDED"
    ) {
      return task;
    }

    if (
      status ===
        "FAILED" ||
      status ===
        "CANCELED" ||
      status ===
        "CANCELLED"
    ) {
      const error =
        new Error(
          `La tâche Runway ${taskId} a échoué avec le statut ${status}.`
        );

      error.code =
        "RUNWAY_TASK_FAILED";

      error.runwayTask =
        task;

      throw error;
    }

    await new Promise(
      (resolve) =>
        setTimeout(
          resolve,
          5000
        )
    );
  }

  const error =
    new Error(
      "La génération Runway prend trop de temps. Elle pourra être reprise sans recréer volontairement les scènes déjà enregistrées."
    );

  error.code =
    "RUNWAY_TASK_TIMEOUT";

  throw error;
}

// ========================================
// 🎬 CONTINUOUS VIDEO - FIREBASE ADAPTER
// ========================================

async function getContinuousSceneState(
  uid,
  generationRef,
  sceneIndex
) {
  const snapshot =
    await generationRef.get();

  if (!snapshot.exists) {
    throw new Error(
      "Génération vidéo introuvable."
    );
  }

  const generation =
    snapshot.data();

  if (generation.uid !== uid) {
    throw new Error(
      "Utilisateur incorrect pour cette génération vidéo."
    );
  }

  const existingState =
    generation
      ?.continuousScenes?.[
        sceneIndex
      ];

  if (
    existingState &&
    typeof existingState ===
      "object"
  ) {
    return existingState;
  }

  return {
    clips: [],
  };
}

async function saveContinuousSceneState({
  uid,
  generationRef,
  sceneIndex,
  state,
}) {
  const snapshot =
    await generationRef.get();

  if (!snapshot.exists) {
    throw new Error(
      "Génération vidéo introuvable."
    );
  }

  const generation =
    snapshot.data();

  if (generation.uid !== uid) {
    throw new Error(
      "Utilisateur incorrect pour cette génération vidéo."
    );
  }

  await generationRef.update({
    [`continuousScenes.${sceneIndex}`]:
      state,

    status:
      "partial",

    lastProgressAt:
      FieldValue.serverTimestamp(),
  });
}

function createContinuousSceneFiles({
  uid,
  generationId,
  sceneIndex,
}) {
  const bucket =
    adminStorage.bucket();

  const basePath =
    `videos/${uid}/${generationId}/continuous/scene-${sceneIndex + 1}`;

  function storagePath(
    name
  ) {
    return `${basePath}/${name}`;
  }

  return {
    async exists(name) {
      const file =
        bucket.file(
          storagePath(name)
        );

      const [exists] =
        await file.exists();

      return exists;
    },

    async get(
      name,
      localPath
    ) {
      const file =
        bucket.file(
          storagePath(name)
        );

      await file.download({
        destination:
          localPath,
      });
    },

    async put(
      name,
      localPath
    ) {
      const file =
        bucket.file(
          storagePath(name)
        );

      await bucket.upload(
        localPath,
        {
          destination:
            file.name,

          resumable:
            false,

          metadata: {
            cacheControl:
              "private,max-age=3600",
          },
        }
      );
    },
  };
}

async function createContinuousNarratedScene({
  uid,
  generationRef,
  sceneIndex,
  imageUrl,
  sceneText,
  motionText,
  emotion,
  narrator,
  mode,
  language,
  videoModel,
  legacyVideoUrl = null,
  tempDir,
}) {
  if (!ffmpegPath) {
    throw new Error(
      "FFmpeg introuvable."
    );
  }

  const state =
    await getContinuousSceneState(
      uid,
      generationRef,
      sceneIndex
    );

  const files =
    createContinuousSceneFiles({
      uid,
      generationId:
        generationRef.id,
      sceneIndex,
    });

  const sceneDir =
    path.join(
      tempDir,
      `continuous-scene-${sceneIndex + 1}`
    );

  const saveState =
    async (nextState) => {
      await saveContinuousSceneState({
        uid,
        generationRef,
        sceneIndex,
        state:
          nextState,
      });
    };

  const createAudio =
    async () => {
      return createNarrationMp3({
        text:
          sceneText,

        mode,

        emotion,

        narrator,

        language,
      });
    };

  return continuousScene({
    state,

    saveState,

    files,

    createAudio,

    runway,

    download:
      downloadFile,

    ffmpeg:
      ffmpegPath,

    dir:
      sceneDir,

    image:
      imageUrl,

    // Le texte envoyé à Runway peut
    // contenir le prompt visuel,
    // la narration et le contexte global.
    text:
      motionText ||
      sceneText,

    model:
      videoModel,

    // Permet de reprendre une ancienne
    // première vidéo Runway si elle existe.
    legacyVideoUrl,
  });
}

// ========================================
// ☁️ SAUVEGARDE D'UNE SCÈNE CONTINUE
// ========================================

async function saveContinuousNarratedScene({
  uid,
  generationRef,
  sceneIndex,
  localPath,
}) {
  const bucket =
    adminStorage.bucket();

  const storagePath =
    `videos/${uid}/${generationRef.id}/continuous/scene-${sceneIndex + 1}/narrated.mp4`;

  const file =
    bucket.file(
      storagePath
    );

  const downloadToken =
    crypto.randomUUID();

  await file.save(
    await fs.promises.readFile(
      localPath
    ),
    {
      resumable:
        false,

      metadata: {
        contentType:
          "video/mp4",

        cacheControl:
          "private,max-age=3600",

        metadata: {
          firebaseStorageDownloadTokens:
            downloadToken,
        },
      },
    }
  );

  const encodedPath =
    encodeURIComponent(
      storagePath
    );

  const videoUrl =
    `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${downloadToken}`;

  await generationRef.update({
    [`continuousScenes.${sceneIndex}.narratedVideoUrl`]:
      videoUrl,

    [`continuousScenes.${sceneIndex}.narratedStoragePath`]:
      storagePath,

    [`continuousScenes.${sceneIndex}.completed`]:
      true,

    [`continuousScenes.${sceneIndex}.completedAt`]:
      FieldValue.serverTimestamp(),

    lastProgressAt:
      FieldValue.serverTimestamp(),
  });

  return videoUrl;
}

async function createOrResumeRunwayScene({
  uid,
  generationRef,
  sceneIndex,
  imageUrl,
  scenePrompt,
  videoModel,
}) {
  const existingTask =
    await getRunwaySceneTask(
      generationRef,
      sceneIndex
    );

  if (
    existingTask?.videoUrl
  ) {
    console.log(
      `♻️ Scène ${sceneIndex + 1} déjà terminée, réutilisation.`
    );

    return existingTask
      .videoUrl;
  }

  let taskId =
    existingTask?.taskId ||
    null;

  if (!taskId) {
    // Important :
    // on marque la scène AVANT
    // d'envoyer la demande Runway.
    //
    // Si une erreur réseau ambiguë
    // survient pendant la création,
    // on évite de relancer
    // automatiquement une deuxième
    // génération payante.
    if (
      existingTask?.status ===
      "submitting"
    ) {
      const error =
        new Error(
          `La scène ${sceneIndex + 1} possède une demande Runway dont le résultat de soumission est incertain. Une nouvelle tâche n'est pas lancée automatiquement afin d'éviter une double facturation.`
        );

      error.code =
        "RUNWAY_SUBMISSION_UNCERTAIN";

      throw error;
    }

    await saveRunwayTaskState({
      uid,
      generationRef,
      sceneIndex,
      status:
        "submitting",
      sourceImage:
        imageUrl,
    });

    let task;

    try {
      task =
        await runway.imageToVideo.create(
          {
            model:
              videoModel,

            promptImage:
              imageUrl,

            promptText:
              buildRunwayMotionPrompt(
                scenePrompt
              ),

            ratio:
              "720:1280",

            duration:
              5,
          },
          {
            maxRetries:
              0,
          }
        );
    } catch (error) {
      console.error(
        `❌ Erreur soumission Runway scène ${sceneIndex + 1} :`,
        error
      );

      // On ne remet PAS automatiquement
      // la scène à "failed".
      //
      // En cas d'erreur réseau, Runway
      // peut avoir accepté la tâche sans
      // que notre serveur ait reçu son ID.
      // La relancer immédiatement pourrait
      // donc coûter deux générations.
      throw error;
    }

    taskId =
      task?.id ||
      task?.taskId ||
      null;

    if (!taskId) {
      const error =
        new Error(
          "Runway n'a retourné aucun identifiant de tâche."
        );

      error.code =
        "RUNWAY_TASK_ID_MISSING";

      throw error;
    }

    await saveRunwayTaskState({
      uid,
      generationRef,
      sceneIndex,
      taskId,
      status:
        "processing",
      sourceImage:
        imageUrl,
    });
  } else {
    console.log(
      `♻️ Reprise de la tâche Runway ${taskId} pour la scène ${sceneIndex + 1}.`
    );
  }

  try {
    const completedTask =
      await waitForRunwayTask(
        taskId
      );

    const videoUrl =
      getRunwayTaskOutputUrl(
        completedTask
      );

    if (!videoUrl) {
      throw new Error(
        `Aucune URL vidéo retournée par Runway pour la scène ${sceneIndex + 1}.`
      );
    }

    await saveRunwayTaskState({
      uid,
      generationRef,
      sceneIndex,
      taskId,
      status:
        "completed",
      sourceImage:
        imageUrl,
      videoUrl,
    });

    return videoUrl;
  } catch (error) {
    if (
      error?.code ===
      "RUNWAY_TASK_FAILED"
    ) {
      await saveRunwayTaskState({
        uid,
        generationRef,
        sceneIndex,
        taskId,
        status:
          "failed",
        sourceImage:
          imageUrl,
        errorMessage:
          error?.message,
      });
    }

    throw error;
  }
}

// =========================
// 🎬 RUNWAY - IMAGE TO VIDEO
// =========================

app.post(
  "/video",
  async (req, res) => {
    let generationRef =
      null;

    let uid =
      null;

    let runwaySucceeded =
      false;

    let videoUrls =
      [];

    try {
      const decodedToken =
        await requireFirebaseUser(
          req,
          res
        );

      if (!decodedToken) {
        return;
      }

      uid =
        decodedToken.uid;

      console.log(
        "🎬 Demande vidéo autorisée pour :",
        uid
      );

      const {
  images,
  prompt,
  generationId = null,
  requestId = null,
  scenes = [],
  narrator = "narratrice",
  mode = "story",
  language = "fr",
} = req.body;

const videoModel =
  req.body?.videoModel === "gen4.5"
    ? "gen4.5"
    : "gen4_turbo";

if (
  !Array.isArray(images) ||
  images.length === 0
) {
  return res
    .status(400)
    .json({
      error:
        "Aucune image de scène reçue.",
    });
}

if (
  images.length !== 4 &&
  images.length !== 6
) {
  return res
    .status(400)
    .json({
      error:
        "Le dessin animé doit contenir exactement 4 ou 6 scènes.",
    });
}

if (
  !requestId ||
  typeof requestId !== "string"
) {
  return res
    .status(400)
    .json({
      error:
        "Identifiant de requête vidéo manquant.",
      code:
        "VIDEO_REQUEST_ID_REQUIRED",
    });
}

const sceneCount =
  images.length;

console.log(
  "🆔 VIDEO requestId reçu :",
  requestId
);

console.log(
  "🎬 Nombre de scènes :",
  sceneCount
);

console.log(
  "🤖 Modèle vidéo :",
  videoModel
);

const imagesHash =
  createVideoImagesHash(
    images
  );

// Empreinte stable de la narration.
//
// Elle permet d'empêcher qu'un même requestId
// soit réutilisé accidentellement avec une
// histoire différente.
const narration =
  JSON.stringify({
    prompt:
      typeof prompt === "string"
        ? prompt
        : "",

    scenes:
      Array.isArray(scenes)
        ? scenes.map(
            (scene) => ({
              text:
                typeof scene?.text ===
                "string"
                  ? scene.text
                  : "",

              emotion:
                typeof scene?.emotion ===
                "string"
                  ? scene.emotion
                  : "warm",
            })
          )
        : [],

    narrator:
      typeof narrator === "string"
        ? narrator
        : "narratrice",

    mode:
      typeof mode === "string"
        ? mode
        : "story",

    language:
      typeof language === "string"
        ? language
        : "fr",
  });

let startSceneIndex =
  0;

      // ========================================
      // 🔄 REPRISE D'UNE GÉNÉRATION PARTIELLE
      // ========================================

      if (generationId) {
        const generationRefToCheck =
          adminDb
            .collection(
              "videoGenerations"
            )
            .doc(
              generationId
            );

        const reconciliation =
          await reconcileStaleVideoGeneration(
            uid,
            generationRefToCheck
          );

        if (
          reconciliation.action ===
          "refunded"
        ) {
          return res
            .status(409)
            .json({
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

        // Sécurité :
        // une génération reprise
        // doit utiliser le même
        // modèle Runway.
        if (
          partial.generation
            .model &&
          partial.generation
            .model !==
            videoModel
        ) {
          return res
            .status(409)
            .json({
              error:
                "Le modèle vidéo ne correspond pas à la génération d'origine.",

              code:
                "VIDEO_MODEL_MISMATCH",
            });
        }

        generationRef =
          partial.generationRef;

        videoUrls =
          partial.videoUrls;

        startSceneIndex =
          partial.nextSceneIndex;

        // Sécurité :
        // l'histoire reprise doit
        // avoir le même nombre
        // de scènes.
        if (
          partial.generation
            .sceneCount !==
          sceneCount
        ) {
          const error =
            new Error(
              "Le nombre de scènes ne correspond pas à la génération d'origine."
            );

          error.code =
            "VIDEO_SCENE_COUNT_MISMATCH";

          throw error;
        }

        if (
          partial.generation
            .imagesHash &&
          partial.generation
            .imagesHash !==
            imagesHash
        ) {
          const error =
            new Error(
              "Les images ne correspondent pas à la génération vidéo d'origine."
            );

          error.code =
            "VIDEO_IMAGES_MISMATCH";

          throw error;
        }

        console.log(
          `♻️ Reprise génération ${generationId} à partir de la scène ${startSceneIndex + 1}.`
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
    videoModel,
    requestId,
    narration
  );

        console.log(
          "💳 Crédit vidéo réservé :",
          generationRef.id
        );
      }

            console.log(
        `🎬 Génération continue de ${sceneCount} scènes vidéo...`
      );

      const narrationScenes =
        Array.isArray(
          req.body?.scenes
        )
          ? req.body.scenes
          : [];

      if (
        narrationScenes.length !==
        sceneCount
      ) {
        throw new Error(
          "Le nombre de textes ne correspond pas au nombre de scènes vidéo."
        );
      }

      // ========================================
      // 📁 DOSSIER TEMPORAIRE
      // ========================================

      const narrationTempDir =
        await fs.promises.mkdtemp(
          path.join(
            os.tmpdir(),
            "contemagiqueia-continuous-"
          )
        );

      let mergedVideo =
        null;

      try {
        const narratedVideoPaths =
          [];

        const completedVideoUrls =
          [];

        // IMPORTANT :
        // On vérifie toutes les scènes,
        // y compris lors d'une reprise.
        //
        // Une scène continue déjà terminée
        // sera téléchargée depuis Firebase.
        //
        // Une scène partiellement terminée
        // reprendra ses clips enregistrés.
        for (
          let index = 0;
          index < sceneCount;
          index++
        ) {
          const imageUrl =
            images[index];

          if (
            typeof imageUrl !==
              "string" ||
            !imageUrl.trim()
          ) {
            throw new Error(
              `Image invalide pour la scène ${index + 1}.`
            );
          }

          const sceneData =
            narrationScenes[
              index
            ] || {};

          const sceneText =
            typeof sceneData.text ===
            "string"
              ? sceneData.text.trim()
              : "";

          if (!sceneText) {
            throw new Error(
              `Texte manquant pour la scène ${index + 1}.`
            );
          }

          const sceneImagePrompt =
            typeof sceneData
              .imagePrompt ===
            "string"
              ? sceneData
                  .imagePrompt
                  .trim()
              : "";

          const globalPrompt =
            typeof prompt ===
            "string"
              ? prompt.trim()
              : "";

          const motionText =
            [
              sceneImagePrompt,
              sceneText,
              globalPrompt,
            ]
              .filter(Boolean)
              .join(" ");

          console.log(
            `🎬 Scène continue ${index + 1}/${sceneCount}`
          );

          // ========================================
          // 🔄 ÉTAT FIRESTORE DE LA SCÈNE
          // ========================================

          const currentGenerationSnapshot =
            await generationRef.get();

          if (
            !currentGenerationSnapshot.exists
          ) {
            throw new Error(
              "Génération vidéo introuvable."
            );
          }

          const currentGeneration =
            currentGenerationSnapshot.data();

          if (
            currentGeneration.uid !==
            uid
          ) {
            throw new Error(
              "Utilisateur incorrect pour cette génération."
            );
          }

          const continuousState =
            currentGeneration
              ?.continuousScenes?.[
                index
              ] || null;

          const existingNarratedUrl =
            typeof continuousState
              ?.narratedVideoUrl ===
            "string"
              ? continuousState
                  .narratedVideoUrl
              : null;

          // ========================================
          // ♻️ SCÈNE DÉJÀ TERMINÉE
          // ========================================

          if (
            continuousState
              ?.completed ===
              true &&
            existingNarratedUrl
          ) {
            console.log(
              `♻️ Scène ${index + 1} déjà terminée : récupération Firebase.`
            );

            const recoveredPath =
              path.join(
                narrationTempDir,
                `recovered-${index + 1}.mp4`
              );

            await downloadFile(
              existingNarratedUrl,
              recoveredPath
            );

            narratedVideoPaths.push(
              recoveredPath
            );

            completedVideoUrls.push(
              existingNarratedUrl
            );

            continue;
          }

          // ========================================
          // 💾 PASSAGE EN MODE PARTIEL
          // ========================================

          await generationRef.update({
            status:
              "partial",

            nextSceneIndex:
              index,

            lastProgressAt:
              FieldValue
                .serverTimestamp(),
          });

          // ========================================
          // 🔙 COMPATIBILITÉ ANCIEN SYSTÈME
          // ========================================

          // Si cette génération avait déjà
          // produit une ancienne vidéo Runway
          // de 5 secondes, continuousScene()
          // peut la réutiliser comme premier
          // clip au lieu de la repayer.
          const legacyVideoUrl =
            typeof videoUrls[
              index
            ] === "string" &&
            videoUrls[index].trim()
              ? videoUrls[index]
              : null;

          // ========================================
          // 🎬 ANIMATION CONTINUE + NARRATION
          // ========================================

          const narratedPath =
            await createContinuousNarratedScene({
              uid,

              generationRef,

              sceneIndex:
                index,

              imageUrl,

              sceneText,

              motionText,

              emotion:
                sceneData.emotion ||
                sceneData.ambience ||
                "warm",

              narrator,

              mode,

              language,

              videoModel,

              legacyVideoUrl,

              tempDir:
                narrationTempDir,
            });

          if (!narratedPath) {
            throw new Error(
              `Impossible de créer la scène continue ${index + 1}.`
            );
          }

          // ========================================
          // ☁️ SAUVEGARDE SCÈNE TERMINÉE
          // ========================================

          const narratedVideoUrl =
            await saveContinuousNarratedScene({
              uid,

              generationRef,

              sceneIndex:
                index,

              localPath:
                narratedPath,
            });

          narratedVideoPaths.push(
            narratedPath
          );

          completedVideoUrls.push(
            narratedVideoUrl
          );

          // videoUrls contient maintenant
          // les scènes narrées complètes.
          //
          // Cela conserve la compatibilité
          // avec le système de progression
          // déjà utilisé par l'application.
          videoUrls =
            [
              ...completedVideoUrls,
            ];

          await saveVideoSceneProgress(
            uid,
            generationRef,
            videoUrls
          );

          console.log(
            `✅ Scène continue ${index + 1}/${sceneCount} terminée.`
          );
        }

        // ========================================
        // ✅ CONTRÔLE FINAL DES SCÈNES
        // ========================================

        if (
          narratedVideoPaths.length !==
          sceneCount
        ) {
          throw new Error(
            `La génération vidéo est incomplète : ${narratedVideoPaths.length}/${sceneCount} scènes disponibles.`
          );
        }

        if (
          completedVideoUrls.length !==
          sceneCount
        ) {
          throw new Error(
            `Les URL des scènes sont incomplètes : ${completedVideoUrls.length}/${sceneCount}.`
          );
        }

        videoUrls =
          completedVideoUrls;

        // Toutes les scènes continues
        // sont maintenant terminées.
        runwaySucceeded =
          true;

        console.log(
          `✅ ${sceneCount} scènes animées et narrées terminées.`,
          generationRef.id
        );

        // ========================================
        // 🎞️ ASSEMBLAGE FINAL
        // ========================================

        mergedVideo =
          await mergeLocalVideoClips(
            narratedVideoPaths,
            generationRef.id
          );

        console.log(
          "🎬 Vidéo finale continue assemblée."
        );


        // ========================================
        // ☁️ FIREBASE STORAGE
        // ========================================

        const bucket =
          adminStorage.bucket();

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
            resumable:
              false,

            metadata: {
              contentType:
                "video/mp4",

              cacheControl:
                "private,max-age=3600",

              metadata: {
                firebaseStorageDownloadTokens:
                  downloadToken,
              },
            },
          }
        );

        const encodedStoragePath =
          encodeURIComponent(
            finalVideoStoragePath
          );

        const finalVideoUrl =
          `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedStoragePath}?alt=media&token=${downloadToken}`;

        console.log(
          "🎬 URL finale Firebase :",
          finalVideoUrl
        );

        await generationRef.update({
          finalVideoUrl,

          finalVideoStoragePath,

          finalVideoCreatedAt:
            FieldValue
              .serverTimestamp(),
        });

        await completeVideoGeneration(
          uid,
          generationRef,
          videoUrls
        );

        return res.json({
          success:
            true,

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
            recursive:
              true,

            force:
              true,
          }
        );

        if (
          mergedVideo?.tempDir
        ) {
          await fs.promises.rm(
            mergedVideo.tempDir,
            {
              recursive:
                true,

              force:
                true,
            }
          );
        }
      }
    } catch (error) {
      console.error(
        "❌ Erreur génération vidéo Runway :",
        error
      );

      // ========================================
      // 💳 PROTECTION DU CRÉDIT
      // ========================================

      if (
        uid &&
        generationRef &&
        !runwaySucceeded
      ) {
        try {
          const generationSnapshot =
            await generationRef.get();

          const generation =
            generationSnapshot.exists
              ? generationSnapshot.data()
              : null;

                    // ========================================
          // 🛡️ DÉTECTION DES TÂCHES RUNWAY PAYANTES
          // ========================================

          // Ancien système :
          // une seule tâche Runway par scène.
          const runwayTasks =
            generation
              ?.runwayTasks ||
            {};

          const oldTaskStates =
            Object.values(
              runwayTasks
            );

          const hasOldSubmittedRunwayTask =
            oldTaskStates.some(
              (task) =>
                task &&
                (
                  task.taskId ||
                  task.status ===
                    "submitting" ||
                  task.status ===
                    "processing" ||
                  task.status ===
                    "completed"
                )
            );

          // Nouveau système :
          // plusieurs clips Runway peuvent
          // appartenir à une même scène.
          const continuousScenes =
            generation
              ?.continuousScenes ||
            {};

          const continuousSceneStates =
            Object.values(
              continuousScenes
            );

          const hasContinuousSubmittedRunwayTask =
            continuousSceneStates.some(
              (scene) => {
                if (
                  !scene ||
                  typeof scene !==
                    "object"
                ) {
                  return false;
                }

                const clips =
                  Array.isArray(
                    scene.clips
                  )
                    ? scene.clips
                    : [];

                return clips.some(
                  (clip) =>
                    clip &&
                    (
                      clip.taskId ||
                      clip.submitting ===
                        true
                    )
                );
              }
            );

          // Compatible avec les générations
          // créées avant ET après le passage
          // à continuousScene().
          const hasSubmittedRunwayTask =
            hasOldSubmittedRunwayTask ||
            hasContinuousSubmittedRunwayTask;

          // Une tâche Runway a déjà été
          // soumise ou peut encore être
          // en cours.
          //
          // Dans ce cas, NE PAS rendre
          // automatiquement le crédit.
          if (
            hasSubmittedRunwayTask
          ) {
            const completedUrls =
              videoUrls.filter(
                (url) =>
                  typeof url ===
                    "string" &&
                  url.trim()
              );

            await generationRef.update({
              status:
                "partial",

              videoUrls:
                completedUrls,

              completedScenes:
                completedUrls.length,

              nextSceneIndex:
                completedUrls.length,

              lastErrorAt:
                FieldValue
                  .serverTimestamp(),

              lastError:
                String(
                  error?.message ||
                    "Erreur vidéo"
                ).slice(
                  0,
                  1000
                ),
            });

            console.log(
              "⚠️ Génération conservée pour reprise afin d'éviter une double consommation Runway."
            );
          }

          // Aucun appel Runway n'a encore
          // été soumis : le crédit peut
          // être rendu sans risque.
          else if (
            videoUrls.length ===
            0
          ) {
            await refundVideoCredit(
              uid,
              generationRef
            );

            console.log(
              "💰 Crédit vidéo remboursé :",
              generationRef.id
            );
          }

          // Des vidéos existent déjà :
          // conservation pour reprise.
          else {
            await savePartialVideoGeneration(
              uid,
              generationRef,
              videoUrls,
              videoUrls.length
            );

            console.log(
              `⚠️ Génération partielle sauvegardée : ${videoUrls.length} scène(s) terminée(s).`
            );
          }
        } catch (
          creditError
        ) {
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
        return res
          .status(402)
          .json({
            error:
              "Aucun crédit vidéo disponible.",

            code:
              "NO_VIDEO_CREDIT",
          });
      }

      if (
        error?.code ===
        "RUNWAY_SUBMISSION_UNCERTAIN"
      ) {
        return res
          .status(409)
          .json({
            error:
              "Une demande Runway a peut-être déjà été envoyée pour cette scène. Elle n'est pas relancée automatiquement afin d'éviter une double facturation.",

            code:
              "RUNWAY_SUBMISSION_UNCERTAIN",

            generationId:
              generationRef?.id ||
              null,
          });
      }

      if (
        error?.code ===
        "RUNWAY_TASK_TIMEOUT"
      ) {
        return res
          .status(202)
          .json({
            success:
              false,

            pending:
              true,

            error:
              "La génération Runway est toujours en cours. Elle pourra être reprise avec le même generationId.",

            code:
              "RUNWAY_TASK_TIMEOUT",

            generationId:
              generationRef?.id ||
              null,

            completedScenes:
              videoUrls.length,
          });
      }

      if (
        error instanceof
        TaskFailedError
      ) {
        console.error(
          "Détails Runway :",
          error.taskDetails
        );
      }

      return res
        .status(500)
        .json({
          error:
            "Erreur génération vidéo",

          details:
            error?.message,

          code:
            error?.code ||
            null,

          generationId:
            generationRef?.id ||
            null,
        });
    }
  }
);

// =========================
// 🎞️ ASSEMBLAGE LOCAL
// =========================

async function mergeLocalVideoClips(
  localFiles,
  generationId
) {
  if (!ffmpegPath) {
    throw new Error(
      "FFmpeg introuvable."
    );
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

  try {
    const normalizedFiles = [];

    // ==========================================
    // 📱 NORMALISATION DE CHAQUE SCÈNE EN 9:16
    // ==========================================
    //
    // Objectif :
    // - vidéo finale 720 x 1280
    // - aucune bande noire
    // - conserver toute l'image principale
    // - arrière-plan rempli avec la même vidéo
    //   agrandie et floutée
    //
    // Cela évite de couper brutalement les
    // personnages situés sur les côtés.

    for (
      let index = 0;
      index < localFiles.length;
      index++
    ) {
      const inputPath =
        localFiles[index];

      const normalizedPath =
        path.join(
          tempDir,
          `scene-${index + 1}-vertical.mp4`
        );

      await new Promise(
        (resolve, reject) => {
          const filterComplex = [
            // Arrière-plan :
            // remplit entièrement le 9:16,
            // puis applique un flou.
            "[0:v]split=2[bg][fg]",

            "[bg]" +
              "scale=720:1280:" +
              "force_original_aspect_ratio=increase," +
              "crop=720:1280," +
              "boxblur=20:10" +
              "[background]",

            // Premier plan :
            // conserve l'intégralité de la scène
            // sans couper les personnages.
            "[fg]" +
              "scale=720:1280:" +
              "force_original_aspect_ratio=decrease" +
              "[foreground]",

            // Superposition centrée.
            "[background][foreground]" +
              "overlay=" +
              "(W-w)/2:" +
              "(H-h)/2" +
              "[video]",
          ].join(";");

          const ffmpeg =
            spawn(
              ffmpegPath,
              [
                "-y",

                "-i",
                inputPath,

                "-filter_complex",
                filterComplex,

                "-map",
                "[video]",

                "-map",
                "0:a?",

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

                "-r",
                "24",

                "-pix_fmt",
                "yuv420p",

                "-movflags",
                "+faststart",

                normalizedPath,
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
                    `FFmpeg recadrage scène ${
                      index + 1
                    } échoué avec le code ${code}.\n${stderr}`
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

      normalizedFiles.push(
        normalizedPath
      );

      console.log(
        `📱 Scène ${
          index + 1
        }/${localFiles.length} normalisée en 720x1280.`
      );
    }

    // ==========================================
    // 📋 FICHIER DE CONCATÉNATION
    // ==========================================

    const concatFilePath =
      path.join(
        tempDir,
        "concat.txt"
      );

    const concatContent =
      normalizedFiles
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

    // ==========================================
    // 🎬 VIDÉO FINALE
    // ==========================================

    const outputPath =
      path.join(
        tempDir,
        `${generationId}-final.mp4`
      );

    await new Promise(
      (resolve, reject) => {
        const ffmpeg =
          spawn(
            ffmpegPath,
            [
              "-y",

              "-f",
              "concat",

              "-safe",
              "0",

              "-i",
              concatFilePath,

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

              "-r",
              "24",

              "-pix_fmt",
              "yuv420p",

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

    console.log(
      "✅ Vidéo finale créée en format vertical 720x1280."
    );

    return {
      buffer: finalBuffer,
      tempDir,
    };
  } catch (error) {
    // En cas d'erreur, on laisse remonter
    // l'erreur pour conserver le comportement
    // actuel de remboursement/reprise.
    throw error;
  }
}

// =========================
// 🔔 ADMIN - NOTIFICATIONS
// =========================

app.post(
  "/admin/send-notification",

  async (req, res) => {
    try {
      const adminUser =
        await requireAdminUser(
          req,
          res
        );

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
        return res
          .status(400)
          .json({
            error:
              "Le titre et le message sont obligatoires.",
          });
      }

      const usersSnapshot =
        await adminDb
          .collection(
            "users"
          )
          .where(
            "pushNotificationsEnabled",
            "==",
            true
          )
          .get();

      const tokens =
        [];

      usersSnapshot.forEach(
        (
          docSnapshot
        ) => {
          const userData =
            docSnapshot.data() ||
            {};

          const token =
            userData
              .expoPushToken;

          if (
            typeof token ===
              "string" &&
            token.startsWith(
              "ExponentPushToken["
            )
          ) {
            tokens.push(
              token
            );
          }
        }
      );

      if (
        tokens.length ===
        0
      ) {
        return res.json({
          success:
            true,

          sent:
            0,

          message:
            "Aucun appareil inscrit aux notifications.",
        });
      }

      const results =
        [];

      for (
        const token of
        tokens
      ) {
        try {
          const result =
            await sendExpoPushNotification({
              to:
                token,

              title,

              body,

              data,
            });

          results.push({
            token,

            success:
              true,

            result,
          });
        } catch (error) {
          console.error(
            "Erreur envoi notification :",
            error
          );

          results.push({
            token,

            success:
              false,

            error:
              error instanceof
              Error
                ? error.message
                : String(
                    error
                  ),
          });
        }
      }

      const sent =
        results.filter(
          (item) =>
            item.success
        ).length;

      const failed =
        results.length -
        sent;

      return res.json({
        success:
          true,

        total:
          results.length,

        sent,

        failed,
      });
    } catch (error) {
      console.error(
        "Erreur route admin notification :",
        error
      );

      return res
        .status(500)
        .json({
          error:
            "Erreur pendant l'envoi des notifications.",

          details:
            error instanceof
            Error
              ? error.message
              : String(
                  error
                ),
        });
    }
  }
);

// =========================
// 🚀 LANCEMENT DU SERVEUR
// =========================

const PORT =
  process.env.PORT ||
  3000;

app.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      `Backend lancé sur ${PORT}`
    );
  }
);