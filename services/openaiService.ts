import { auth } from "./firebase";

const BACKEND_URL = "https://conte-magique-ai.onrender.com";

// ==========================================
// AUTHENTIFICATION FIREBASE
// ==========================================

async function getAuthHeaders() {
  const user = auth.currentUser;

  if (!user) {
    throw new Error(
      "Vous devez être connecté pour générer une histoire."
    );
  }

  const token = await user.getIdToken();

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

// ==========================================
// GÉNÉRATION D'HISTOIRE
// ==========================================

export async function generateStory(
  prompt: string,
  type: string | string[],
  sceneCount: number,
  language: "fr" | "en" | "es",
  packType: "text" | "illustrated",
  requestId: string
) {
  const types = Array.isArray(type)
    ? type.slice(0, 2)
    : [type];

  const response = await fetch(`${BACKEND_URL}/story`, {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify({
      prompt,
      type: types,
      sceneCount,
      language,
      packType,
      requestId,
    }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));

    throw new Error(
      data.error || "Erreur backend story"
    );
  }

  return await response.json();
}

// ==========================================
// GÉNÉRATION D'IMAGE
// ==========================================

export async function generateImage(
  prompt: string,
  referenceImage?: string | null,
  requestId?: string,
  sceneIndex?: number
) {
  const response = await fetch(`${BACKEND_URL}/image`, {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify({
      prompt,
      referenceImage: referenceImage || null,
      requestId,
      sceneIndex,
    }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));

    throw new Error(
      data.error || "Erreur backend image"
    );
  }

  const data = await response.json();

  return data.imageUrl;
}