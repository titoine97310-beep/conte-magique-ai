import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="create-story" />
      <Stack.Screen name="player" />
      <Stack.Screen name="saved-stories" />
    </Stack>
  );
}