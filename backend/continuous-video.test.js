import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import ffmpeg from 'ffmpeg-static';
import RunwayML from '@runwayml/sdk';
import { clipDuration, motionPrompt, runFfmpeg, mediaDuration, continuousScene } from './continuous-video.js';

test('durées valides et contexte conservé dans le prompt', () => {
  assert.equal(clipDuration(4.9), 5);
  assert.equal(clipDuration(5.01), 10);
  assert.equal(clipDuration(30), 10);
  assert.throws(() => clipDuration(NaN));
  assert.ok(motionPrompt('x'.repeat(6000), true).length <= 1000);
  assert.match(motionPrompt('Le robot marche.'), /Le robot marche/);
});

async function fixture(t, seconds = 12) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'continuous-test-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const audio = path.join(root, 'audio.mp3');
  await runFfmpeg(ffmpeg, ['-y', '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=24000', '-t', String(seconds), audio]);
  const storage = new Map(), requests = [], tasks = new Map();
  let audioCalls = 0, interrupt = false;
  const state = {};
  const options = {
    state, saveState: async () => {}, ffmpeg, dir: path.join(root, 'work'),
    image: 'https://example.invalid/image.png', text: 'Un robot marche.', model: 'gen4_turbo',
    files: {
      exists: async name => storage.has(name),
      put: async (name, file) => storage.set(name, await fs.readFile(file)),
      get: async (name, file) => fs.writeFile(file, storage.get(name)),
    },
    createAudio: async () => { audioCalls++; return fs.readFile(audio); },
    runway: {
      uploads: { createEphemeral: async params => {
        assert.ok(params.file instanceof File, 'Le SDK attend { file }, pas directement un File');
        return { uri: 'runway://frame' };
      } },
      imageToVideo: { create: async request => {
        requests.push(request);
        const id = String(requests.length);
        const video = path.join(root, `generated-${id}.mp4`);
        await runFfmpeg(ffmpeg, ['-y', '-f', 'lavfi', '-i', 'testsrc2=size=160x96:rate=24',
          '-t', String(request.duration), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', video]);
        tasks.set(id, video);
        return { id };
      } },
      tasks: { retrieve: async id => {
        if (interrupt) { interrupt = false; throw new Error('temporary connection loss'); }
        return { status: 'SUCCEEDED', output: [tasks.get(id)] };
      } },
    },
    download: (source, destination) => fs.copyFile(source, destination),
  };
  return { options, requests, storage, state, getAudioCalls: () => audioCalls,
    interrupt: () => { interrupt = true; } };
}

test('12 s de narration : clips 10 + 5, audio complet, reprise sans nouvelle facturation', async t => {
  const f = await fixture(t);
  const result = await continuousScene(f.options);
  assert.deepEqual(f.requests.map(r => r.duration), [10, 5]);
  assert.equal(f.requests[1].promptImage, 'runway://frame');
  assert.ok(Math.abs(await mediaDuration(ffmpeg, result) - 12) < 0.15);
  const log = await runFfmpeg(ffmpeg, ['-i', result, '-map', '0:a:0', '-f', 'null', '-']);
  assert.match(log, /Audio:/);
  const motion = await runFfmpeg(ffmpeg, ['-i', result, '-vf', 'freezedetect=n=-50dB:d=1', '-an', '-f', 'null', '-']);
  assert.doesNotMatch(motion, /freeze_start/);
  await continuousScene(f.options);
  assert.equal(f.requests.length, 2);
  assert.equal(f.getAudioCalls(), 1);
});

test('tâche déjà soumise : reprise après perte réseau sans nouveau clip payant', async t => {
  const f = await fixture(t, 3);
  f.interrupt();
  await assert.rejects(continuousScene(f.options), /connection loss/);
  assert.equal(f.state.clips[0].taskId, '1');
  await continuousScene(f.options);
  assert.equal(f.requests.length, 1);
  assert.equal(f.getAudioCalls(), 1);
});

test('réponse de création perdue : ne pas soumettre automatiquement une seconde tâche', async t => {
  const f = await fixture(t, 3);
  f.options.runway.imageToVideo.create = async () => { throw new Error('ambiguous timeout'); };
  await assert.rejects(continuousScene(f.options), /ambiguous timeout/);
  assert.equal(f.state.clips[0].submitting, true);
  await assert.rejects(continuousScene(f.options), /Envoi Runway incertain/);
});

test('narration trop longue : aucun appel vidéo payant', async t => {
  const f = await fixture(t, 121);
  await assert.rejects(continuousScene(f.options), /120 secondes/);
  assert.equal(f.requests.length, 0);
});

test('un échec définitif Runway expose un code de remboursement et conserve le diagnostic', async t => {
  const f = await fixture(t, 3);
  f.options.runway.tasks.retrieve = async () => ({ status: 'FAILED', failureCode: 'INTERNAL.BAD_OUTPUT.CODE01' });
  await assert.rejects(continuousScene(f.options), error => {
    assert.equal(error.code, 'RUNWAY_TASK_FAILED');
    assert.equal(error.failureCode, 'INTERNAL.BAD_OUTPUT.CODE01');
    assert.equal(error.taskId, '1');
    return true;
  });
  assert.equal(f.state.clips[0].failed, true);
  assert.equal(f.requests.length, 1);
});

test('une continuation traverse le vrai SDK upload (HTTP simulé), sans undefined', async t => {
  const f = await fixture(t);
  const calls = [];
  const client = new RunwayML({ apiKey: 'test-only', maxRetries: 0, fetch: async (url, options) => {
    calls.push(String(url));
    if (String(url).endsWith('/v1/uploads')) {
      assert.equal(JSON.parse(options.body).filename, 'frame.png');
      return new Response(JSON.stringify({ uploadUrl: 'https://storage.example.invalid/upload', fields: {}, runwayUri: 'runway://frame' }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    assert.equal(String(url), 'https://storage.example.invalid/upload');
    assert.ok(options.body.get('file').size > 0);
    return new Response(null, { status: 204 });
  } });
  f.options.runway.uploads = client.uploads;
  await continuousScene(f.options);
  assert.equal(calls.length, 2);
  assert.equal(f.requests[1].promptImage, 'runway://frame');
});
