import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: "cle api",
  dangerouslyAllowBrowser: true,
});

export async function generateStory(
  prompt: string,
  type: string,
  sceneCount: number
) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5.4-mini",
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
- Pas de personnage connu, marque connue, univers Marvel, DC, Disney, etc.
- Si l’utilisateur demande un personnage connu, transforme-le en personnage original inspiré du rôle général.
- Retourne toujours une clé "characters".
- "characters" décrit uniquement les personnages principaux de CETTE histoire.
- Ne jamais réutiliser des personnages d’une autre histoire.
- Les personnages doivent rester cohérents dans toutes les scènes : mêmes couleurs, même apparence, mêmes accessoires.
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

Aucun texte avant ou après le JSON.
          `,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    let content = response.choices[0].message.content || "";

    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");

    if (start !== -1 && end !== -1) {
      content = content.slice(start, end + 1);
    }

    return JSON.parse(content);
  } catch (e) {
    console.log("Erreur génération histoire :", e);

    return {
      characters:
        "Un petit poisson orange lumineux avec des nageoires dorées et un regard curieux.",
      scenes: [
        {
          text: "Un petit poisson orange découvre une lumière étrange au fond de l’océan...",
          imagePrompt:
            "un petit poisson orange lumineux avec des nageoires dorées nage dans un océan magique",
          ambience: "ocean",
        },
        {
          text: "La lumière devient une porte vers une aventure pleine de surprises.",
          imagePrompt:
            "un portail lumineux sous l’eau devant un petit poisson orange curieux",
          ambience: "magic",
        },
      ],
    };
  }
}

function sanitizePrompt(prompt: string) {
  return prompt
    .replace(/batman/gi, "super-héros original sombre avec cape noire")
    .replace(/superman/gi, "super-héros original lumineux avec cape rouge")
    .replace(/spider[- ]?man/gi, "héros agile en tenue rouge et bleue")
    .replace(/iron man/gi, "héros en armure futuriste")
    .replace(/hulk/gi, "géant vert puissant")
    .replace(/disney|marvel|dc/gi, "univers imaginaire");
}

function getImageStylePrompt(prompt: string) {
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

export async function generateImage(prompt: string) {
  try {
    const safePrompt = sanitizePrompt(prompt);
    const stylePrompt = getImageStylePrompt(safePrompt);

    const finalPrompt = `
${stylePrompt}

Consignes de sécurité :
- personnages originaux uniquement
- aucun logo, aucune marque, aucun personnage connu
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

    return `data:image/png;base64,${base64}`;
  } catch (e) {
    console.log("Erreur génération image :", e);
    return "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee";
  }
}