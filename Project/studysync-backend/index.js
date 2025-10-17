const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const app = express();
const port = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());

// Path to your service account key
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// A test endpoint to make sure everything is working
app.get('/', (req, res) => {
  res.send('Hello from the StudySync Backend!');
});

app.get('/health', (req, res) => {
  res.status(200).send({status: 'OK'});
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

const sessions = [
  {
    id: 's1',
    title: 'Math Study Group',
    description: 'A study group for math enthusiasts.',
    course: "MATH 221",
    location: "Main Library, Orange Room 12",
    startsAt: "2025-10-23T17:00:00Z",
    endsAt: "2025-10-23T18:00:00Z",
    capacity: 5,
    attendees: 2,
    host: "Adam"
  },
  {
    id: 's2',
    title: 'CWL 114 Midterm Prep',
    description: 'Go over texts like Ibn Battuta\'s travels and The Moor\'s Account.',
    course: "CWL 114",
    location: "Siebel Center for CS, Room 4502",
    startsAt: "2025-10-24T10:00:00Z",
    endsAt: "2025-10-24T12:00:00Z",
    capacity: 4,
    attendees: 3,
    host: "Beth"
  },
  {
    id: 's3',
    title: 'Quiz 9 Prep Session',
    description: 'Prepare for Quiz 9 with practice exams and group study.',
    course: "CS 124",
    location: "Grainger Library, Basement",
    startsAt: "2025-10-25T15:00:00Z",
    endsAt: "2025-10-25T17:00:00Z",
    capacity: 6,
    attendees: 4,
    host: "Charlie"
  },
];

app.get('/sessions', (req, res) => {
  res.status(200).json({sessions});
});