import { Stack } from "expo-router";

export default function RootLayout() {
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

      <Stack.Screen name="saved-stories" />

      <Stack.Screen name="premium" />

      <Stack.Screen name="cgu" />

      <Stack.Screen name="privacy" />
    </Stack>
  );
}