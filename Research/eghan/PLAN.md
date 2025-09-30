# StudySync - Backend Plan v1

This document outlines the initial backend architecture for the StudySync project, including the data model for users and the foundational security rules.

## User Data Model

This is the proposed structure for storing user information in our Firestore database. By separating `privateProfile`, we can apply stricter security rules to sensitive information.

```json
// In a collection called "users"
// Each document's ID will be the user's unique Firebase Auth UID
{
  "uid": "auto_generated_by_firebase_auth",
  "email": "user@example.com",
  "displayName": "User Name",
  "createdAt": "timestamp",
  "courses":,
  "privateProfile": {
    "phoneNumber": "555-123-4567",
    "linkedSocials": {
      "discord": "username"
    }
  }
}
```

## Initial Security Rules

These are the initial security rules for the `users` collection. They enforce a "content-owner only" policy, meaning a user can only read or write their own data, ensuring privacy by default.

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
```