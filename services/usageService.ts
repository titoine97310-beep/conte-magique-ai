import AsyncStorage from "@react-native-async-storage/async-storage";


const STORAGE_KEY = "CONTE_MAGIQUE_USAGE_TEST_4";

export type UserRole = "admin" | "guest" | "user";

export type UsageMode =
  | "admin"
  | "guest-first-story"
  | "guest-second-story"
  | "paid-text"
  | "paid-image"
  | "blocked";

export type UsageData = {
  role: UserRole;

  // 0 : aucune histoire découverte
  // 1 : première histoire texte terminée
  // 2 : deuxième histoire illustrée terminée
  guestStoriesCompleted: number;

  textCredits: number;
  imageCredits: number;
};

const defaultData: UsageData = {
  role: "guest",
  guestStoriesCompleted: 0,
  textCredits: 0,
  imageCredits: 0,
};

/**
 * Convertit automatiquement les anciennes données :
 * freeTextUsed / freeImageUsed
 *
 * Cela évite les erreurs si l'ancienne structure est encore
 * enregistrée dans AsyncStorage.
 */
function migrateUsageData(storedData: any): UsageData {
  let guestStoriesCompleted = 0;

  if (typeof storedData?.guestStoriesCompleted === "number") {
    guestStoriesCompleted = storedData.guestStoriesCompleted;
  } else {
    if (storedData?.freeTextUsed === true) {
      guestStoriesCompleted = 1;
    }

    if (storedData?.freeImageUsed === true) {
      guestStoriesCompleted = 2;
    }
  }

  return {
    role:
      storedData?.role === "admin" ||
      storedData?.role === "user" ||
      storedData?.role === "guest"
        ? storedData.role
        : "guest",

    guestStoriesCompleted: Math.min(
      2,
      Math.max(0, guestStoriesCompleted)
    ),

    textCredits:
      typeof storedData?.textCredits === "number"
        ? Math.max(0, storedData.textCredits)
        : 0,

    imageCredits:
      typeof storedData?.imageCredits === "number"
        ? Math.max(0, storedData.imageCredits)
        : 0,
  };
}

export async function getUsageData(): Promise<UsageData> {
  try {
    const savedData = await AsyncStorage.getItem(STORAGE_KEY);

    if (!savedData) {
      await saveUsageData(defaultData);
      return { ...defaultData };
    }

    const parsedData = JSON.parse(savedData);
    const migratedData = migrateUsageData(parsedData);

    // Enregistre automatiquement la nouvelle structure.
    await saveUsageData(migratedData);

    return migratedData;
  } catch (error) {
    console.log("Erreur lecture usage :", error);

    await saveUsageData(defaultData);
    return { ...defaultData };
  }
}

export async function saveUsageData(data: UsageData): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export async function setAdminMode(): Promise<void> {
  const data = await getUsageData();

  data.role = "admin";

  await saveUsageData(data);
}

export async function setGuestMode(): Promise<void> {
  const data = await getUsageData();

  data.role = "guest";

  await saveUsageData(data);
}

export async function setUserMode(): Promise<void> {
  const data = await getUsageData();

  data.role = "user";

  // Les crédits d'un utilisateur connecté
  // sont désormais gérés uniquement dans Firestore.
  data.textCredits = 0;
  data.imageCredits = 0;

  await saveUsageData(data);
}

export async function addTextCredits(amount: number): Promise<void> {
  if (amount <= 0) return;

  const data = await getUsageData();

  data.textCredits += amount;

  await saveUsageData(data);
}

export async function addImageCredits(amount: number): Promise<void> {
  if (amount <= 0) return;

  const data = await getUsageData();

  data.imageCredits += amount;

  await saveUsageData(data);
}

/**
 * Détermine quelle expérience doit être générée.
 */
export async function canGenerateStory(): Promise<{
  allowed: boolean;
  mode: UsageMode;
}> {
  const data = await getUsageData();
  console.log("=== USAGE ===");
  console.log(data);

  if (data.role === "admin") {
    return {
      allowed: true,
      mode: "admin",
    };
  }

  /*
   * Parcours visiteur :
   *
   * 0 histoire terminée
   * → première histoire texte
   *
   * 1 histoire terminée
   * → deuxième histoire illustrée
   *
   * 2 histoires terminées
   * → création de compte demandée
   */
  if (data.role === "guest") {
    if (data.guestStoriesCompleted === 0) {
      return {
        allowed: true,
        mode: "guest-first-story",
      };
    }

    if (data.guestStoriesCompleted === 1) {
      return {
        allowed: true,
        mode: "guest-second-story",
      };
    }

    return {
      allowed: false,
      mode: "blocked",
    };
  }

  /*
   * Utilisateur connecté :
   * il utilise les histoires de ses carnets.
   */
  if (data.textCredits > 0) {
    return {
      allowed: true,
      mode: "paid-text",
    };
  }

  if (data.imageCredits > 0) {
    return {
      allowed: true,
      mode: "paid-image",
    };
  }

  return {
    allowed: false,
    mode: "blocked",
  };
}

/**
 * Décompte l'histoire uniquement après une génération réussie.
 */
export async function incrementStoryUsage(
  mode?: UsageMode
): Promise<void> {
  const data = await getUsageData();

  if (data.role === "admin" || mode === "admin") {
    return;
  }

  if (
    mode === "guest-first-story" &&
    data.role === "guest" &&
    data.guestStoriesCompleted === 0
  ) {
    data.guestStoriesCompleted = 1;
  } else if (
    mode === "guest-second-story" &&
    data.role === "guest" &&
    data.guestStoriesCompleted === 1
  ) {
    data.guestStoriesCompleted = 2;
  } else if (
    mode === "paid-text" &&
    data.role === "user" &&
    data.textCredits > 0
  ) {
    data.textCredits -= 1;
  } else if (
    mode === "paid-image" &&
    data.role === "user" &&
    data.imageCredits > 0
  ) {
    data.imageCredits -= 1;
  }

  await saveUsageData(data);
}

/**
 * Fonctions conservées pour éviter de casser un éventuel ancien écran.
 */
export async function canGenerateTextStory() {
  const data = await getUsageData();

  if (data.role === "admin") {
    return { allowed: true, mode: "admin" as UsageMode };
  }

  if (data.role === "user" && data.textCredits > 0) {
    return { allowed: true, mode: "paid-text" as UsageMode };
  }

  return { allowed: false, mode: "blocked" as UsageMode };
}

export async function canGenerateImageStory() {
  const data = await getUsageData();

  if (data.role === "admin") {
    return { allowed: true, mode: "admin" as UsageMode };
  }

  if (data.role === "user" && data.imageCredits > 0) {
    return { allowed: true, mode: "paid-image" as UsageMode };
  }

  return { allowed: false, mode: "blocked" as UsageMode };
}

export async function consumeTextStory(): Promise<void> {
  await incrementStoryUsage("paid-text");
}

export async function consumeImageStory(): Promise<void> {
  await incrementStoryUsage("paid-image");
}

/**
 * Utile uniquement pendant les tests.
 */
export async function resetUsageData(): Promise<void> {
  await saveUsageData({ ...defaultData });
}