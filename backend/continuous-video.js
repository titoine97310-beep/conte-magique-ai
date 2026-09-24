import { toFile } from '@runwayml/sdk';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

export function clipDuration(remaining) {
  if (!Number.isFinite(remaining) || remaining <= 0) throw new Error('Durée vidéo invalide.');
  return remaining <= 5 ? 5 : 10;
}

export function motionPrompt(text = "", continuation = false) {
  const style = continuation
    ? `
Continue seamlessly from this exact previous frame.
Same scene, same shot and same characters.

IDENTITY LOCK:
Preserve every character's face, skin tone, hair, age, body proportions, clothes, colors, accessories and important objects.
Do not add, remove, duplicate, merge, replace or transform characters.
Do not redesign faces or clothing.

MOTION:
Continue the established action naturally.
Use clearly visible natural movement: arms, hands, head, body, expressions, hair, clothing, objects and environment when appropriate.
Characters may walk, turn, reach, point, wave, react or interact when appropriate.
Do not limit animation to blinking or breathing.

CONTINUITY:
Keep character identity, position, scale and environment coherent with the previous clip.
Use smooth child-friendly cinematic movement.
Gentle pan, tracking, push-in or pull-back is allowed.
No abrupt cuts, violent camera shake or extreme zoom.
Keep faces and important characters visible.
`
    : `
Animate this exact illustration as a lively children's animated movie scene.

IDENTITY LOCK:
Preserve every character's face, skin tone, hair, age, body proportions, clothes, colors, accessories, objects, environment and illustration style.
Do not add, remove, duplicate, merge, replace or transform characters.
Do not redesign faces or clothing.

ACTION:
Characters should clearly perform the action described in the scene.
Use natural expressive movement: walking, running, turning, reaching, pointing, waving, reacting or interacting when appropriate.
Animate arms, hands, head and body naturally.
Animate facial reactions, hair, clothing, relevant objects and environment.
Do not limit animation to blinking or breathing.

CAMERA:
Use smooth child-friendly cinematic movement when useful.
Gentle pan, tracking, push-in, pull-back or reframing is allowed.
No abrupt cuts, violent camera shake or extreme zoom.
Keep faces and important characters visible.

Preserve the original illustration style, colors and atmosphere.
`;

  const cleanStyle = style
    .replace(/\s+/g, " ")
    .trim();

  const context = String(text || "")
    .replace(/\s+/g, " ")
    .trim();

  // On réserve volontairement de la place
  // au contexte de la scène.
  const scenePrefix = context
    ? " Scene: "
    : "";

  const maxStyleLength = Math.max(
    0,
    1000 - scenePrefix.length - context.length
  );

  const shortenedStyle = cleanStyle
    .slice(0, maxStyleLength)
    .trim();

  return context
    ? `${shortenedStyle}${scenePrefix}${context}`.slice(0, 1000)
    : shortenedStyle.slice(0, 1000);
}

export function runFfmpeg(binary, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, ['-hide_banner', '-nostdin', ...args], { windowsHide: true });
    let log = '';
    child.stderr.on('data', chunk => { log = (log + chunk).slice(-16000); });
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve(log) : reject(new Error(`FFmpeg (${code}): ${log}`)));
  });
}

export async function mediaDuration(binary, file) {
  // Decode to the null sink: the final timestamp measures the actual media length.
  const log = await runFfmpeg(binary, ['-i', file, '-map', '0:0', '-f', 'null', '-']);
  const matches = [...log.matchAll(/time=(\d+):(\d+):(\d+(?:\.\d+)?)/g)];
  const match = matches.at(-1);
  const seconds = match ? Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) : NaN;
  if (!Number.isFinite(seconds) || seconds <= 0) throw new Error('Durée du média introuvable.');
  return seconds;
}

export async function assembleScene(
  binary,
  clips,
  audio,
  seconds,
  dir
) {
  const list = path.join(
    dir,
    "clips.txt"
  );

  await fs.writeFile(
    list,
    clips
      .map(
        (file) =>
          `file '${file
            .replace(/\\/g, "/")
            .replace(/'/g, "'\\''")}'`
      )
      .join("\n")
  );

  const output = path.join(
    dir,
    "narrated.mp4"
  );

  /*
   * FORMAT FINAL : 720 x 1280 (9:16)
   *
   * On conserve toute l'image originale :
   * aucun personnage n'est coupé.
   *
   * Si le clip Runway n'occupe pas exactement
   * tout le format vertical, on crée derrière
   * une version agrandie et floutée du même clip.
   *
   * Résultat :
   * - pas de bandes noires
   * - pas de visage coupé
   * - pas de personnage supprimé par un crop
   * - vraie sortie verticale 9:16
   */
  const videoFilter =
    "[0:v]" +
    "fps=24," +
    "split=2[background][foreground];" +

    "[background]" +
    "scale=720:1280:force_original_aspect_ratio=increase," +
    "crop=720:1280," +
    "boxblur=20:10" +
    "[bg];" +

    "[foreground]" +
    "scale=720:1280:force_original_aspect_ratio=decrease" +
    "[fg];" +

    "[bg][fg]" +
    "overlay=(W-w)/2:(H-h)/2," +
    "setsar=1," +
    "format=yuv420p" +
    "[v]";

  await runFfmpeg(
    binary,
    [
      "-y",

      "-f",
      "concat",

      "-safe",
      "0",

      "-i",
      list,

      "-i",
      audio,

      "-filter_complex",
      videoFilter,

      "-map",
      "[v]",

      "-map",
      "1:a:0",

      "-t",
      String(seconds),

      "-c:v",
      "libx264",

      "-preset",
      "veryfast",

      "-crf",
      "20",

      "-c:a",
      "aac",

      "-b:a",
      "160k",

      "-pix_fmt",
      "yuv420p",

      "-movflags",
      "+faststart",

      output,
    ]
  );

  return output;
}

// Dependencies are injected so resume and billing behaviour can be tested without APIs.
export async function continuousScene({
  state,
  saveState,
  files,
  createAudio,
  runway,
  download,
  ffmpeg,
  dir,
  image,
  text,
  model,
  legacyVideoUrl,
  sleep = ms =>
    new Promise(r =>
      setTimeout(r, ms)
    ),
}) {
  await fs.mkdir(
    dir,
    {
      recursive: true,
    }
  );

  // ========================================
  // 🎙️ NARRATION
  // ========================================

  const audio =
    path.join(
      dir,
      "narration.mp3"
    );

  if (
    await files.exists(
      "narration.mp3"
    )
  ) {
    await files.get(
      "narration.mp3",
      audio
    );
  } else {
    await fs.writeFile(
      audio,
      await createAudio()
    );

    await files.put(
      "narration.mp3",
      audio
    );
  }

  const seconds =
    await mediaDuration(
      ffmpeg,
      audio
    );

  // Protection contre une narration
  // anormalement longue.
  if (seconds > 120) {
    throw new Error(
      "Cette scène dépasse 120 secondes de narration. Raccourcissez le texte."
    );
  }

  state.audioSeconds =
    seconds;

  state.clips ||= [];

  await saveState(state);

  // ========================================
  // 🎬 DURÉE MAXIMALE RUNWAY
  // ========================================

  // On ne paie jamais plus de
  // 30 secondes Runway pour une scène.
  const MAX_RUNWAY_SECONDS =
    30;

  const animationTarget =
    Math.min(
      seconds,
      MAX_RUNWAY_SECONDS
    );

  console.log(
    `🎬 Narration : ${seconds.toFixed(2)} s | Animation Runway prévue : ${animationTarget.toFixed(2)} s maximum`
  );

  const clips = [];

  let covered = 0;

  // ========================================
  // 🎥 GÉNÉRATION DES CLIPS RUNWAY
  // ========================================

  while (
    covered + 0.02 <
    animationTarget
  ) {
    const index =
      clips.length;

    if (index >= 3) {
      break;
    }

    const name =
      `clip-${index}.mp4`;

    const local =
      path.join(
        dir,
        name
      );

    let clip =
      state.clips[index];

    // Un échec Runway confirmé
    // peut être retenté lors d'une
    // nouvelle demande utilisateur.
    if (clip?.failed) {
      clip = undefined;

      state.clips[index] =
        {};

      await saveState(
        state
      );
    }

    // ========================================
    // ♻️ CLIP DÉJÀ STOCKÉ
    // ========================================

    if (
      await files.exists(
        name
      )
    ) {
      await files.get(
        name,
        local
      );
    }

    // ========================================
    // ♻️ ANCIEN PREMIER CLIP
    // ========================================

    else if (
      index === 0 &&
      legacyVideoUrl &&
      !clip?.taskId
    ) {
      await download(
        legacyVideoUrl,
        local
      );

      await files.put(
        name,
        local
      );
    }

    // ========================================
    // 🎬 NOUVEAU CLIP RUNWAY
    // ========================================

    else {
      if (!clip?.taskId) {
        // Si la soumission précédente
        // est ambiguë, surtout ne pas
        // créer une deuxième tâche payante.
        if (clip?.submitting) {
          throw new Error(
            "Envoi Runway incertain : vérifiez la tâche avant de relancer cette scène."
          );
        }

        let promptImage =
          image;

        // ------------------------------------
        // 🔗 CONTINUATION DU CLIP PRÉCÉDENT
        // ------------------------------------

        if (index > 0) {
          const frame =
            path.join(
              dir,
              `last-frame-${index}.png`
            );

          await runFfmpeg(
            ffmpeg,
            [
              "-y",

              "-sseof",
              "-0.05",

              "-i",
              clips.at(-1),

              "-frames:v",
              "1",

              frame,
            ]
          );

          promptImage =
            "data:image/png;base64," +
            (
              await fs.readFile(
                frame
              )
            ).toString(
              "base64"
            );
        }

        // ------------------------------------
        // ☁️ UPLOAD IMAGE VERS RUNWAY
        // ------------------------------------

        if (
          promptImage.startsWith(
            "data:image/"
          )
        ) {
          const match =
            promptImage.match(
              /^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/s
            );

          if (!match) {
            throw new Error(
              "Image base64 invalide."
            );
          }

          const extension =
            match[1]
              .split("/")[1];

          const file =
            await toFile(
              Buffer.from(
                match[2],
                "base64"
              ),

              `frame.${extension}`,

              {
                type:
                  match[1],
              }
            );

          const upload =
            await runway.uploads
              .createEphemeral({
                file,
              });

          promptImage =
            upload.uri;
        }

        // ------------------------------------
        // ⏱️ 5 OU 10 SECONDES
        // ------------------------------------

        const remainingAnimation =
          animationTarget -
          covered;

        clip = {
          submitting:
            true,

          duration:
            clipDuration(
              remainingAnimation
            ),
        };

        state.clips[index] =
          clip;

        await saveState(
          state
        );

        let task;

        try {
          task =
            await runway.imageToVideo.create(
              {
                model,

                // Format vertical 9:16
                ratio:
                  "720:1280",

                duration:
                  clip.duration,

                promptImage,

                promptText:
                  motionPrompt(
                    text,
                    index > 0
                  ),
              },
              {
                // IMPORTANT :
                // aucune relance automatique
                // pour éviter une double
                // facturation Runway.
                maxRetries:
                  0,
              }
            );
        } catch (error) {
          const status =
            Number(
              error?.status
            );

          // Une réponse HTTP 4xx signifie
          // que Runway a explicitement
          // refusé la tâche.
          if (
            Number.isFinite(
              status
            ) &&
            status >= 400 &&
            status < 500
          ) {
            clip.submitting =
              false;

            clip.failed =
              true;

            clip.failureCode =
              `HTTP_${status}`;

            await saveState(
              state
            );
          }

          // En cas d'erreur réseau ambiguë,
          // submitting reste volontairement
          // à true.
          //
          // On évite ainsi de payer
          // accidentellement deux tâches.
          throw error;
        }

        if (!task?.id) {
          const error =
            new Error(
              "Runway n'a retourné aucun identifiant de tâche."
            );

          error.code =
            "RUNWAY_TASK_ID_MISSING";

          throw error;
        }

        clip.taskId =
          task.id;

        clip.submitting =
          false;

        clip.failed =
          false;

        await saveState(
          state
        );
      }

      // ========================================
      // ⏳ ATTENTE RUNWAY
      // ========================================

      let task;

      for (
        let attempt = 0;
        attempt < 180;
        attempt++
      ) {
        task =
          await runway.tasks
            .retrieve(
              clip.taskId
            );

        if (
          task.status ===
          "SUCCEEDED"
        ) {
          break;
        }

        if (
          [
            "FAILED",
            "CANCELED",
            "CANCELLED",
          ].includes(
            task.status
          )
        ) {
          clip.failed =
            true;

          clip.failureCode =
            task.failureCode ||
            task.status;

          await saveState(
            state
          );

          const error =
            new Error(
              "Le service vidéo n’a pas pu terminer cette scène."
            );

          error.code =
            "RUNWAY_TASK_FAILED";

          error.taskId =
            clip.taskId;

          error.failureCode =
            clip.failureCode;

          throw error;
        }

        await sleep(
          5000
        );
      }

      if (
        task?.status !==
          "SUCCEEDED" ||
        !task.output?.[0]
      ) {
        throw new Error(
          "Runway est encore en cours. Reprenez la génération plus tard."
        );
      }

      await download(
        task.output[0],
        local
      );

      await files.put(
        name,
        local
      );
    }

    // ========================================
    // ⏱️ DURÉE RÉELLE DU CLIP
    // ========================================

    const actualSeconds =
      await mediaDuration(
        ffmpeg,
        local
      );

    state.clips[index] = {
      ...state.clips[index],

      seconds:
        actualSeconds,
    };

    await saveState(
      state
    );

    clips.push(
      local
    );

    covered +=
      actualSeconds;

    console.log(
      `✅ Clip ${index + 1} : ${actualSeconds.toFixed(2)} s | Animation cumulée : ${covered.toFixed(2)} s`
    );
  }

  if (!clips.length) {
    throw new Error(
      "Aucun clip vidéo disponible pour cette scène."
    );
  }

  // ========================================
  // 🧊 NARRATION > 30 S
  // ========================================

  // Si la narration dépasse les 30 secondes
  // d'animation Runway, on prolonge la
  // dernière image sans appeler Runway.
  if (
    seconds >
    covered + 0.02
  ) {
    const freezeSeconds =
      seconds -
      covered;

    const freezeFrame =
      path.join(
        dir,
        "freeze-frame.png"
      );

    const freezeVideo =
      path.join(
        dir,
        "freeze-tail.mp4"
      );

    await runFfmpeg(
      ffmpeg,
      [
        "-y",

        "-sseof",
        "-0.05",

        "-i",
        clips.at(-1),

        "-frames:v",
        "1",

        freezeFrame,
      ]
    );

    await runFfmpeg(
      ffmpeg,
      [
        "-y",

        "-loop",
        "1",

        "-i",
        freezeFrame,

        "-t",
        String(
          freezeSeconds +
            0.1
        ),

        "-vf",
        "fps=24,setsar=1",

        "-c:v",
        "libx264",

        "-preset",
        "veryfast",

        "-crf",
        "20",

        "-pix_fmt",
        "yuv420p",

        freezeVideo,
      ]
    );

    clips.push(
      freezeVideo
    );

    console.log(
      `🧊 Animation Runway plafonnée. Image finale prolongée pendant ${freezeSeconds.toFixed(2)} s.`
    );
  }

  // ========================================
  // 🎞️ ASSEMBLAGE + NARRATION
  // ========================================

  return assembleScene(
    ffmpeg,
    clips,
    audio,
    seconds,
    dir
  );
}
