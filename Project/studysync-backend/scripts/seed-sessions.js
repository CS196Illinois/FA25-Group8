/* Seed sample sessions into Firestore using firebase-admin */
const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require(path.join(__dirname, '..', 'serviceAccountKey.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function seed() {
  const sessions = [
    {
      creatorId: 'seed-user',
      creatorName: 'StudySync Bot',
      course: 'CS 173',
      topic: 'Induction Practice',
      locationName: 'Siebel 1404',
      locationDetails: 'Back row',
      locationCoords: { latitude: 40.1138, longitude: -88.2249 },
      startTime: admin.firestore.Timestamp.fromDate(new Date('2025-10-21T23:00:00Z')),
      endTime: admin.firestore.Timestamp.fromDate(new Date('2025-10-22T00:15:00Z')),
      signupPolicy: 'preferred',
      capacity: 15,
      attendees: [],
      isFull: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    {
      creatorId: 'seed-user',
      creatorName: 'StudySync Bot',
      course: 'CS 374',
      topic: 'Graphs + Cuts Review',
      locationName: 'Grainger 100',
      locationDetails: '1st floor study area',
      locationCoords: { latitude: 40.1120, longitude: -88.2263 },
      startTime: admin.firestore.Timestamp.fromDate(new Date('2025-10-22T22:30:00Z')),
      endTime: admin.firestore.Timestamp.fromDate(new Date('2025-10-23T00:00:00Z')),
      signupPolicy: 'required',
      capacity: 12,
      attendees: [],
      isFull: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    {
      creatorId: 'seed-user',
      creatorName: 'StudySync Bot',
      course: 'MATH 241',
      topic: 'Triple Integrals',
      locationName: 'Altgeld 314',
      locationCoords: { latitude: 40.1091, longitude: -88.2273 },
      startTime: admin.firestore.Timestamp.fromDate(new Date('2025-10-23T20:00:00Z')),
      endTime: null,
      signupPolicy: 'open',
      attendees: [],
      isFull: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    },
  ];

  const batch = db.batch();
  const col = db.collection('sessions');
  sessions.forEach((s) => {
    const ref = col.doc(); // auto-id
    batch.set(ref, s);
  });
  await batch.commit();
  console.log(`Seeded ${sessions.length} sessions.`);
}

seed().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});