import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";

import { auth } from "./firebase";

import { saveStoryToCloud } from "./storyCloudService";

const KEY = "STORIES";
const STORIES_DIR = `${FileSystem.documentDirectory}stories/`;

/**
 * Vérifie que le dossier local des histoires existe.
 */
async function ensureStoriesDir() {
  const dirInfo = await FileSystem.getInfoAsync(STORIES_DIR);

  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(STORIES_DIR, {
      intermediates: true,
    });
  }
}

/**
 * Sauvegarde localement une image Base64.
 *
 * Si l'image n'est pas une data:image,
 * on conserve simplement son URI actuelle.
 */
async function saveBase64Image(
  imageUrl: string,
  storyId: number,
  index: number
) {
  if (!imageUrl || !imageUrl.startsWith("data:image")) {
    return imageUrl;
  }

  await ensureStoriesDir();

  const base64 = imageUrl.split(",")[1];

  const fileUri =
    `${STORIES_DIR}story-${storyId}-scene-${index}.png`;

  await FileSystem.writeAsStringAsync(
    fileUri,
    base64,
    {
      encoding: FileSystem.EncodingType.Base64,
    }
  );

  return fileUri;
}

/**
 * Extrait le type MIME d'une data URI.
 */
function getMimeTypeFromDataUri(dataUri: string) {
  const match = dataUri.match(
    /^data:(image\/[a-zA-Z0-9.+-]+);base64,/
  );

  return match?.[1] || "image/png";
}

/**
 * Envoie une illustration dans Firebase Storage.
 *
 * Structure :
 *
 * users/
 *   UID/
 *     stories/
 *       STORY_ID/
 *         scene-0.png
 *         scene-1.png
 */
async function uploadStoryImageToCloud(
  imageUrl: string,
  storyId: number,
  index: number
): Promise<string | null> {
  try {
    const user = auth.currentUser;

    if (!user) {
      console.log(
        "☁️ Upload image ignoré : utilisateur non connecté."
      );
      return null;
    }

    if (!imageUrl) {
      return null;
    }

    /*
     * Une image déjà hébergée n'a pas besoin
     * d'être envoyée une nouvelle fois.
     */
    if (
      imageUrl.startsWith("https://") ||
      imageUrl.startsWith("http://")
    ) {
      return imageUrl;
    }

    let base64: string;
    let contentType = "image/png";

    /*
     * Image générée par OpenAI.
     */
    if (imageUrl.startsWith("data:image")) {
      const parts = imageUrl.split(",");

      if (parts.length < 2) {
        throw new Error("Image Base64 invalide.");
      }

      base64 = parts[1];
      contentType =
        getMimeTypeFromDataUri(imageUrl);
    }

    /*
     * Image déjà enregistrée localement.
     */
    else if (imageUrl.startsWith("file://")) {
      base64 =
        await FileSystem.readAsStringAsync(
          imageUrl,
          {
            encoding:
              FileSystem.EncodingType.Base64,
          }
        );
    }

    else {
      console.log(
        "☁️ Format image non reconnu :",
        imageUrl.substring(0, 30)
      );
      return null;
    }

    const token = await user.getIdToken();

    const response = await fetch(
      "https://conte-magique-ai.onrender.com/story-image/upload",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },

        body: JSON.stringify({
          storyId,
          sceneIndex: index,
          imageBase64: base64,
          contentType,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.message ||
          data?.error ||
          "Erreur upload Firebase Storage."
      );
    }

    if (!data?.imageUrl) {
      throw new Error(
        "Le backend n'a retourné aucune URL d'image."
      );
    }

    console.log(
      `☁️ Illustration ${index + 1} sauvegardée dans Storage.`
    );

    return data.imageUrl;
  } catch (error) {
    console.error(
      `❌ Erreur upload illustration ${index + 1} :`,
      error
    );

    return null;
  }
}

/**
 * Sauvegarde une histoire :
 *
 * 1. images sur le téléphone
 * 2. images dans Firebase Storage
 * 3. histoire locale dans AsyncStorage
 * 4. histoire cloud dans Firestore
 */
export async function saveStory(story: any) {
  try {
    const existing =
      await AsyncStorage.getItem(KEY);

    const stories =
      existing ? JSON.parse(existing) : [];

    const storyId = Date.now();

    const savedScenes = [];
    const cloudScenes = [];

    for (
      let i = 0;
      i < story.scenes.length;
      i++
    ) {
      const scene = story.scenes[i];

      /*
       * Sauvegarde locale.
       */
      const localImageUri =
        await saveBase64Image(
          scene.imageUrl,
          storyId,
          i
        );

      /*
       * Sauvegarde Firebase Storage.
       *
       * Si l'utilisateur n'est pas connecté
       * ou si l'upload échoue,
       * cela n'empêche pas la sauvegarde locale.
       */
      const cloudImageUrl =
        await uploadStoryImageToCloud(
          scene.imageUrl,
          storyId,
          i
        );

      /*
       * Version locale de la scène.
       */
      savedScenes.push({
        text: scene.text,
        imagePrompt: scene.imagePrompt,
        imageStyle: scene.imageStyle,
        ambience: scene.ambience,
        imageUrl: localImageUri,
      });

      /*
       * Version destinée à Firestore.
       */
      cloudScenes.push({
        text: scene.text,
        imagePrompt: scene.imagePrompt,
        imageStyle: scene.imageStyle,
        ambience: scene.ambience,
        imageUrl: cloudImageUrl,
      });
    }

    /*
     * Histoire sauvegardée sur le téléphone.
     */
    const newStory = {
      id: storyId,
      createdAt:
        new Date().toISOString(),
      favorite: false,

      prompt: story.prompt,
      imageStyle: story.imageStyle,
      storyType: story.storyType,
      storyLength: story.storyLength,
      narrator:
        story.narrator || "narratrice",

      scenes: savedScenes,
    };

    stories.unshift(newStory);

    await AsyncStorage.setItem(
      KEY,
      JSON.stringify(stories)
    );

    /*
     * Version cloud :
     * elle possède les URL Firebase permanentes.
     */
    if (auth.currentUser) {
      const cloudStory = {
        ...newStory,
        scenes: cloudScenes,
      };

      try {
        await saveStoryToCloud(
          cloudStory
        );
      } catch (e) {
        console.log(
          "Sauvegarde cloud ignorée :",
          e
        );
      }
    }

    console.log(
      "Histoire sauvegardée avec narrateur :",
      newStory.narrator
    );

    return newStory;
  } catch (e) {
    console.log(
      "Erreur sauvegarde :",
      e
    );

    return null;
  }
}

/**
 * Récupère les histoires locales.
 */
export async function getStories() {
  try {
    const data =
      await AsyncStorage.getItem(KEY);

    return data
      ? JSON.parse(data)
      : [];
  } catch (e) {
    console.log(
      "Erreur lecture :",
      e
    );

    return [];
  }
}

/**
 * Supprime la copie locale d'une histoire.
 *
 * La suppression Firebase Storage sera
 * gérée séparément avec la suppression cloud.
 */
export async function deleteStory(id: number) {
  try {
    const data =
      await AsyncStorage.getItem(KEY);

    const stories =
      data ? JSON.parse(data) : [];

    const storyToDelete =
      stories.find(
        (s: any) => s.id === id
      );

    if (storyToDelete?.scenes) {
      for (
        const scene of storyToDelete.scenes
      ) {
        if (
          scene.imageUrl?.startsWith(
            FileSystem.documentDirectory || ""
          )
        ) {
          const fileInfo =
            await FileSystem.getInfoAsync(
              scene.imageUrl
            );

          if (fileInfo.exists) {
            await FileSystem.deleteAsync(
              scene.imageUrl
            );
          }
        }
      }
    }

    const updated =
      stories.filter(
        (s: any) => s.id !== id
      );

    await AsyncStorage.setItem(
      KEY,
      JSON.stringify(updated)
    );
  } catch (e) {
    console.log(
      "Erreur suppression :",
      e
    );
  }
}

/**
 * Active ou désactive un favori local.
 */
export async function toggleFavoriteStory(
  id: number
) {
  try {
    const data =
      await AsyncStorage.getItem(KEY);

    const stories =
      data ? JSON.parse(data) : [];

    const updated =
      stories.map((story: any) =>
        story.id === id
          ? {
              ...story,
              favorite:
                !story.favorite,
            }
          : story
      );

    await AsyncStorage.setItem(
      KEY,
      JSON.stringify(updated)
    );
  } catch (e) {
    console.log(
      "Erreur favori :",
      e
    );
  }
}

/**
 * Efface la liste locale des histoires.
 */
export async function clearStories() {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch (e) {
    console.log(
      "Erreur reset histoires :",
      e
    );
  }
}