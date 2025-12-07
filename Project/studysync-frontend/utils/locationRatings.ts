/* AI-ASSISTED
   Source/Tool: GitHub Copilot (Chat)
   Author/Reviewer: Elias Ghanayem
   Date: 2025-12-07
   Why AI: Utility functions for location rating operations and ID generation.
   Notes: Uses Google Place ID when available, falls back to coordinate hash. */

import { getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { FIREBASE_APP } from '../firebaseConfig';

export interface LocationCoords {
  latitude: number;
  longitude: number;
}

export interface UserRating {
  userId: string;
  userName: string;
  rating: number;
  reviewText?: string;
  timestamp: Date;
  lastSessionId: string;
}

export interface LocationRating {
  locationId: string;
  locationName: string;
  locationCoords: LocationCoords;
  placeId?: string;
  ratings: UserRating[];
  averageRating: number;
  totalRatings: number;
}

// Generate location ID from place ID or coordinates
export const generateLocationId = (placeId?: string, name?: string, coords?: LocationCoords): string => {
  if (placeId) {
    return `place_${placeId}`;
  }
  if (coords && name) {
    const lat = coords.latitude.toFixed(4);
    const lng = coords.longitude.toFixed(4);
    const normalizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    return `loc_${normalizedName}_${lat}_${lng}`;
  }
  throw new Error('Either placeId or name+coords must be provided');
};

// Get or create location rating document
export const getLocationRating = async (locationId: string): Promise<LocationRating | null> => {
  const db = getFirestore(FIREBASE_APP);
  const docRef = doc(db, 'locationRatings', locationId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      locationId,
      locationName: data.locationName,
      locationCoords: data.locationCoords,
      placeId: data.placeId,
      ratings: data.ratings || [],
      averageRating: data.averageRating || 0,
      totalRatings: data.totalRatings || 0,
    };
  }
  
  return null;
};

// Add or update user rating for a location
export const addOrUpdateRating = async (
  locationId: string,
  locationName: string,
  locationCoords: LocationCoords,
  userId: string,
  userName: string,
  rating: number,
  reviewText: string,
  sessionId: string,
  placeId?: string
): Promise<void> => {
  const db = getFirestore(FIREBASE_APP);
  const docRef = doc(db, 'locationRatings', locationId);
  const docSnap = await getDoc(docRef);

  const newRating: UserRating = {
    userId,
    userName,
    rating,
    reviewText,
    timestamp: new Date(),
    lastSessionId: sessionId,
  };

  if (docSnap.exists()) {
    // Document exists, update existing rating or add new one
    const data = docSnap.data();
    const existingRatings: UserRating[] = data.ratings || [];
    const userRatingIndex = existingRatings.findIndex(r => r.userId === userId);

    let updatedRatings: UserRating[];
    if (userRatingIndex >= 0) {
      // Update existing rating
      updatedRatings = [...existingRatings];
      updatedRatings[userRatingIndex] = newRating;
    } else {
      // Add new rating
      updatedRatings = [...existingRatings, newRating];
    }

    // Recalculate average
    const totalRatings = updatedRatings.length;
    const sumRatings = updatedRatings.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = totalRatings > 0 ? sumRatings / totalRatings : 0;

    await updateDoc(docRef, {
      ratings: updatedRatings,
      averageRating: parseFloat(averageRating.toFixed(2)),
      totalRatings,
    });
  } else {
    // Create new document
    await setDoc(docRef, {
      locationId,
      locationName,
      locationCoords,
      placeId: placeId || null,
      ratings: [newRating],
      averageRating: rating,
      totalRatings: 1,
    });
  }
};

// Get top N rated locations
export const getTopRatedLocations = async (limitCount: number = 10): Promise<LocationRating[]> => {
  const db = getFirestore(FIREBASE_APP);
  const ratingsRef = collection(db, 'locationRatings');
  const q = query(ratingsRef, orderBy('averageRating', 'desc'), limit(limitCount));
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      locationId: doc.id,
      locationName: data.locationName,
      locationCoords: data.locationCoords,
      placeId: data.placeId,
      ratings: data.ratings || [],
      averageRating: data.averageRating || 0,
      totalRatings: data.totalRatings || 0,
    };
  });
};

// Check if user has rated a location after a specific session
export const canUserRateLocation = async (
  locationId: string,
  userId: string,
  currentSessionId: string
): Promise<boolean> => {
  const locationRating = await getLocationRating(locationId);
  
  if (!locationRating) {
    // No ratings yet, user can rate
    return true;
  }
  
  const userRating = locationRating.ratings.find(r => r.userId === userId);
  
  if (!userRating) {
    // User hasn't rated yet
    return true;
  }
  
  // User can rate again if this is a different session
  return userRating.lastSessionId !== currentSessionId;
};