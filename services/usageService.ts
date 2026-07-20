import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "CONTE_MAGIQUE_USAGE_TEST_4";

export type UserRole = "admin" | "guest" | "user";

export type UsageData = {
  role: UserRole;
  freeTextUsed: boolean;
  freeImageUsed: boolean;

  textStoriesRemaining: number;
  illustratedStoriesRemaining: number;
};

const defaultData: UsageData = {
  role: "guest",
  freeTextUsed: false,
  freeImageUsed: false,

  textStoriesRemaining: 0,
  illustratedStoriesRemaining: 0,
};

export async function getUsageData(): Promise<UsageData> {
  const data = await AsyncStorage.getItem(STORAGE_KEY);

  if (!data) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
    return defaultData;
  }

  return JSON.parse(data);
}

export async function saveUsageData(data: UsageData) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export async function setAdminMode() {
  const data = await getUsageData();
  data.role = "admin";
  await saveUsageData(data);
}

export async function setUserMode() {
  const data = await getUsageData();
  data.role = "user";
  await saveUsageData(data);
}

export async function addTextStories(amount: number) {
  const data = await getUsageData();
  data.textStoriesRemaining += amount;
  await saveUsageData(data);
}

export async function addIllustratedStories(amount: number) {
  const data = await getUsageData();
  data.illustratedStoriesRemaining += amount;
  await saveUsageData(data);
}

export async function canGenerateTextStory() {
  const data = await getUsageData();

  if (data.role === "admin") {
    return { allowed: true, mode: "admin" };
  }

  if (!data.freeTextUsed) {
    return { allowed: true, mode: "free-text" };
  }

  if (data.textStoriesRemaining > 0) {
    return { allowed: true, mode: "paid-text" };
  }

  return { allowed: false, mode: "blocked" };
}

export async function canGenerateImageStory() {
  const data = await getUsageData();

  if (data.role === "admin") {
    return { allowed: true, mode: "admin" };
  }

  if (!data.freeImageUsed) {
    return { allowed: true, mode: "free-image" };
  }

  if (data.illustratedStoriesRemaining > 0) {
    return { allowed: true, mode: "paid-image" };
  }

  return { allowed: false, mode: "blocked" };
}

export async function consumeTextStory() {
  const data = await getUsageData();

  if (data.role === "admin") return;

  if (!data.freeTextUsed) {
    data.freeTextUsed = true;
  } else if (data.textStoriesRemaining > 0) {
    data.textStoriesRemaining--;
  }

  await saveUsageData(data);
}

export async function consumeImageStory() {
  const data = await getUsageData();

  if (data.role === "admin") return;

  if (!data.freeImageUsed) {
    data.freeImageUsed = true;
  } else if (data.illustratedStoriesRemaining > 0) {
    data.illustratedStoriesRemaining--;
  }

  await saveUsageData(data);
}

/**
 * Compatibilité avec le code actuel.
 */
export async function canGenerateStory() {
  const data = await getUsageData();

  if (data.role === "admin") {
    return { allowed: true, mode: "admin" };
  }

  if (!data.freeTextUsed) {
    return { allowed: true, mode: "free-text" };
  }

  if (!data.freeImageUsed) {
    return { allowed: true, mode: "free-image" };
  }

  if (data.textStoriesRemaining > 0) {
    return { allowed: true, mode: "paid-text" };
  }

  if (data.illustratedStoriesRemaining > 0) {
    return { allowed: true, mode: "paid-image" };
  }

  return { allowed: false, mode: "blocked" };
}

export async function incrementStoryUsage(mode?: string) {
  const data = await getUsageData();

  if (data.role === "admin") return;

  switch (mode) {
    case "free-text":
      data.freeTextUsed = true;
      break;

    case "free-image":
      data.freeImageUsed = true;
      break;

    case "paid-text":
      if (data.textStoriesRemaining > 0) {
        data.textStoriesRemaining--;
      }
      break;

    case "paid-image":
      if (data.illustratedStoriesRemaining > 0) {
        data.illustratedStoriesRemaining--;
      }
      break;
  }

  await saveUsageData(data);
}