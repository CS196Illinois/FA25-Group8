/* AI-ASSISTED
   Source/Tool: GitHub Copilot (Chat)
   Author/Reviewer: Elias Ghanayem
   Date: 2025-12-05
   Why AI: Build comprehensive profile screen with session history, stats, and credential updates.
   Notes: Validated Firestore queries for created/joined/past sessions, tested update email/password flows. */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Platform,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'expo-router';
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { FIREBASE_APP, FIREBASE_AUTH } from '../../firebaseConfig';
import { updateEmail, updatePassword } from 'firebase/auth';

// Redefine interfaces locally to avoid circular dependencies
interface LocationCoords {
  latitude: number;
  longitude: number;
}

interface StudySession {
  id: string;
  creatorId: string;
  creatorName: string;
  course: string;
  topic: string;
  locationName: string;
  locationDetails?: string;
  locationCoords: LocationCoords;
  startTime: Date;
  endTime?: Date | null;
  signupPolicy: 'required' | 'preferred' | 'open';
  capacity?: number;
  attendees: string[];
  isFull: boolean;
  createdAt: Date;
}

type SectionType = 'All' | 'Created' | 'Joined' | 'Past';

export default function ProfileScreen() {
  const { user, logOut } = useAuth();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<SectionType>('All');
  const [createdSessions, setCreatedSessions] = useState<StudySession[]>([]);
  const [joinedSessions, setJoinedSessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Fetch sessions created by user
  useEffect(() => {
    if (!user) return;

    const db = getFirestore(FIREBASE_APP);
    const sessionsRef = collection(db, 'sessions');
    const q = query(sessionsRef, where('creatorId', '==', user.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sessions: StudySession[] = snapshot.docs.map(doc => {
        const data = doc.data();
        const startTime = data.startTime instanceof Timestamp ? data.startTime.toDate() : new Date();
        const endTime = data.endTime instanceof Timestamp ? data.endTime.toDate() : null;
        const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date();

        return {
          id: doc.id,
          creatorId: data.creatorId,
          creatorName: data.creatorName,
          course: data.course,
          topic: data.topic,
          locationName: data.locationName,
          locationDetails: data.locationDetails,
          locationCoords: data.locationCoords,
          startTime,
          endTime,
          signupPolicy: data.signupPolicy,
          capacity: data.capacity,
          attendees: data.attendees || [],
          isFull: data.isFull || false,
          createdAt,
        };
      });

      setCreatedSessions(sessions.sort((a, b) => b.startTime.getTime() - a.startTime.getTime()));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Fetch sessions joined by user
  useEffect(() => {
    if (!user) return;

    const db = getFirestore(FIREBASE_APP);
    const sessionsRef = collection(db, 'sessions');
    const q = query(sessionsRef, where('attendees', 'array-contains', user.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sessions: StudySession[] = snapshot.docs.map(doc => {
        const data = doc.data();
        const startTime = data.startTime instanceof Timestamp ? data.startTime.toDate() : new Date();
        const endTime = data.endTime instanceof Timestamp ? data.endTime.toDate() : null;
        const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date();

        return {
          id: doc.id,
          creatorId: data.creatorId,
          creatorName: data.creatorName,
          course: data.course,
          topic: data.topic,
          locationName: data.locationName,
          locationDetails: data.locationDetails,
          locationCoords: data.locationCoords,
          startTime,
          endTime,
          signupPolicy: data.signupPolicy,
          capacity: data.capacity,
          attendees: data.attendees || [],
          isFull: data.isFull || false,
          createdAt,
        };
      });

      setJoinedSessions(sessions.sort((a, b) => b.startTime.getTime() - a.startTime.getTime()));
    });

    return () => unsubscribe();
  }, [user]);

  // Compute derived session lists
  const allSessions = React.useMemo(() => {
    // Deduplicate by id (using Map)
    const sessionMap = new Map<string, StudySession>();
    [...createdSessions, ...joinedSessions].forEach(s => sessionMap.set(s.id, s));
    return Array.from(sessionMap.values()).sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }, [createdSessions, joinedSessions]);

  const pastSessions = React.useMemo(() => {
    const now = Date.now();
    return allSessions.filter(s => {
      if (s.endTime) {
        return s.endTime.getTime() < now;
      }
      // If no endTime, consider past if startTime + 12 hours < now
      return s.startTime.getTime() + 12 * 60 * 60 * 1000 < now;
    });
  }, [allSessions]);

  // Get sessions for current section
  const currentSessions = React.useMemo(() => {
    switch (activeSection) {
      case 'All':
        return allSessions;
      case 'Created':
        return createdSessions;
      case 'Joined':
        return joinedSessions;
      case 'Past':
        return pastSessions;
      default:
        return [];
    }
  }, [activeSection, allSessions, createdSessions, joinedSessions, pastSessions]);

  // Compute badges for each session in All view
  const getSessionBadges = (session: StudySession): Array<{ label: string; color: string }> => {
    const badges: Array<{ label: string; color: string }> = [];
    const now = Date.now();
    const isPast = session.endTime
      ? session.endTime.getTime() < now
      : session.startTime.getTime() + 12 * 60 * 60 * 1000 < now;

    if (session.creatorId === user?.uid) {
      badges.push({ label: 'Created', color: '#3B82F6' });
    }
    if (session.attendees.includes(user?.uid || '')) {
      badges.push({ label: 'Joined', color: '#10B981' });
    }
    if (isPast) {
      badges.push({ label: 'Past', color: '#6B7280' });
    }

    return badges;
  };

  // Extract user initials
  const getInitials = (name: string | null | undefined): string => {
    if (!name) return '';
    return name
      .split(' ')
      .map(w => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const initials = getInitials(user?.displayName);
  const creationDate = user?.metadata.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Unknown';

  // Handle logout
  const handleLogout = async () => {
    try {
      await logOut();
      router.replace('/login');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  // Handle email update
  const handleUpdateEmail = async () => {
    if (!newEmail.trim()) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      Alert.alert('Error', 'Please enter a valid email format');
      return;
    }

    try {
      if (FIREBASE_AUTH.currentUser) {
        await updateEmail(FIREBASE_AUTH.currentUser, newEmail);
        Alert.alert('Success', 'Email updated successfully');
        setShowEmailModal(false);
        setNewEmail('');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  // Handle password update
  const handleUpdatePassword = async () => {
    if (!newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert('Error', 'Please enter and confirm your new password');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    try {
      if (FIREBASE_AUTH.currentUser) {
        await updatePassword(FIREBASE_AUTH.currentUser, newPassword);
        Alert.alert('Success', 'Password updated successfully');
        setShowPasswordModal(false);
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Not logged in</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Header */}
        <View style={styles.header}>
          {/* Avatar with initials */}
          <View style={styles.avatar}>
            {initials ? (
              <Text style={styles.avatarText}>{initials}</Text>
            ) : (
              <Ionicons name="person" size={40} color="white" />
            )}
          </View>

          {/* User Info */}
          <Text style={styles.displayName}>{user.displayName || 'No Name'}</Text>
          <Text style={styles.email}>{user.email}</Text>
          <Text style={styles.uid}>UID: {user.uid}</Text>
          <Text style={styles.joinedDate}>Joined {creationDate}</Text>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: '#EFF6FF' }]}>
            <Text style={[styles.statNumber, { color: '#3B82F6' }]}>{createdSessions.length}</Text>
            <Text style={styles.statLabel}>Created</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#ECFDF5' }]}>
            <Text style={[styles.statNumber, { color: '#10B981' }]}>{joinedSessions.length}</Text>
            <Text style={styles.statLabel}>Joined</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#F3F4F6' }]}>
            <Text style={[styles.statNumber, { color: '#6B7280' }]}>{pastSessions.length}</Text>
            <Text style={styles.statLabel}>Past</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          <TouchableOpacity style={styles.actionButton} onPress={() => setShowEmailModal(true)}>
            <Ionicons name="mail-outline" size={20} color="#3B82F6" />
            <Text style={styles.actionButtonText}>Update Email</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => setShowPasswordModal(true)}>
            <Ionicons name="lock-closed-outline" size={20} color="#3B82F6" />
            <Text style={styles.actionButtonText}>Update Password</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.logoutButton]} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>Log Out</Text>
          </TouchableOpacity>
        </View>

        {/* Section Toggle Buttons */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sectionToggleContainer}
        >
          {(['All', 'Created', 'Joined', 'Past'] as SectionType[]).map(section => (
            <TouchableOpacity
              key={section}
              style={[
                styles.sectionButton,
                activeSection === section && styles.sectionButtonActive,
              ]}
              onPress={() => setActiveSection(section)}
            >
              <Text
                style={[
                  styles.sectionButtonText,
                  activeSection === section && styles.sectionButtonTextActive,
                ]}
              >
                {section}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Session List */}
        <View style={styles.sessionListContainer}>
          {currentSessions.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <Ionicons name="folder-open-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyStateText}>
                {activeSection === 'All' && 'No sessions yet. Create or join a session to get started!'}
                {activeSection === 'Created' && 'No sessions created yet'}
                {activeSection === 'Joined' && 'No sessions joined yet'}
                {activeSection === 'Past' && 'No past sessions'}
              </Text>
            </View>
          ) : (
            currentSessions.map(session => (
              <SessionCardCompact
                key={session.id}
                session={session}
                badges={activeSection === 'All' ? getSessionBadges(session) : undefined}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* Update Email Modal */}
      <Modal visible={showEmailModal} transparent animationType="slide">
        <Pressable style={styles.modalBackdrop} onPress={() => setShowEmailModal(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Email</Text>
              <TouchableOpacity onPress={() => setShowEmailModal(false)}>
                <Ionicons name="close" size={28} color="#4B5563" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder="New email address"
              placeholderTextColor="#9CA3AF"
              value={newEmail}
              onChangeText={setNewEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.submitButton} onPress={handleUpdateEmail}>
              <Text style={styles.submitButtonText}>Update Email</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Update Password Modal */}
      <Modal visible={showPasswordModal} transparent animationType="slide">
        <Pressable style={styles.modalBackdrop} onPress={() => setShowPasswordModal(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Password</Text>
              <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
                <Ionicons name="close" size={28} color="#4B5563" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder="New password (min 6 characters)"
              placeholderTextColor="#9CA3AF"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />
            <TextInput
              style={[styles.input, { marginTop: 12 }]}
              placeholder="Confirm new password"
              placeholderTextColor="#9CA3AF"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
            <TouchableOpacity style={styles.submitButton} onPress={handleUpdatePassword}>
              <Text style={styles.submitButtonText}>Update Password</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// Compact Session Card for Profile View
const SessionCardCompact: React.FC<{
  session: StudySession;
  badges?: Array<{ label: string; color: string }>;
}> = ({ session, badges }) => {
  const formatTime = (date: Date | null | undefined): string => {
    if (!date) return 'TBD';
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const formatDate = (date: Date | null | undefined): string => {
    if (!date) return 'Date TBD';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const timeStart = formatTime(session.startTime);
  const date = formatDate(session.startTime);

  return (
    <View style={styles.compactCard}>
      {/* Badges */}
      {badges && badges.length > 0 && (
        <View style={styles.badgesContainer}>
          {badges.map((badge, index) => (
            <View key={index} style={[styles.badge, { backgroundColor: badge.color }]}>
              <Text style={styles.badgeText}>{badge.label}</Text>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.compactCourse}>{session.course}</Text>
      <Text style={styles.compactTopic}>{session.topic}</Text>
      <View style={styles.compactInfo}>
        <Ionicons name="time-outline" size={16} color="#6B7280" />
        <Text style={styles.compactInfoText}>{timeStart} • {date}</Text>
      </View>
      <View style={styles.compactInfo}>
        <Ionicons name="location-outline" size={16} color="#6B7280" />
        <Text style={styles.compactInfoText}>{session.locationName}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    paddingBottom: 30,
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
    fontSize: 18,
    fontWeight: '600',
    color: '#EF4444',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  displayName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 4,
  },
  uid: {
    fontSize: 12,
    color: '#9CA3AF',
    fontFamily: Platform.select({ ios: 'Courier', android: 'monospace' }),
    marginBottom: 4,
  },
  joinedDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 6,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  actionsSection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  logoutButton: {
    borderColor: '#FEE2E2',
    backgroundColor: '#FEF2F2',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
    marginLeft: 12,
  },
  sectionToggleContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  sectionButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: 'white',
    marginRight: 8,
  },
  sectionButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  sectionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  sectionButtonTextActive: {
    color: 'white',
  },
  sessionListContainer: {
    paddingHorizontal: 16,
  },
  emptyStateContainer: {
    marginTop: 40,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
    textAlign: 'center',
  },
  compactCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    position: 'relative',
  },
  badgesContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'column',
    gap: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  compactCourse: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  compactTopic: {
    fontSize: 16,
    color: '#4B5563',
    marginBottom: 12,
  },
  compactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  compactInfoText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});