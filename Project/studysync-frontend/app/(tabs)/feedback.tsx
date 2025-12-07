/* AI-ASSISTED: Feedback History Screen
   Source/Tool: Claude Code
   Author/Reviewer: Arsh
   Date: 2025-12-05
   Why AI: Display user's past feedback submissions with session details.
   Purpose: Allow users to view their own feedback history (privacy-focused design) */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// FIREBASE IMPORTS
import { FIREBASE_APP } from '../../firebaseConfig';
import {
  getFirestore,
  collection,
  onSnapshot,
  query,
  where,
  Timestamp,
  DocumentData,
} from 'firebase/firestore';

// CONTEXT
import { useAuth } from '../contexts/AuthContext';

// INTERFACES
interface FeedbackItem {
  id: string;
  sessionId: string;
  locationName: string;
  rating: number;           // 1-5 stars
  comment?: string;         // Optional comment
  createdAt: Date;
}

const FeedbackHistoryScreen = () => {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  /* LOGIC: Load user's feedback from Firestore
     FILTER 1: Query "feedbacks" collection where userId matches current user
     FILTER 2: Sort by createdAt descending (newest first) */
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const db = getFirestore(FIREBASE_APP);
      const feedbackCollectionRef = collection(db, 'feedbacks');

      // Query only this user's feedback
      const q = query(feedbackCollectionRef, where('userId', '==', user.uid));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const feedbackList: FeedbackItem[] = snapshot.docs
          .map(doc => {
            const data = doc.data() as DocumentData;
            const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date();

            return {
              id: doc.id,
              sessionId: data.sessionId || 'N/A',
              locationName: data.locationName || 'Unknown Location',
              rating: data.rating || 0,
              comment: data.comment,
              createdAt,
            };
          })
          // Sort by date (newest first)
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        setFeedbacks(feedbackList);
        setLoading(false);
      }, (e) => {
        console.error('Firestore Error:', e);
        setError('Failed to load feedback.');
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (e) {
      console.error('Firebase Connection Error:', e);
      setError('Failed to connect to Firebase.');
      setLoading(false);
    }
  }, [user]);

  // Format date for display (e.g., "Nov 5, 2025")
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Render star rating display (filled/outline stars based on rating)
  const renderStars = (rating: number) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= rating ? 'star' : 'star-outline'}
            size={20}
            color={star <= rating ? '#F59E0B' : '#D1D5DB'}
            style={{ marginRight: 4 }}
          />
        ))}
      </View>
    );
  };

  // RENDER LOGIC
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading your feedback...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="warning-outline" size={32} color="#EF4444" />
          <Text style={styles.errorText}>Error: {error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Feedback</Text>
        <Text style={styles.headerSubtitle}>Your past session reviews</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={true}>
        {feedbacks.length > 0 ? (
          feedbacks.map(feedback => (
            <View key={feedback.id} style={styles.feedbackCard}>
              {/* Location name and date */}
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.locationName}>{feedback.locationName}</Text>
                  <Text style={styles.dateText}>{formatDate(feedback.createdAt)}</Text>
                </View>
              </View>

              {/* Star rating */}
              <View style={styles.ratingRow}>
                <Text style={styles.ratingLabel}>Your Rating:</Text>
                {renderStars(feedback.rating)}
              </View>

              {/* Optional comment */}
              {feedback.comment && (
                <View style={styles.commentSection}>
                  <Text style={styles.commentLabel}>Your Comment:</Text>
                  <Text style={styles.commentText}>{feedback.comment}</Text>
                </View>
              )}
            </View>
          ))
        ) : (
          <View style={styles.emptyStateContainer}>
            <Ionicons name="chatbox-outline" size={48} color="#9CA3AF" />
            <Text style={styles.emptyStateText}>No Feedback Yet</Text>
            <Text style={styles.emptyStateSubText}>
              After attending a session, you'll be prompted to rate the location.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default FeedbackHistoryScreen;

// STYLES
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#3B82F6',
  },
  errorText: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: '600',
    color: '#EF4444',
    textAlign: 'center',
  },
  feedbackCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  locationName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 14,
    color: '#6B7280',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  ratingLabel: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '600',
    marginRight: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentSection: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  commentLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 6,
  },
  commentText: {
    fontSize: 15,
    color: '#1F2937',
    lineHeight: 22,
  },
  emptyStateContainer: {
    marginTop: 60,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4B5563',
    marginTop: 16,
  },
  emptyStateSubText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
