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

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotificationsAsync() {
  try {
    // Les notifications push nécessitent un vrai téléphone.
    if (!Device.isDevice) {
      console.log(
        "Notifications push : appareil physique requis."
      );
      return null;
    }

    // Android 8+ : création du canal de notifications.
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(
        "default",
        {
          name: "Notifications ConteMagiqueIA",
          importance:
            Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          sound: "default",
        }
      );
    }

    // Vérifie l'autorisation actuelle.
    const currentPermissions =
      await Notifications.getPermissionsAsync();

    let finalStatus = currentPermissions.status;

    // Demande l'autorisation si nécessaire.
    if (finalStatus !== "granted") {
      const requestedPermissions =
        await Notifications.requestPermissionsAsync();

      finalStatus = requestedPermissions.status;
    }

    if (finalStatus !== "granted") {
      console.log(
        "Permission notifications refusée."
      );
      return null;
    }

    // Récupère le projectId EAS/Expo.
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    if (!projectId) {
      console.error(
        "Project ID Expo/EAS introuvable."
      );
      return null;
    }

    // Création du token Expo Push.
    const tokenData =
      await Notifications.getExpoPushTokenAsync({
        projectId,
      });

    const expoPushToken = tokenData.data;

    console.log(
      "Expo Push Token :",
      expoPushToken
    );

    // Sauvegarde le token pour l'utilisateur connecté.
    const user = auth.currentUser;

    if (user) {
      await setDoc(
        doc(db, "users", user.uid),
        {
          expoPushToken,
          pushNotificationsEnabled: true,
          pushTokenUpdatedAt: serverTimestamp(),
          pushPlatform: Platform.OS,
        },
        {
          merge: true,
        }
      );

      console.log(
        "Token notification enregistré dans Firebase."
      );
    }

    return expoPushToken;
  } catch (error) {
    console.error(
      "Erreur inscription notifications :",
      error
    );

    return null;
  }
}