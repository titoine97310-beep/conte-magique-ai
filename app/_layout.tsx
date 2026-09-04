import { Stack } from "expo-router";
import { useEffect } from "react";

import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../services/firebase";
import { registerForPushNotificationsAsync } from "../services/notificationService";

export default function RootLayout() {
  useEffect(() => {
  const unsubscribe = onAuthStateChanged(
    auth,
    async (user) => {
      if (!user) {
        console.log(
          "🔔 Notifications : aucun utilisateur connecté."
        );
        return;
      }

      console.log(
        "🔔 Utilisateur connecté : préparation des notifications."
      );

      const token =
        await registerForPushNotificationsAsync();

      if (token) {
        console.log(
          "🔔 Notifications activées."
        );
      }
    }
  );

  return unsubscribe;
}, []);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />

      <Stack.Screen name="register" />

      <Stack.Screen name="account" />

      <Stack.Screen name="forgot-password" />

      <Stack.Screen name="create-story" />

      <Stack.Screen name="player" />

      <Stack.Screen name="video-player" />

      <Stack.Screen name="saved-stories" />

      <Stack.Screen name="saved-videos" />

      <Stack.Screen name="premium" />

      <Stack.Screen name="cgu" />

      <Stack.Screen name="privacy" />
    </Stack>
  );
}