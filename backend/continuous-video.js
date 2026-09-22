import { toFile } from '@runwayml/sdk';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

export function clipDuration(remaining) {
  if (!Number.isFinite(remaining) || remaining <= 0) throw new Error('Durée vidéo invalide.');
  return remaining <= 5 ? 5 : 10;
}

export function motionPrompt(text = '', continuation = false) {
  const style = `
${continuation
  ? `Continue seamlessly from this exact frame.
This is a continuation clip, not a new scene.
Preserve the exact current appearance, pose, position and scale of every character.
Continue only the motion already established in the previous shot.
Do not introduce a new action, gesture, pose, expression, object or camera movement.
Prioritize visual stability and character identity over additional movement.`
  : `Animate this exact illustration with very high visual fidelity.
Begin with gentle natural motion while preserving the exact original characters and composition.`}

This is a gentle animated children's storybook shot.

ABSOLUTE PRIORITY: preserve the original illustration.
The characters must remain exactly the same people and creatures throughout the shot.

STRICT CHARACTER CONSISTENCY:
- preserve faces, facial features, skin tone, hair, hairstyle and age
- preserve body proportions and anatomy
- preserve clothing, colors, patterns and accessories
- preserve all important objects
- do not add, remove, duplicate, merge or replace characters
- do not transform one character into another
- do not invent new limbs, fingers, faces, clothing or objects
- keep hands and faces stable and anatomically coherent
- preserve the original illustration style and color palette

MOTION:
Use subtle, natural animation only.
Prefer:
- gentle breathing
- natural blinking
- very small eye movements
- subtle facial expressions
- slight head movement
- gentle hair or clothing movement
- small environmental motion such as leaves, light, particles or clouds

Only perform a larger character action when it is clearly required by the scene context.
Avoid unnecessary walking, large body turns, exaggerated gestures or rapid movement.

CAMERA:
Stable cinematic framing.
Very subtle slow push-in or parallax is allowed when appropriate.
No sudden camera movement.
No cuts.
No reframing that removes an important character.
Keep all main characters visible and recognizable.

CONTINUITY:
This shot belongs to the same animated story.
Maintain visual continuity from beginning to end.
For continuation clips, the first frame must continue naturally from the supplied frame.
Do not reset character positions or redesign the scene.

Scene context:
${String(text).slice(0, 1000)}
`;

  return style.trim();
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

export async function assembleScene(binary, clips, audio, seconds, dir) {
  const list = path.join(dir, 'clips.txt');
  await fs.writeFile(list, clips.map(file => `file '${file.replace(/\\/g, '/').replace(/'/g, "'\\''")}'`).join('\n'));
  const output = path.join(dir, 'narrated.mp4');
  await runFfmpeg(binary, ['-y', '-f', 'concat', '-safe', '0', '-i', list, '-i', audio,
    '-map', '0:v:0', '-map', '1:a:0', '-vf', 'fps=24,setsar=1', '-t', String(seconds),
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-c:a', 'aac', '-b:a', '160k',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', output]);
  return output;
}

// Dependencies are injected so resume and billing behaviour can be tested without APIs.
export async function continuousScene({ state, saveState, files, createAudio, runway,
  download, ffmpeg, dir, image, text, model, legacyVideoUrl, sleep = ms => new Promise(r => setTimeout(r, ms)) }) {
  await fs.mkdir(dir, { recursive: true });
  const audio = path.join(dir, 'narration.mp3');
  if (await files.exists('narration.mp3')) {
    await files.get('narration.mp3', audio);
  } else {
    await fs.writeFile(audio, await createAudio());
    await files.put('narration.mp3', audio);
  }
  const seconds = await mediaDuration(ffmpeg, audio);
  // Bound unexpected input and spend; never silently truncate the narration.
  if (seconds > 120) throw new Error('Cette scène dépasse 120 secondes de narration. Raccourcissez le texte.');
  state.audioSeconds = seconds;
  state.clips ||= [];
  await saveState(state);
  const clips = [];
  let covered = 0;
  while (covered + 0.02 < seconds) {
    const index = clips.length;
    if (index >= 25) throw new Error('Limite de clips atteinte pour cette scène.');
    const name = `clip-${index}.mp4`;
    const local = path.join(dir, name);
    let clip = state.clips[index];
    // A confirmed failure may be retried on the user's next resume request.
    if (clip?.failed) {
      clip = undefined;
      state.clips[index] = {};
      await saveState(state);
    }
    if (await files.exists(name)) {
      await files.get(name, local);
    } else if (index === 0 && legacyVideoUrl && !clip?.taskId) {
      await download(legacyVideoUrl, local);
      await files.put(name, local);
    } else {
      if (!clip?.taskId) {
        // A lost create response is ambiguous. Do not automatically pay for another task.
        if (clip?.submitting) throw new Error('Envoi Runway incertain : vérifiez la tâche avant de relancer cette scène.');
        let promptImage = image;
        if (index > 0) {
          const frame = path.join(dir, 'last-frame.png');
          await runFfmpeg(ffmpeg, ['-y', '-sseof', '-0.05', '-i', clips.at(-1), '-frames:v', '1', frame]);
          promptImage = 'data:image/png;base64,' + (await fs.readFile(frame)).toString('base64');
        }
        if (promptImage.startsWith('data:image/')) {
          const match = promptImage.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/s);
          if (!match) throw new Error('Image base64 invalide.');
          const extension = match[1].split('/')[1];
          const file = await toFile(Buffer.from(match[2], 'base64'), `frame.${extension}`, { type: match[1] });
          const upload = await runway.uploads.createEphemeral({ file });
          promptImage = upload.uri;
        }
        clip = { submitting: true, duration: clipDuration(seconds - covered) };
        state.clips[index] = clip;
        await saveState(state);
        const task = await runway.imageToVideo.create({ model, ratio: '720:1280', duration: clip.duration,
          promptImage, promptText: motionPrompt(text, index > 0) }, { maxRetries: 0 });
        clip.taskId = task.id;
        clip.submitting = false;
        await saveState(state);
      }
      let task;
      for (let attempt = 0; attempt < 180; attempt++) {
        task = await runway.tasks.retrieve(clip.taskId);
        if (task.status === 'SUCCEEDED') break;
        if (['FAILED', 'CANCELED', 'CANCELLED'].includes(task.status)) {
          clip.failed = true;
          clip.failureCode = task.failureCode || task.status;
          await saveState(state);
          const error = new Error('Le service vidéo n’a pas pu terminer cette scène.');
          error.code = 'RUNWAY_TASK_FAILED';
          error.taskId = clip.taskId;
          error.failureCode = clip.failureCode;
          throw error;
        }
        await sleep(5000);
      }
      if (task?.status !== 'SUCCEEDED' || !task.output?.[0]) throw new Error('Runway est encore en cours. Reprenez la génération plus tard.');
      await download(task.output[0], local);
      await files.put(name, local);
    }
    const actualSeconds = await mediaDuration(ffmpeg, local);
    state.clips[index] = { ...state.clips[index], seconds: actualSeconds };
    await saveState(state);
    clips.push(local);
    covered += actualSeconds;
  }
  return assembleScene(ffmpeg, clips, audio, seconds, dir);
}
