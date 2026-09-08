import {
    collection,
    deleteDoc,
    doc,
    getDocs,
    orderBy,
    query,
    setDoc,
} from "firebase/firestore";

import { auth, db } from "./firebase";

export type SavedSharedVideo = {
  id: string;
  shareToken: string;
  finalVideoUrl: string;
  sceneCount?: number;
  videoType?: string | null;
  createdAt?: string;
  shared: true;
};

/**
 * Enregistre une vidéo reçue dans la bibliothèque
 * de l'utilisateur connecté.
 *
 * IMPORTANT :
 * on ne copie pas le document videoGenerations original.
 * Le destinataire conserve seulement une référence personnelle.
 */
export async function saveSharedVideo(
  shareToken: string,
  video: {
    finalVideoUrl: string;
    sceneCount?: number;
    videoType?: string | null;
  }
): Promise<boolean> {
  try {
    const user = auth.currentUser;

    if (!user) {
      return false;
    }

    if (!shareToken || !video?.finalVideoUrl) {
      return false;
    }

    const videoRef = doc(
      db,
      "users",
      user.uid,
      "sharedVideos",
      shareToken
    );

    await setDoc(
      videoRef,
      {
        id: shareToken,
        shareToken,
        finalVideoUrl: video.finalVideoUrl,
        sceneCount: video.sceneCount || 0,
        videoType: video.videoType || null,
        createdAt: new Date().toISOString(),
        shared: true,
      },
      {
        merge: true,
      }
    );

    console.log(
      "🎬 Vidéo partagée enregistrée :",
      shareToken
    );

    return true;
  } catch (error) {
    console.error(
      "❌ Erreur saveSharedVideo :",
      error
    );

    return false;
  }
}

/**
 * Charge toutes les vidéos partagées
 * enregistrées par l'utilisateur.
 */
export async function getSharedVideos(): Promise<
  SavedSharedVideo[]
> {
  try {
    const user = auth.currentUser;

    if (!user) {
      return [];
    }

    const videosRef = collection(
      db,
      "users",
      user.uid,
      "sharedVideos"
    );

    const videosQuery = query(
      videosRef,
      orderBy("createdAt", "desc")
    );

    const snapshot =
      await getDocs(videosQuery);

    return snapshot.docs.map(
      (videoDoc) =>
        ({
          ...videoDoc.data(),
          id: videoDoc.id,
          shared: true,
        }) as SavedSharedVideo
    );
  } catch (error) {
    console.error(
      "❌ Erreur getSharedVideos :",
      error
    );

    return [];
  }
}

/**
 * Supprime uniquement la référence personnelle
 * du destinataire.
 *
 * La vidéo originale et son fichier Storage
 * ne sont jamais supprimés.
 */
export async function deleteSharedVideo(
  id: string
): Promise<boolean> {
  try {
    const user = auth.currentUser;

    if (!user) {
      return false;
    }

    await deleteDoc(
      doc(
        db,
        "users",
        user.uid,
        "sharedVideos",
        id
      )
    );

    return true;
  } catch (error) {
    console.error(
      "❌ Erreur deleteSharedVideo :",
      error
    );

    return false;
  }
}