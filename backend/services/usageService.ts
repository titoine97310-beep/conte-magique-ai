import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "CONTE_MAGIQUE_USAGE_TEST_3";

export type UserRole = "admin" | "guest" | "user";

export type UsageData = {
  role: UserRole;
  freeTextUsed: boolean;
  freeImageUsed: boolean;
  textCredits: number;
  imageCredits: number;
};

const defaultData: UsageData = {
  role: "guest",
  freeTextUsed: false,
  freeImageUsed: false,
  textCredits: 0,
  imageCredits: 0,
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

export async function addTextCredits(amount: number) {
  const data = await getUsageData();
  data.textCredits += amount;
  await saveUsageData(data);
}

export async function addImageCredits(amount: number) {
  const data = await getUsageData();
  data.imageCredits += amount;
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

  if (data.textCredits > 0) {
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

  if (data.imageCredits > 0) {
    return { allowed: true, mode: "paid-image" };
  }

  return { allowed: false, mode: "blocked" };
}

export async function consumeTextStory() {
  const data = await getUsageData();

  if (data.role === "admin") return;

  if (!data.freeTextUsed) {
    data.freeTextUsed = true;
  } else if (data.textCredits > 0) {
    data.textCredits -= 1;
  }

  await saveUsageData(data);
}

export async function consumeImageStory() {
  const data = await getUsageData();

  if (data.role === "admin") return;

  if (!data.freeImageUsed) {
    data.freeImageUsed = true;
  } else if (data.imageCredits > 0) {
    data.imageCredits -= 1;
  }

  await saveUsageData(data);
}

/**
 * Compatibilité avec ton ancien code actuel.
 */
export async function canGenerateStory() {
  const data = await getUsageData();

  if (data.role === "admin") {
    return { allowed: true, mode: "admin" };
  }

  // 1ère histoire gratuite : texte seul
  if (!data.freeTextUsed) {
    return { allowed: true, mode: "free-text" };
  }

  // 2ème histoire gratuite : texte + images
  if (!data.freeImageUsed) {
    return { allowed: true, mode: "free-image" };
  }

  // Pack texte payé
  if (data.textCredits > 0) {
    return { allowed: true, mode: "paid-text" };
  }

  // Pack image payé
  if (data.imageCredits > 0) {
    return { allowed: true, mode: "paid-image" };
  }

  return { allowed: false, mode: "blocked" };
}

export async function incrementStoryUsage(mode?: string) {
  const data = await getUsageData();

  if (data.role === "admin") return;

  if (mode === "free-text") {
    data.freeTextUsed = true;
  } else if (mode === "free-image") {
    data.freeImageUsed = true;
  } else if (mode === "paid-text" && data.textCredits > 0) {
    data.textCredits -= 1;
  } else if (mode === "paid-image" && data.imageCredits > 0) {
    data.imageCredits -= 1;
  }

  await saveUsageData(data);
}