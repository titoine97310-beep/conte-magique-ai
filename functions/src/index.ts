
import { initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { setGlobalOptions } from "firebase-functions/v2";
import { onDocumentCreated } from "firebase-functions/v2/firestore";

initializeApp();

setGlobalOptions({
  maxInstances: 10,
  region: "europe-west1",
});

// =====================================================
// 1. CADEAU DE BIENVENUE
// 2 histoires texte + 1 histoire illustrée
// =====================================================


export const cadeauBienvenue = onDocumentCreated(
  "users/{userId}",
  async (event) => {
    const userId = event.params.userId;
    const db = getFirestore();
    const userRef = db.collection("users").doc(userId);

    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(userRef);

      if (!snapshot.exists) {
        return;
      }

      const profile = snapshot.data();

      // Un cadeau déjà attribué ne peut pas être réattribué.
      if (profile?.welcomeGiftGranted === true) {
        return;
      }

      transaction.update(userRef, {
        "packs.text.storiesRemaining":
          FieldValue.increment(2),

        "packs.illustrated.storiesRemaining":
          FieldValue.increment(1),

        welcomeGiftGranted: true,
        welcomeGiftGrantedAt:
          FieldValue.serverTimestamp(),
      });
    });

    console.log(
      `Cadeau de bienvenue traité pour ${userId}`
    );
  }
);

// =====================================================
// 2. NOTIFICATIONS DES ACTUALITÉS
// =====================================================

export const envoyerActualite = onDocumentCreated(
  "notifications_actualites/{notificationId}",
  async (event) => {
    const annonce = event.data?.data();

    if (!annonce) {
      return;
    }

    const titre = annonce.title;
    const message = annonce.body;

    if (
      typeof titre !== "string" ||
      typeof message !== "string" ||
      !titre.trim() ||
      !message.trim()
    ) {
      console.error("Annonce invalide.");
      return;
    }

    const db = getFirestore();

    const utilisateurs = await db
      .collection("users")
      .where("pushNotificationsEnabled", "==", true)
      .get();

    const tokens = new Set<string>();

    utilisateurs.forEach((document) => {
      const utilisateur = document.data();

      if (
        typeof utilisateur.fcmToken === "string" &&
        utilisateur.fcmToken.trim()
      ) {
        tokens.add(utilisateur.fcmToken);
      }
    });

    const listeTokens = Array.from(tokens);

    if (listeTokens.length === 0) {
      console.log(
        "Aucun utilisateur abonné avec token FCM."
      );
      return;
    }

    let succes = 0;
    let echecs = 0;

    for (
      let i = 0;
      i < listeTokens.length;
      i += 500
    ) {
      const lot = listeTokens.slice(i, i + 500);

      const resultat =
        await getMessaging().sendEachForMulticast({
          tokens: lot,
          notification: {
            title: titre,
            body: message,
          },
          android: {
            priority: "high",
            notification: {
              channelId: "default",
            },
          },
        });

      succes += resultat.successCount;
      echecs += resultat.failureCount;
    }

    console.log(
      `Actualité envoyée : ${succes} succès, ${echecs} échecs.`
    );
  }
);
