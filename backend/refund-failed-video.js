// Run in the Render shell. Default is a read-only preview; --apply restores ONE app credit.
import 'dotenv/config';
import fs from 'node:fs';
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import RunwayML from '@runwayml/sdk';

const taskId = process.argv.find(arg => arg.startsWith('--task='))?.slice(7);
if (!taskId || !/^[a-f0-9-]{36}$/.test(taskId)) throw new Error('Usage: node backend/refund-failed-video.js --task=UUID [--apply]');
initializeApp({ credential: cert(JSON.parse(fs.readFileSync('/etc/secrets/firebase-service-account.json', 'utf8'))), projectId: 'contemagiqueia' });
const db = getFirestore();
const runway = new RunwayML({ apiKey: process.env.RUNWAY_API_KEY, maxRetries: 0 });
const task = await runway.tasks.retrieve(taskId);
if (!['FAILED', 'CANCELED', 'CANCELLED'].includes(task.status)) throw new Error('La tâche n’est pas en échec définitif. Aucun crédit modifié.');
const pending = await db.collection('videoGenerations').where('status', '==', 'partial').limit(200).get();
let found = false;
for (const snapshot of pending.docs) {
  const scenes = await snapshot.ref.collection('continuousScenes').get();
  const clips = scenes.docs.flatMap(scene => scene.data().clips || []);
  if (!clips.some(clip => clip.taskId === taskId)) continue;
  found = true;
  const data = snapshot.data();
  if (data.leaseUntil > Date.now()) throw new Error('Génération encore verrouillée. Aucun crédit modifié.');
  for (const clip of clips) {
    if (clip.submitting) throw new Error('Soumission incertaine : vérification manuelle nécessaire.');
    if (!clip.taskId || clip.taskId === taskId) continue;
    const other = await runway.tasks.retrieve(clip.taskId);
    if (!['SUCCEEDED', 'FAILED', 'CANCELED', 'CANCELLED'].includes(other.status)) throw new Error('Une autre tâche est encore en cours. Aucun crédit modifié.');
  }
  console.log(JSON.stringify({ generationId: snapshot.id, videoType: data.videoType, taskStatus: task.status, failureCode: task.failureCode, action: process.argv.includes('--apply') ? 'remboursement demandé' : 'aperçu : 1 crédit à restituer' }));
  if (!process.argv.includes('--apply')) break;
  await db.runTransaction(async transaction => {
    const current = await transaction.get(snapshot.ref);
    const value = current.data();
    if (value?.status !== 'partial') throw new Error('Statut modifié ou crédit déjà restitué.');
    if (value.leaseUntil > Date.now() || value.leaseOwner !== data.leaseOwner) throw new Error('La génération a repris. Aucun crédit modifié.');
    if (!['short', 'medium'].includes(value.videoType)) throw new Error('Type de crédit invalide.');
    const user = db.collection('users').doc(value.uid);
    const userSnapshot = await transaction.get(user);
    if (!(userSnapshot.data()?.videoCredits?.[value.videoType]?.reserved >= 1)) throw new Error('Aucun crédit réservé à restituer.');
    transaction.update(user, { [`videoCredits.${value.videoType}.remaining`]: FieldValue.increment(1), [`videoCredits.${value.videoType}.reserved`]: FieldValue.increment(-1) });
    transaction.update(snapshot.ref, { status: 'refunded', refundedAt: FieldValue.serverTimestamp(), failedTaskId: taskId, failureCode: task.failureCode || task.status });
  });
  console.log('Un crédit dessin animé a été restitué. Aucun nouvel appel de génération.');
  break;
}
if (!found) console.log('Aucune génération partielle correspondante trouvée parmi les 200 premières. Aucun crédit modifié.');
