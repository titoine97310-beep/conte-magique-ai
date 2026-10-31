
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import {
  doc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { Platform } from "react-native";

import { auth, db } from "./firebase";

// Gestion de l'affichage des notifications
// lorsque l'application est ouverte.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Configuration du canal Android.
async function configureNotificationChannel() {
  if (Platform.OS !== "android") {
    return;
  }

  await Notifications.setNotificationChannelAsync(
    "default",
    {
      name: "Notifications ConteMagiqueIA",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: "default",
    }
  );
}

// Vérifie ou demande l'autorisation
// d'envoyer des notifications.
async function verifierPermissionNotifications() {
  const permissions =
    await Notifications.getPermissionsAsync();

  if (permissions.granted) {
    return true;
  }

  const requested =
    await Notifications.requestPermissionsAsync();

  return requested.granted;
}

// =====================================================
// ENREGISTREMENT DES NOTIFICATIONS PUSH
// FIREBASE FCM + EXPO
// =====================================================

export async function registerForPushNotificationsAsync() {
  try {
    if (!Device.isDevice) {
      console.log(
        "Notifications push : appareil physique requis."
      );
      return null;
    }

    await configureNotificationChannel();

    const permission =
      await verifierPermissionNotifications();

    if (!permission) {
      console.log(
        "Permission notifications refusée."
      );
      return null;
    }

    // Identifiant du projet Expo / EAS.
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    console.log("EXPO_PROJECT_ID_TEST :", projectId);

    // =================================================
    // 1. RÉCUPÉRATION DU JETON FIREBASE FCM NATIF
    // =================================================

    let fcmToken: string | null = null;

    if (Platform.OS === "android") {
      try {
        const nativeToken =
          await Notifications.getDevicePushTokenAsync();

        if (
          typeof nativeToken.data === "string" &&
          nativeToken.data.length > 0
        ) {
          fcmToken = nativeToken.data;

          console.log(
            "FCM - Type :",
            nativeToken.type
          );

          console.log(
            "FCM - Jeton présent :",
            true
          );

          console.log(
            "FCM - Longueur :",
            fcmToken.length
          );
        }
      } catch (error) {
        console.error(
          "Erreur récupération jeton FCM :",
          error
        );
      }
    }

    // =================================================
    // 2. RÉCUPÉRATION DU JETON EXPO
    // =================================================

    let expoPushToken: string | null = null;

    if (projectId) {
      try {
        const tokenData =
          await Notifications.getExpoPushTokenAsync({
            projectId,
          });

        expoPushToken = tokenData.data;

        console.log(
          "Jeton Expo récupéré :",
          Boolean(expoPushToken)
        );
      } catch (error) {
        console.warn(
          "Jeton Expo indisponible :",
          error
        );
      }
    } else {
      console.warn(
        "Project ID Expo/EAS introuvable."
      );
    }

    // =================================================
    // 3. ENREGISTREMENT DANS FIRESTORE
    // =================================================

    const user = auth.currentUser;

    if (user) {
      const notificationData: Record<string, any> = {
        pushPlatform: Platform.OS,
        pushNotificationsEnabled: true,
        pushTokenUpdatedAt: serverTimestamp(),
      };

      if (fcmToken) {
        notificationData.fcmToken = fcmToken;
        notificationData.fcmTokenUpdatedAt =
          serverTimestamp();
      }

      if (expoPushToken) {
        notificationData.expoPushToken =
          expoPushToken;
      }

      if (fcmToken || expoPushToken) {
        await setDoc(
          doc(db, "users", user.uid),
          notificationData,
          { merge: true }
        );

        console.log(
          "Jetons de notification enregistrés dans Firestore."
        );
      }
    } else {
      console.log(
        "Utilisateur non connecté : jetons non enregistrés."
      );
    }

    // On conserve le retour du jeton Expo
    // pour rester compatible avec le code existant.
    return expoPushToken;
  } catch (error) {
    console.error(
      "Erreur inscription notifications :",
      error
    );

    return null;
  }
}

// =====================================================
// RAPPEL QUOTIDIEN DE L'HISTOIRE DU SOIR
// =====================================================

export async function programmerRappelHistoire(
  heure: number = 19,
  minute: number = 30
) {
  await configureNotificationChannel();

  const permission =
    await verifierPermissionNotifications();

  if (!permission) {
    return false;
  }

  if (
    !Number.isInteger(heure) ||
    heure < 0 ||
    heure > 23 ||
    !Number.isInteger(minute) ||
    minute < 0 ||
    minute > 59
  ) {
    throw new Error(
      "Horaire de rappel invalide."
    );
  }

  // Supprime uniquement les anciens rappels
  // d'histoire du soir.
  const rappels =
    await Notifications.getAllScheduledNotificationsAsync();

  for (const rappel of rappels) {
    if (
      rappel.content.data?.type ===
      "histoire_du_soir"
    ) {
      await Notifications.cancelScheduledNotificationAsync(
        rappel.identifier
      );
    }
  }

  // Programme le rappel quotidien.
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "🌙 L'histoire du soir",
      body:
        "Et si votre enfant devenait le héros d'une nouvelle aventure ce soir ?",
      sound: "default",
      data: {
        type: "histoire_du_soir",
      },
    },
    trigger: {
      type:
        Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: heure,
      minute: minute,
      channelId: "default",
    },
  });

  console.log(
    `Rappel quotidien programmé à ${String(heure).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
  );

  return true;
}

// =====================================================
// DÉSACTIVATION DU RAPPEL QUOTIDIEN
// =====================================================

export async function desactiverRappelHistoire() {
  const rappels =
    await Notifications.getAllScheduledNotificationsAsync();

  for (const rappel of rappels) {
    if (
      rappel.content.data?.type ===
      "histoire_du_soir"
    ) {
      await Notifications.cancelScheduledNotificationAsync(
        rappel.identifier
      );
    }
  }

  console.log(
    "Rappels d'histoire du soir désactivés."
  );
}

// =====================================================
// TEST DE NOTIFICATION LOCALE
// =====================================================

export async function testerNotification() {
  await configureNotificationChannel();

  const permission =
    await verifierPermissionNotifications();

  if (!permission) {
    throw new Error(
      "Permission de notification refusée."
    );
  }

  // Notification locale dans 10 secondes.
  const notificationId =
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "🌙 ConteMagiqueIA",
        body:
          "Bravo ! Les notifications fonctionnent sur votre téléphone 🎉",
        sound: "default",
        data: {
          type: "notification_test",
        },
      },
      trigger: {
        type:
          Notifications.SchedulableTriggerInputTypes
            .TIME_INTERVAL,
        seconds: 10,
        channelId: "default",
      },
    });

  console.log(
    "Notification de test programmée :",
    notificationId
  );

  return notificationId;
}
