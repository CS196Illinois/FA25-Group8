const express = require('express');
const admin = require('firebase-admin');

// Path to your service account key
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const app = express();
const port = 3000;

// A test endpoint to make sure everything is working
app.get('/', (req, res) => {
  res.send('Hello from the StudySync Backend!');
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});