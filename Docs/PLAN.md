# StudySync - Backend Plan v1

This document outlines the initial backend architecture for the StudySync project, including the data model for users and the foundational security rules.

## User Data Model (v2)

This is the proposed structure for storing user information in our Firestore database. By separating `privateProfile`, we can apply stricter security rules to sensitive information.json

```json
// In a collection called "users"
{
  "uid": "auto_generated_by_firebase_auth",
  "email": "user@example.com",
  "displayName": "User Name",
  "createdAt": "timestamp",
  "courses":,
  "privateProfile": {
    "phoneNumber": "555-123-4567", // Optional
    // MODIFIED: This is now a map, allowing users to add any social media they want.
    "linkedSocials": {
      "discord": "username",
      "instagram": "@username",
      "snapchat": "snap_user"
    }
  }
}
```

## Sessions Data Model

This collection will store all user-created study sessions.json

```json
// In a collection called "sessions"
{
  "sessionId": "auto_generated_id",
  "creatorId": "uid_of_the_user_who_created_it",
  "creatorName": "John D.",
  "course": "CS 124",
  "topic": "Midterm 1 Prep",
  // Location is split for better querying and detail.
  "locationName": "Main Library",
  "locationDetails": "Orange Room, Study Room 12", // Optional field for specifics
  "locationCoords": {
    "latitude": 40.1043,
    "longitude": -88.2272
  },
  "startTime": "timestamp",
  "endTime": "timestamp", // This field is optional (can be null).
  "capacity": 6,
  "attendees": [
    "uid_of_attendee_1",
    "uid_of_attendee_2"
  ],
  "isFull": false,
  "createdAt": "timestamp"
}
```

## Locations & Ratings Data Models

To handle crowdsourced ratings for study spots, we will use two related collections.

```json
// In a collection called "locations"
{
  "locationId": "auto_generated_id_or_google_places_id",
  "name": "Siebel Center for CS, Room 2406",
  "ratingCount": 25,
  "averageRating": 4.5
}
```

```json
// In a collection called "ratings"
{
  "ratingId": "auto_generated_id",
  "locationId": "id_of_the_location_being_rated",
  "userId": "uid_of_the_user_giving_the_rating",
  "sessionId": "id_of_the_session_where_rating_occurred",
  "rating": 5,
  "comment": "Great spot, very quiet.",
  "createdAt": "timestamp"
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
      allow create: if request.auth != null;
    }
  }
}
```