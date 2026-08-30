import {
    collection,
    deleteDoc,
    doc,
    getDocs,
    orderBy,
    query,
    setDoc,
    updateDoc,
} from "firebase/firestore";

import { auth, db } from "./firebase";

/**
 * Retourne la collection des histoires
 * de l'utilisateur actuellement connecté.
 *
 * Structure Firestore :
 *
 * users
 *   └── UID
 *       └── stories
 *           └── STORY_ID
 */
function getStoriesCollection(uid: string) {
  return collection(db, "users", uid, "stories");
}

/**
 * Sauvegarde une histoire dans Firestore.
 */
export async function saveStoryToCloud(story: any): Promise<boolean> {
  try {
    const user = auth.currentUser;

    if (!user) {
      console.log("☁️ Sauvegarde cloud ignorée : utilisateur non connecté.");
      return false;
    }

    if (!story?.id) {
      console.log("☁️ Sauvegarde cloud impossible : ID histoire absent.");
      return false;
    }

    const storyId = String(story.id);

    const storyRef = doc(
      db,
      "users",
      user.uid,
      "stories",
      storyId
    );

    /*
     * Les URI locales file:// ne sont valables que
     * sur le téléphone qui a créé l'histoire.
     *
     * On conserve les autres informations de la scène,
     * mais on évite d'envoyer une URI locale inutilisable
     * sur un autre appareil.
     */
    const cloudScenes = Array.isArray(story.scenes)
      ? story.scenes.map((scene: any) => ({
          text: scene?.text ?? "",
          imagePrompt: scene?.imagePrompt ?? "",
          imageStyle: scene?.imageStyle ?? null,
          ambience: scene?.ambience ?? null,

          imageUrl:
            typeof scene?.imageUrl === "string" &&
            !scene.imageUrl.startsWith("file://")
              ? scene.imageUrl
              : null,
        }))
      : [];

    const cloudStory = {
      id: story.id,
      createdAt: story.createdAt ?? new Date().toISOString(),
      favorite: story.favorite ?? false,

      prompt: story.prompt ?? "",
      imageStyle: story.imageStyle ?? null,
      storyType: story.storyType ?? null,
      storyLength: story.storyLength ?? null,
      narrator: story.narrator ?? "narratrice",

      scenes: cloudScenes,

      ownerUid: user.uid,
      updatedAt: new Date().toISOString(),
    };

    await setDoc(storyRef, cloudStory, {
      merge: true,
    });

    console.log("☁️ Histoire sauvegardée dans Firestore :", storyId);

    return true;
  } catch (error) {
    console.error("❌ Erreur saveStoryToCloud :", error);
    return false;
  }
}

/**
 * Récupère toutes les histoires de l'utilisateur connecté.
 */
export async function getCloudStories(): Promise<any[]> {
  try {
    const user = auth.currentUser;

    if (!user) {
      console.log("☁️ Lecture cloud ignorée : utilisateur non connecté.");
      return [];
    }

    const storiesRef = getStoriesCollection(user.uid);

    const storiesQuery = query(
      storiesRef,
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(storiesQuery);

    const stories = snapshot.docs.map((storyDoc) => ({
      ...storyDoc.data(),

      /*
       * Sécurité :
       * si jamais le champ id n'existe pas dans Firestore,
       * on utilise l'ID du document.
       */
      id:
        storyDoc.data()?.id !== undefined
          ? storyDoc.data().id
          : Number(storyDoc.id),
    }));

    console.log(
      `☁️ ${stories.length} histoire(s) récupérée(s) depuis Firestore.`
    );

    return stories;
  } catch (error) {
    console.error("❌ Erreur getCloudStories :", error);
    return [];
  }
}

/**
 * Active ou désactive le favori d'une histoire.
 */
export async function toggleCloudFavorite(
  id: number,
  favorite: boolean
): Promise<boolean> {
  try {
    const user = auth.currentUser;

    if (!user) {
      console.log("☁️ Favori cloud ignoré : utilisateur non connecté.");
      return false;
    }

    const storyId = String(id);

    const storyRef = doc(
      db,
      "users",
      user.uid,
      "stories",
      storyId
    );

    await updateDoc(storyRef, {
      favorite,
      updatedAt: new Date().toISOString(),
    });

    console.log(
      "❤️ Favori Firestore mis à jour :",
      storyId,
      favorite
    );

    return true;
  } catch (error) {
    console.error("❌ Erreur toggleCloudFavorite :", error);
    return false;
  }
}

/**
 * Supprime une histoire appartenant à
 * l'utilisateur actuellement connecté.
 */
export async function deleteCloudStory(
  id: number
): Promise<boolean> {
  try {
    const user = auth.currentUser;

    if (!user) {
      console.log(
        "☁️ Suppression cloud impossible : utilisateur non connecté."
      );
      return false;
    }

    const storyId = String(id);

    const storyRef = doc(
      db,
      "users",
      user.uid,
      "stories",
      storyId
    );

    await deleteDoc(storyRef);

    console.log(
      "🗑️ Histoire supprimée de Firestore :",
      storyId
    );

    return true;
  } catch (error) {
    console.error("❌ Erreur deleteCloudStory :", error);
    return false;
  }
}