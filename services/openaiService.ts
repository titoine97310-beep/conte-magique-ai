const BACKEND_URL = "https://conte-magique-ai.onrender.com";

export async function generateStory(
  prompt: string,
  type: string,
  sceneCount: number
) {
  const response = await fetch(`${BACKEND_URL}/story`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      type,
      sceneCount,
    }),
  });

  if (!response.ok) {
    throw new Error("Erreur backend story");
  }

  return await response.json();
}

export async function generateImage(
  prompt: string,
  referenceImage?: string | null
) {
  const response = await fetch(`${BACKEND_URL}/image`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      referenceImage: referenceImage || null,
    }),
  });

  if (!response.ok) {
    throw new Error("Erreur backend image");
  }

  const data = await response.json();

  return data.imageUrl;
}