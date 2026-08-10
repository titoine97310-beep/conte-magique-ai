import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import { saveStoryToCloud } from "./storyCloudService";

const KEY = "STORIES";
const STORIES_DIR = `${FileSystem.documentDirectory}stories/`;

async function ensureStoriesDir() {
  const dirInfo = await FileSystem.getInfoAsync(STORIES_DIR);

  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(STORIES_DIR, {
      intermediates: true,
    });
  }
}

async function saveBase64Image(imageUrl: string, storyId: number, index: number) {
  if (!imageUrl || !imageUrl.startsWith("data:image")) {
    return imageUrl;
  }

  await ensureStoriesDir();

  const base64 = imageUrl.split(",")[1];
  const fileUri = `${STORIES_DIR}story-${storyId}-scene-${index}.png`;

  await FileSystem.writeAsStringAsync(fileUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return fileUri;
}

export async function saveStory(story: any) {
  try {
    const existing = await AsyncStorage.getItem(KEY);
    const stories = existing ? JSON.parse(existing) : [];

    const storyId = Date.now();
    const savedScenes = [];

    for (let i = 0; i < story.scenes.length; i++) {
      const scene = story.scenes[i];

      const localImageUri = await saveBase64Image(
        scene.imageUrl,
        storyId,
        i
      );

      savedScenes.push({
        text: scene.text,
        imagePrompt: scene.imagePrompt,
        imageStyle: scene.imageStyle,
        ambience: scene.ambience,
        imageUrl: localImageUri,
      });
    }

    const newStory = {
      id: storyId,
      createdAt: new Date().toISOString(),
      favorite: false,
      prompt: story.prompt,
      imageStyle: story.imageStyle,
      storyType: story.storyType,
      storyLength: story.storyLength,
      narrator: story.narrator || "narratrice",
      scenes: savedScenes,
    };

    stories.unshift(newStory);

    await AsyncStorage.setItem(KEY, JSON.stringify(stories));

    try {
  await saveStoryToCloud(newStory);
} catch (e) {
  console.log("Sauvegarde cloud ignorée :", e);
}

    console.log("Histoire sauvegardée avec narrateur :", newStory.narrator);

    return newStory;
  } catch (e) {
    console.log("Erreur sauvegarde :", e);
    return null;
  }
}

export async function getStories() {
  try {
    const data = await AsyncStorage.getItem(KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.log("Erreur lecture :", e);
    return [];
  }
}

export async function deleteStory(id: number) {
  try {
    const data = await AsyncStorage.getItem(KEY);
    const stories = data ? JSON.parse(data) : [];

    const storyToDelete = stories.find((s: any) => s.id === id);

    if (storyToDelete?.scenes) {
      for (const scene of storyToDelete.scenes) {
        if (scene.imageUrl?.startsWith(FileSystem.documentDirectory || "")) {
          const fileInfo = await FileSystem.getInfoAsync(scene.imageUrl);

          if (fileInfo.exists) {
            await FileSystem.deleteAsync(scene.imageUrl);
          }
        }
      }
    }

    const updated = stories.filter((s: any) => s.id !== id);

    await AsyncStorage.setItem(KEY, JSON.stringify(updated));
  } catch (e) {
    console.log("Erreur suppression :", e);
  }
}

export async function toggleFavoriteStory(id: number) {
  try {
    const data = await AsyncStorage.getItem(KEY);
    const stories = data ? JSON.parse(data) : [];

    const updated = stories.map((story: any) =>
      story.id === id ? { ...story, favorite: !story.favorite } : story
    );

    await AsyncStorage.setItem(KEY, JSON.stringify(updated));

  } catch (e) {
    console.log("Erreur favori :", e);
  }
}

export async function clearStories() {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch (e) {
    console.log("Erreur reset histoires :", e);
  }
}