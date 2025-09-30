Plan file. Can also be a PDF or something else. Just make sure to name PLAN with all caps

StudySync - Backend Plan v1
User Data Model
This is the proposed structure for storing user information in our Firestore database.json
// In a collection called "users"
// Each document's ID will be the user's unique Firebase Auth UID
{
"uid": "auto_generated_by_firebase_auth",
"email": "user@example.com",
"displayName": "Habib",
"createdAt": "timestamp",
"courses":,
// Sub-collection for private, sensitive info
"privateProfile": {
"phoneNumber": "555-123-4567", // optional
"linkedSocials": {
"discord": "habib#1234" // optional
}
}
}

## Initial Security Rules

These are the initial security rules to ensure user data is private by default.

```javascript
// These rules are written in Firebase's security rule language
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // This rule applies to the "users" collection
    match /users/{userId} {
      // A user can only read or update their own document.
      // This is the key to our privacy.
      allow read, update: if request.auth.uid == userId;

      // Any authenticated user can create their own profile document during sign-up.
      allow create: if request.auth!= null;
    }
  }
}