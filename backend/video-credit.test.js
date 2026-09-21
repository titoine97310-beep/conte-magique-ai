import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Exercise the real reservation function without starting the HTTP server or cloud SDKs.
const server = fs.readFileSync(new URL('../server.js', import.meta.url), 'utf8');
const source = server.slice(server.indexOf('async function reserveVideoCredit('), server.indexOf('async function refundVideoCredit('));
function fixture() {
  const records = new Map([['users/alice', { videoCredits: { short: { remaining: 1 } } }]]);
  const updates = [];
  const adminDb = {
    collection: name => ({ doc: id => ({ id: id || 'random', key: `${name}/${id || 'random'}` }) }),
    runTransaction: async fn => fn({
      get: async ref => ({ exists: records.has(ref.key), data: () => records.get(ref.key) }),
      set: (ref, value) => records.set(ref.key, value),
      update: (ref, value) => updates.push({ key: ref.key, value }),
    }),
  };
  const context = vm.createContext({ adminDb, FieldValue: { increment: value => value, serverTimestamp: () => 123 } });
  vm.runInContext(source + '\nthis.reserve = reserveVideoCredit;', context);
  return { reserve: context.reserve, records, updates };
}
test('la même demande ne réserve qu’un crédit après une perte de réponse', async () => {
  const f = fixture();
  const first = await f.reserve('alice', 4, 'images', 'gen4_turbo', 'request-1', 'narration');
  const second = await f.reserve('alice', 4, 'images', 'gen4_turbo', 'request-1', 'narration');
  assert.equal(first.id, second.id);
  assert.equal(f.updates.length, 1);
  assert.equal(f.updates[0].value['videoCredits.short.remaining'], -1);
});
test('un identifiant réutilisé pour une autre narration est refusé sans débit', async () => {
  const f = fixture();
  await f.reserve('alice', 4, 'images', 'gen4_turbo', 'request-1', 'narration');
  await assert.rejects(f.reserve('alice', 4, 'images', 'gen4_turbo', 'request-1', 'changed'), /ne correspond pas/);
  assert.equal(f.updates.length, 1);
});
test('une demande sans crédit ne crée pas de génération', async () => {
  const f = fixture();
  f.records.set('users/alice', { videoCredits: { short: { remaining: 0 } } });
  await assert.rejects(f.reserve('alice', 4, 'images', 'gen4_turbo', 'request-1', 'narration'), { code: 'NO_VIDEO_CREDIT' });
  assert.equal(f.updates.length, 0);
  assert.equal(f.records.has('videoGenerations/request-1'), false);
});
