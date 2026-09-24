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
  const { email, password, name, phone, plan, startDate, amount, method } = request.data;
  if (!email || !password || !name || !phone || !plan || !startDate) throw new HttpsError('invalid-argument', 'Missing member details.');
  const user = await getAuth().createUser({ email, password, displayName: name });
  const start = new Date(`${startDate}T00:00:00`);
  const duration = { '1 Month': 30, '3 Months': 90, '6 Months': 180, '1 Year': 365 }[plan];
  start.setDate(start.getDate() + duration);
  const batch = db.batch();
  batch.set(db.doc(`users/${user.uid}`), { uid: user.uid, name, phone, role: 'member', joinDate: Timestamp.fromDate(new Date(`${startDate}T00:00:00`)) });
  batch.set(db.doc(`memberships/${user.uid}`), { userId: user.uid, plan, startDate: Timestamp.fromDate(new Date(`${startDate}T00:00:00`)), expiryDate: Timestamp.fromDate(start), status: 'active' });
  if (amount) batch.create(db.collection('payments').doc(), { userId: user.uid, amount: Number(amount), date: Timestamp.now(), method: method || 'Cash' });
  await batch.commit();
  return { uid: user.uid };
});
