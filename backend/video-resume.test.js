import test from 'node:test';
import assert from 'node:assert/strict';
import { findLegacyResume } from './video-resume.js';
const input = { uid: 'alice', imagesHash: 'images', narrationHash: 'voice-and-text', model: 'gen4_turbo' };
const doc = (id, overrides = {}) => ({ id, data: () => ({ ...input, status: 'partial', animationVersion: 2, createdAt: { toMillis: () => 1 }, ...overrides }) });
test('ancienne application : reprend le travail identique le plus récent', () => {
  assert.equal(findLegacyResume([doc('old'), doc('latest', { createdAt: { toMillis: () => 2 } })], input), 'latest');
});
test('ne reprend pas une vidéo différente, remboursée, terminée ou appartenant à un autre compte', () => {
  for (const overrides of [{ uid: 'bob' }, { imagesHash: 'other' }, { narrationHash: 'other' }, { model: 'gen4.5' }, { status: 'refunded' }, { status: 'completed' }, { animationVersion: 1 }]) {
    assert.equal(findLegacyResume([doc('excluded', overrides)], input), null);
  }
});
