import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import OpenAI from "openai";

dotenv.config();

console.log("Clé OpenAI présente :", !!process.env.OPENAI_API_KEY);

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

    if (!prompt) {
      return res.status(400).json({ error: "Prompt image manquant" });
    }

    const safePrompt = sanitizePrompt(prompt);
    const stylePrompt = getImageStylePrompt(safePrompt);

    const finalPrompt = `
${stylePrompt}

Consignes de sécurité :
- personnages originaux uniquement
- aucun logo, aucune marque
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
      throw new Error("Image non générée");
    }

    return res.json({
      imageUrl: `data:image/png;base64,${base64}`,
    });
  } catch (e) {
    console.error("Erreur /image :", e);

    return res.status(500).json({
      error: "Erreur génération image",
      message: e?.message,
    });
  }
});

app.post("/tts", async (req, res) => {
  console.log("Requête TTS reçue :", req.body?.text?.slice(0, 80));

  try {
    const { text, mode = "story", emotion = "warm" } = req.body;

    if (!text?.trim()) {
      return res.status(400).json({
        error: "Texte manquant",
      });
    }

    const instructions =
      mode === "bedtime"
        ? `
Lis comme un conteur très doux pour endormir un enfant.
Utilise une voix chaleureuse, calme et naturelle.
Parle lentement avec des pauses naturelles.
Respecte exactement la langue du texte.
`
        : emotion === "danger"
        ? `
Lis comme un conteur pour enfants avec une légère tension.
Garde une voix rassurante, naturelle et fluide.
Respecte exactement la langue du texte.
`
        : emotion === "victory"
        ? `
Lis comme un conteur joyeux et chaleureux.
Garde une narration naturelle et fluide.
Respecte exactement la langue du texte.
`
        : `
Lis comme un conteur chaleureux pour enfants.
Utilise une voix naturelle, fluide et expressive.
Fais des pauses naturelles sans exagérer les émotions.
Respecte exactement la langue du texte.
`;

    const response = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
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

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend lancé sur ${PORT}`);
});