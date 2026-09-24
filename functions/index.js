const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');

initializeApp();
const db = getFirestore();

exports.createMember = onCall(async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in as an admin first.');
  const caller = await db.doc(`users/${request.auth.uid}`).get();
  if (!caller.exists || caller.data().role !== 'admin') throw new HttpsError('permission-denied', 'Only admins can add members.');
  const { email, password, name, address, phone, planId, planName, durationDays, startDate, amount, method } = request.data;
  if (!email || !password || !name || !address || !phone || !planId || !planName || !durationDays || !startDate) throw new HttpsError('invalid-argument', 'Missing member details.');
  const user = await getAuth().createUser({ email, password, displayName: name });
  const start = new Date(`${startDate}T00:00:00`);
  start.setDate(start.getDate() + Number(durationDays));
  const batch = db.batch();
  batch.set(db.doc(`users/${user.uid}`), { uid: user.uid, name, address, phone, role: 'member', joinDate: Timestamp.fromDate(new Date(`${startDate}T00:00:00`)) });
  batch.set(db.collection('memberships').doc(), { userId: user.uid, planId, plan: planName, startDate: Timestamp.fromDate(new Date(`${startDate}T00:00:00`)), expiryDate: Timestamp.fromDate(start), status: 'active' });
  batch.create(db.collection('payments').doc(), { userId: user.uid, amount: Number(amount || 0), date: Timestamp.now(), method: method || 'Pending', planName });
  await batch.commit();
  return { uid: user.uid };
});
