import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post("/tts", async (req, res) => {
  try {
    const { text, mode = "story", emotion = "warm" } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Texte manquant" });
    }

    const instructions =
      mode === "bedtime"
        ? "Lis comme un conteur très doux pour endormir un enfant. Voix lente, chaleureuse, calme, avec des pauses naturelles. Ne sois jamais brusque."
        : emotion === "danger"
        ? "Lis comme un conteur pour enfants avec une légère tension, du suspense doux, sans faire peur. Voix expressive et rythmée."
        : emotion === "victory"
        ? "Lis comme un conteur joyeux et émerveillé. Ton chaleureux, positif, célébration douce."
        : emotion === "mystery"
        ? "Lis comme un conteur mystérieux mais rassurant. Fais des pauses, garde une voix douce et curieuse."
        : "Lis comme un conteur chaleureux pour enfants. Voix expressive, naturelle, avec des pauses et de l’émerveillement.";

    const response = await openai.audio.speech.create({
      model: "gpt-5.4-mini-tts",
      voice: "alloy",
      input: text,
      instructions,
      response_format: "mp3",
    });

    const buffer = Buffer.from(await response.arrayBuffer());

    res.setHeader("Content-Type", "audio/mpeg");
    res.send(buffer);
  } catch (e) {
    console.error("Erreur TTS :", e);
    res.status(500).json({ error: "Erreur génération voix" });
  }
});

app.get("/", (req, res) => {
  res.send("Backend TTS OK");
});


app.listen(3000, "0.0.0.0", () => {
  console.log("Backend TTS lancé sur http://localhost:3000");
});