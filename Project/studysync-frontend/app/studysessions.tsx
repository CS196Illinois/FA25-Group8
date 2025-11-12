import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Linking,
  Platform,
  Modal,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Dimensions,
  Alert,
  // NOTE: Switch removed (no filter toggle in search-only UI)
} from 'react-native';
import { Ionicons } from '@expo/vector-icons'; 
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

// FIREBASE IMPORTS
import { FIREBASE_APP } from '../firebaseConfig'; 
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  collection,
  onSnapshot,
  query,
  DocumentData,
  setLogLevel,
  Timestamp,
  addDoc,
  serverTimestamp,
  doc,           // Gets a reference to a specific document
  runTransaction // Safely updates data with consistency checks
} from 'firebase/firestore';

// CONTEXT
import { useAuth } from './contexts/AuthContext';

/* ===== AI-COPILOT SNIPPET (BEGIN) =====
Source: GitHub Copilot via chat (Elias Ghanayem) on 2025-11-05
Purpose: Build a Google Calendar TEMPLATE URL that opens a prefilled event for user review before saving.
Why AI was used: To compose a standards-compliant URL quickly with clear handling of edge cases and include thorough comments so you can explain it.
Key implementation details (teach-back):
- Google Calendar accepts dates as UTC in compact form: YYYYMMDDTHHMMSSZ.
- We include host and optional location details in "details".
- If no end is provided, we set end == start (zero-duration) and add an explicit note in details ("No end time specified.").
===== AI-COPILOT SNIPPET (END) ===== */

/** Convert a Date to Google Calendar's compact UTC format: 20251020T182000Z */
const toGCalDate = (d: Date) =>
  d
    .toISOString()              // e.g., 2025-10-20T18:20:00.000Z
    .replace(/[-:]/g, '')       // -> 20251020T182000.000Z
    .replace(/\.\d{3}Z$/, 'Z'); // -> 20251020T182000Z

/** Build a Google Calendar “TEMPLATE” URL with title/details/location and start/end. */
const buildGoogleCalUrl = (s: {
  title: string;
  description?: string;
  location?: string;
  locationDetails?: string;
  start: Date;
  end?: Date | null;
}) => {
  const hasEnd = !!s.end;
  const startUtc = toGCalDate(s.start);
  const endUtc = toGCalDate(s.end ?? s.start); // zero-duration if no end

  const lines: string[] = [];
  if (s.description) lines.push(s.description);
  if (s.locationDetails) lines.push(`Location details: ${s.locationDetails}`);
  if (!hasEnd) lines.push('Note: This event has no specified end time.');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: s.title,
    details: lines.join('\n'),    // multi-line description (URL-encoded)
    location: s.location ?? '',
    dates: `${startUtc}/${endUtc}` // required start/end pair
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

// INTERFACES
interface LocationCoords {
  latitude: number;
  longitude: number;
}

// Firestore write shape for new sessions
interface StudySessionFirestore {
  creatorId: string;
  creatorName: string;
  course: string;
  topic: string;
  locationName: string;
  locationDetails?: string;
  locationCoords: LocationCoords;
  startTime: Timestamp;
  endTime?: Timestamp | null;
  signupPolicy: 'required' | 'preferred' | 'open';
  capacity?: number;
  attendees: string[];
  isFull: boolean;
  createdAt?: Timestamp;
}

// Selected location state for the creation form
interface SelectedLocation {
  name: string;
  coords: LocationCoords | null;
  details?: string;
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

// DATA & MAP UTILITIES
const formatTime = (date: Date | null | undefined): string => {
  if (!date) return 'TBD';
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
};

const formatDate = (date: Date | null | undefined): string => {
  if (!date) return 'Date TBD';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const openGoogleMaps = (coords: LocationCoords) => {
  const { latitude, longitude } = coords;
  const url = Platform.select({
    ios: `comgooglemaps://?q=${latitude},${longitude}&zoom=15`,
    android: `geo:${latitude},${longitude}?q=${latitude},${longitude}`,
    default: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
  });

  Linking.canOpenURL(url).then(supported => {
    if (supported) {
      Linking.openURL(url);
    } else {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`);
    }
  });
};

// REUSABLE COMPONENTS
const DetailRow: React.FC<{ iconName: string, label: string, value: string | number }> = ({ iconName, label, value }) => (
  <View style={styles.detailRow}>
    <Ionicons name={iconName as any} size={20} color="#3B82F6" style={styles.detailIcon} />
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue} numberOfLines={1}>{value}</Text>
  </View>
);

const MapExcerpt: React.FC<{ locationName: string, coords: LocationCoords }> = ({ locationName, coords }) => (
  <TouchableOpacity 
    style={styles.mapContainer}
    onPress={() => openGoogleMaps(coords)}
    activeOpacity={0.8}
  >
    <View style={styles.mapPlaceholder}>
      <Ionicons name="map-outline" size={32} color="#3B82F6" />
      <Text style={styles.mapText}>Tap to navigate to {locationName}</Text>
    </View>
  </TouchableOpacity>
);

/* AI-ASSISTED: SessionCard Component with Join/Leave + Calendar Integration
   Source: GitHub Copilot (Chat) + Manual Merge
   Author/Reviewer: Elias Ghanayem
   Date: 2024-11-12
   Why AI: Combined join/leave functionality (from Joining-Sessions branch) with
          Google Calendar integration (from feat/calendar-gcal-button) into one component.
   Notes: Tested join/leave state updates and calendar link generation. Verified button
          states (disabled when full, color changes when joined). */
const SessionCard: React.FC<{ 
  session: StudySession; 
  currentUserId: string | undefined; 
  onJoin: (sessionId: string) => void; 
  onLeave: (sessionId: string) => void;
}> = ({ session, currentUserId, onJoin, onLeave }) => {
  const numAttendees = session.attendees.length;
  const timeStart = formatTime(session.startTime);
  const timeEnd = formatTime(session.endTime);
  const date = formatDate(session.startTime);
  const timeRange = `${timeStart} - ${session.endTime ? timeEnd : 'Ongoing'}`;
  
  // Check if the current user has joined this session
  const isUserJoined = currentUserId ? session.attendees.includes(currentUserId) : false;
  
  const policyText = session.signupPolicy.charAt(0).toUpperCase() + session.signupPolicy.slice(1) + ' Sign-up';
  const attendeeCountText = session.capacity 
    ? `${numAttendees} / ${session.capacity} Attending` 
    : `${numAttendees} Attending`;
  
  // Badge color logic based on signup policy and capacity
  let badgeColor = '#3B82F6';
  if (session.signupPolicy === 'required') {
    badgeColor = session.isFull ? '#EF4444' : '#10B981'; 
  } else if (session.signupPolicy === 'open') {
    badgeColor = '#F59E0B'; 
  }

  /* ===== AI-COPILOT SNIPPET (BEGIN) =====
  Source: GitHub Copilot via chat (Elias Ghanayem) on 2025-11-05
  Purpose: Open a prefilled Google Calendar compose screen so the user reviews/edits before saving. No auto-add.
  Why AI was used: To wire the helper into the UI with clear accessibility labels and well-documented behavior.
  ===== AI-COPILOT SNIPPET (END) ===== */
  const handleOpenInGoogleCalendar = () => {
    const url = buildGoogleCalUrl({
      title: `${session.course} — ${session.topic}`,
      description: `Study session hosted by ${session.creatorName}`,
      location: session.locationName,
      locationDetails: session.locationDetails ?? undefined,
      start: session.startTime,
      end: session.endTime ?? null,
    });
    Linking.openURL(url);
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardCourse}>{session.course}</Text>
        <View style={[styles.badge, { backgroundColor: badgeColor }]}>
          <Text style={styles.badgeText}>{policyText}</Text>
        </View>
      </View>

      <Text style={styles.cardTopic}>{session.topic}</Text>

      <View style={styles.detailsBlock}>
        <DetailRow iconName="person-circle-outline" label="Host" value={session.creatorName} />
        <DetailRow iconName="time-outline" label="Time" value={timeRange} />
        <DetailRow iconName="calendar-outline" label="Date" value={date} />
        <DetailRow iconName="people-outline" label="Attendance" value={attendeeCountText} />
      </View>

      <View style={styles.locationBlock}>
        <DetailRow iconName="location-sharp" label="Location" value={session.locationName} />
        {session.locationDetails && (
          <Text style={styles.locationDetailsText}>• {session.locationDetails}</Text>
        )}
      </View>

      <MapExcerpt locationName={session.locationName} coords={session.locationCoords} />

      {/* Join/Leave Button - from Joining-Sessions/Profile-Page branch */}
      <TouchableOpacity
        style={[
          styles.joinButton, 
          isUserJoined && { backgroundColor: '#10B981' },  // Green when joined
          (session.isFull && !isUserJoined) && { backgroundColor: '#EF4444' }  // Red when full
        ]}
        onPress={() => isUserJoined ? onLeave(session.id) : onJoin(session.id)}
        disabled={session.isFull && !isUserJoined}
      >
        <Text style={styles.joinButtonText}>
          {isUserJoined ? 'Leave Session' : (session.isFull ? 'Session Full' : 'Join Session')}
        </Text>
      </TouchableOpacity>

      {/* Google Calendar Button - from feat/calendar-gcal-button branch */}
      <TouchableOpacity
        style={{
          marginTop: 10,
          paddingVertical: 10,
          borderWidth: 1,
          borderColor: '#D1D5DB',
          borderRadius: 6,
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 8,
          backgroundColor: '#F9FAFB',
        }}
        onPress={handleOpenInGoogleCalendar}
        accessibilityRole="button"
        accessibilityLabel="Open this session in Google Calendar to review and save"
      >
        <Ionicons name="logo-google" size={20} color="#2563EB" />
        <Text style={{ color: '#2563EB', fontWeight: '600' }}>
          Open in Google Calendar
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const EmptyState = () => (
  <View style={styles.emptyStateContainer}>
    <Ionicons name="school-outline" size={48} color="#9CA3AF" />
    <Text style={styles.emptyStateText}>No Upcoming Sessions</Text>
    <Text style={styles.emptyStateSubText}>Check back later or create a new one!</Text>
  </View>
);

/* AI-ASSISTED
   Source/Tool: GitHub Copilot (Chat)
   Author/Reviewer: <Elias Ghanayem>
   Date: 2025-11-11
   Why AI: Implement session creation UI and Firestore write flow quickly with clear validation and comments.
   Notes: Tested by creating a session and confirming it appears via onSnapshot.
*/
const MODAL_HEIGHT = Dimensions.get('window').height * 0.9;

const CreateSessionModal: React.FC<{ visible: boolean; onClose: () => void }> = ({ visible, onClose }) => {
  const { user } = useAuth();
  const [course, setCourse] = useState('');
  const [topic, setTopic] = useState('');
  const [location, setLocation] = useState<SelectedLocation | null>(null);
  const [locationDetails, setLocationDetails] = useState('');
  const [startTime, setStartTime] = useState(new Date());
  const [showDateTimePicker, setShowDateTimePicker] = useState(false);
  const [capacity, setCapacity] = useState('');
  const [signupPolicy, setSignupPolicy] = useState<'required' | 'preferred' | 'open'>('open');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [placesFailed, setPlacesFailed] = useState(false); // Fallback if Places API not available

  const onDateTimeChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDateTimePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setStartTime(selectedDate);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to create a session.');
      return;
    }
    // Accept manual location name even if coords missing (fallback when Places fails)
    if (!course.trim() || !topic.trim() || !location || !location.name.trim()) {
      Alert.alert('Missing Information', 'Please fill out Course, Topic, and Location name.');
      return;
    }

    setIsSubmitting(true);
    try {
      const db = getFirestore(FIREBASE_APP);
      const sessionsCollectionRef = collection(db, 'sessions');

      const newSession: Omit<StudySessionFirestore, 'createdAt'> = {
        creatorId: user.uid,
        creatorName: user.displayName || user.email || 'Anonymous',
        course: course.trim(),
        topic: topic.trim(),
        locationName: location.name,
        locationDetails: locationDetails.trim() || undefined,
        locationCoords: location.coords ?? { latitude: 0, longitude: 0 }, // fallback coords if Places failed
        startTime: Timestamp.fromDate(startTime),
        endTime: null,
        signupPolicy,
        capacity: capacity ? parseInt(capacity, 10) : undefined,
        attendees: [user.uid],
        isFull: false,
      };

      await addDoc(sessionsCollectionRef, {
        ...newSession,
        createdAt: serverTimestamp(),
      });
      console.log('Created session payload:', newSession);

      Alert.alert('Success!', 'Your study session has been created.');
      setIsSubmitting(false);
      onClose();
      // reset form
      setCourse('');
      setTopic('');
      setLocation(null);
      setLocationDetails('');
      setStartTime(new Date());
      setCapacity('');
    } catch (error) {
      console.error('Error creating session:', error);
      Alert.alert('Error', 'Could not create the session. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBackdrop}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={[styles.modalContent, { height: MODAL_HEIGHT }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Study Session</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close-circle" size={30} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formScrollView} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps='handled' nestedScrollEnabled>
            <Text style={styles.label}>Course</Text>
            <TextInput style={styles.input} placeholder="e.g., CS 124" value={course} onChangeText={setCourse} />

            <Text style={styles.label}>Topic</Text>
            <TextInput style={styles.input} placeholder="e.g., Midterm 1 Prep" value={topic} onChangeText={setTopic} />

            <Text style={styles.label}>Location</Text>
            <GooglePlacesAutocomplete
              placeholder="Search for a location"
              minLength={2}
              fetchDetails
              onFail={(e) => console.error('GooglePlaces error:', e)}
              onNotFound={() => console.log('No places results')}
              predefinedPlaces={[]}
              textInputProps={{
                onFocus: () => {},
                onBlur: () => {},
                returnKeyType: 'search',
                placeholderTextColor: '#9CA3AF',
                onChangeText: (text: string) => {
                  // Manual fallback so user input counts even if Places API fails
                  setLocation({ name: text, coords: location?.coords ?? null });
                }
              }}
              onPress={(data: any, details: any | null = null) => {
                // data: place summary, details: full place detail when fetchDetails=true
                const { lat, lng } = details?.geometry?.location || {};
                setLocation({
                  name: data?.description,
                  coords: lat && lng ? { latitude: lat, longitude: lng } : null,
                });
              }}
              query={{
                // TODO: Move API key to config/env and do not commit secrets
                key: 'AIzaSyCSpOvxSXhquORKm4TJQvj1tMC3KpRBm4I',
                language: 'en',
              }}
              requestUrl={{
                useOnPlatform: 'web',
                url: 'https://maps.googleapis.com/maps/api',
              }}
              styles={{ container: styles.googlePlacesContainer, textInput: styles.input, listView: styles.googlePlacesListView }}
            />
            {placesFailed && (
              <Text style={{ color: '#EF4444', marginTop: 4, fontSize: 12 }}>
                Places API unavailable; manual location name will be saved with default (0,0) coords.
              </Text>
            )}

            <Text style={styles.label}>Location Details (Optional)</Text>
            <TextInput style={styles.input} placeholder="e.g., Room 12, Main Library" value={locationDetails} onChangeText={setLocationDetails} />

            <Text style={styles.label}>Start Time</Text>
            <TouchableOpacity onPress={() => setShowDateTimePicker(true)} style={styles.dateTimePickerButton}>
              <Text style={styles.dateTimePickerText}>{`${formatDate(startTime)} at ${formatTime(startTime)}`}</Text>
            </TouchableOpacity>
            {showDateTimePicker && (
              <DateTimePicker testID="dateTimePicker" value={startTime} mode="datetime" is24Hour={false} display="default" onChange={onDateTimeChange} />
            )}

            <Text style={styles.label}>Capacity (Optional)</Text>
            <TextInput style={styles.input} placeholder="e.g., 10" value={capacity} onChangeText={setCapacity} keyboardType="number-pad" />

            <TouchableOpacity style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]} onPress={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitButtonText}>Create Session</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// MAIN COMPONENT: StudySessionsScreen
const StudySessionsScreen = () => {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  
  /* AI-ASSISTED
    Source/Tool: GitHub Copilot (Chat)
    Author/Reviewer: Elias Ghanayem
    Date: 2025-11-12
    Why AI: Implemented a simple, flexible search state and matcher quickly.
    Policy note: Comments are concise and policy-compliant (no long teaching notes). */
  const [searchText, setSearchText] = useState('');
  
  const { user, logOut } = useAuth();

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let unsubscribe: (() => void) | undefined;

    const connectToFirebase = async () => {
      try {
        const auth = getAuth(FIREBASE_APP);
        const db = getFirestore(FIREBASE_APP);
        setLogLevel('debug');
        
        const sessionsPath = "sessions";
        const sessionsCollectionRef = collection(db, sessionsPath);
        const q = query(sessionsCollectionRef);

        unsubscribe = onSnapshot(q, (snapshot) => {
          const sessionList: StudySession[] = snapshot.docs.map(doc => {
            const data = doc.data() as DocumentData;
            // Safely handle Timestamps from Firestore
            const startTime = data.startTime instanceof Timestamp ? data.startTime.toDate() : new Date();
            const endTime = data.endTime instanceof Timestamp ? data.endTime.toDate() : null;
            const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date();

            return {
              id: doc.id,
              creatorId: data.creatorId || 'N/A',
              creatorName: data.creatorName || 'Unknown',
              course: data.course || 'Unknown Course',
              topic: data.topic || 'No Topic',
              locationName: data.locationName || 'Unspecified Location',
              locationDetails: data.locationDetails,
              locationCoords: data.locationCoords || { latitude: 0, longitude: 0 },
              startTime,
              endTime,
              signupPolicy: data.signupPolicy || 'open',
              capacity: data.capacity,
              attendees: data.attendees || [],
              isFull: data.isFull || false,
              createdAt,
            };
          });
          setSessions(sessionList);
          setLoading(false);
        }, (e) => {
          console.error("Firestore Error:", e);
          setError('Failed to load study sessions.');
          setLoading(false);
        });

      } catch (e) {
        console.error("Firebase Connection Error:", e);
        setError('Failed to connect to Firebase.');
        setLoading(false);
      }
    };
        
    connectToFirebase();

    // Cleanup function to prevent memory leaks
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user]);

  /* AI-ASSISTED
     Source/Tool: GitHub Copilot (Chat)
     Author/Reviewer: Elias Ghanayem
     Date: 2025-11-12
     Why AI: Implement flexible, spacing/case-insensitive search quickly.
     Matching rule: normalize both strings (remove non-alphanumerics, uppercase) and use includes(). */
  const normalize = (s: string) => s.replace(/[^a-z0-9]/gi, '').toUpperCase();
  const getSearchedSessions = (): StudySession[] => {
    const q = normalize(searchText || '');
    if (!q) return sessions;
    return sessions.filter(s => normalize(s.course).includes(q));
  };

  /* ============ SESSION JOIN/LEAVE FUNCTIONS ============
     AI-ASSISTED
     Source/Tool: Claude + Manual Implementation
     Author/Reviewer: Aryan
     Date: 2025-11-10
     Why AI: Needed Firestore transaction logic for safe concurrent updates to attendee lists.
     Notes: Tested join/leave with multiple users simultaneously. Verified capacity limits,
            isFull flag updates, and user already-joined validation. */

  // JOIN SESSION FUNCTION
  // This function adds the current user to a study session's attendee list
  const handleJoinSession = async (sessionId: string) => {
    // Safety check: Make sure we have a logged-in user
    if (!user) {
      alert('You must be logged in to join a session');
      return;
    }

    try {
      // Get a reference to the Firestore database
      const db = getFirestore(FIREBASE_APP);
      // Get a reference to the specific session document we want to update
      const sessionRef = doc(db, 'sessions', sessionId);

      // runTransaction ensures data consistency (prevents race conditions)
      // It works like this:
      // 1. Read the current data
      // 2. Make changes based on that data
      // 3. Only save if the data hasn't changed since step 1
      await runTransaction(db, async (transaction) => {
        // Step 1: Read the current session data
        const sessionDoc = await transaction.get(sessionRef);

        // Check if the session exists
        if (!sessionDoc.exists()) {
          throw new Error('Session does not exist');
        }

        // Get the current data from the document
        const sessionData = sessionDoc.data();
        const currentAttendees = sessionData.attendees || [];
        const capacity = sessionData.capacity;

        // VALIDATION CHECKS

        // Check 1: Is the user already in this session?
        if (currentAttendees.includes(user.uid)) {
          throw new Error('You are already in this session');
        }

        // Check 2: Is the session full?
        // (Only if capacity is defined)
        if (capacity && currentAttendees.length >= capacity) {
          throw new Error('Session is full');
        }

        // Step 2: Update the session
        // Add the user's ID to the attendees array
        const newAttendees = [...currentAttendees, user.uid];

        // Check if session should now be marked as full
        const isFull = capacity ? newAttendees.length >= capacity : false;

        // Step 3: Save the changes to Firestore
        transaction.update(sessionRef, {
          attendees: newAttendees,
          isFull: isFull
        });
      });

      // Success! Show a message to the user
      alert('Joined!');

    } catch (error) {
      // If anything goes wrong, show the error message
      console.error('Error joining session:', error);
      alert(error instanceof Error ? error.message : 'Failed to join session');
    }
  };

  // LEAVE SESSION FUNCTION
  // This removes the current user from the attendees array
  const handleLeaveSession = async (sessionId: string) => {
    // Check if user is logged in
    if (!user) {
      alert("You must be logged in to leave a session!");
      return;
    }
    
    try {
      // Get database reference
      const db = getFirestore(FIREBASE_APP);
      // Get session document reference
      const sessionRef = doc(db, 'sessions', sessionId);
      
      // Use runTransaction to safely update the data
      await runTransaction(db, async (transaction) => {
        const sessionDoc = await transaction.get(sessionRef);

        if (!sessionDoc.exists()) {
          throw new Error('Session does not exist');
        }

        // Get the current data from the document
        const sessionData = sessionDoc.data();
        const currentAttendees = sessionData.attendees || [];

        // VALIDATION CHECK: Is the user actually IN this session?
        if (!currentAttendees.includes(user.uid)) {
          throw new Error('Error: You are not in this session');
        }

        // Remove user from attendees using filter
        const newAttendees = currentAttendees.filter((attendee: string) => attendee !== user.uid);

        // Save the changes to Firestore
        transaction.update(sessionRef, {
          attendees: newAttendees,
          isFull: false  // Session can't be full if someone just left
        });
      });
      
      // Show success message
      alert('Left!');

    } catch (error) {
      console.error('Error leaving session:', error);
      alert(error instanceof Error ? error.message : 'Failed to leave session');
    }
  };
  const handleLogout = async () => {
    try {
      await logOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // RENDER LOGIC
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.loadingContainer, { width: '100%' }]}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading sessions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.loadingContainer, { width: '100%' }]}>
          <Ionicons name="warning-outline" size={32} color="#EF4444" />
          <Text style={styles.errorText}>Error: {error}</Text>
          <Text style={styles.errorTextSmall}>Check console or Firebase rules.</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <CreateSessionModal visible={isModalVisible} onClose={() => setIsModalVisible(false)} />
      <View style={styles.listFrame}>
        <View style={styles.header}>
          <Text style={styles.listTitle}>Upcoming Study Sessions</Text>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={24} color="#EF4444" />
          </TouchableOpacity>
        </View>

        {/* Search Bar (search-only UI) */}
        <View style={styles.filterContainer}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search course (e.g., CS 124, 124, c s)"
              value={searchText}
              onChangeText={setSearchText}
              placeholderTextColor="#9CA3AF"
              accessibilityLabel="Search by course"
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText('')} accessibilityLabel="Clear search">
                <Ionicons name="close-circle" size={20} color="#6B7280" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
        >
          {user && (
            <Text style={styles.welcomeText}>Welcome, {user.displayName || user.email}!</Text>
          )}
          
          {/* Use searched sessions (flexible spacing/case-insensitive match) */}
          {getSearchedSessions().length > 0 ? (
            getSearchedSessions().map(session => (
              <SessionCard 
                key={session.id} 
                session={session} 
                currentUserId={user?.uid} 
                onJoin={handleJoinSession}
                onLeave={handleLeaveSession}
              />
            ))
          ) : (
            <View style={styles.emptyStateContainer}>
              <Ionicons name="search" size={48} color="#9CA3AF" />
              <Text style={styles.emptyStateText}>No sessions match your search</Text>
              <Text style={styles.emptyStateSubText}>Try another course or clear the search</Text>
            </View>
          )}

          <View style={{ height: 40 }} /> 
        </ScrollView>
      </View>
      {/* Floating action button to create a session */}
      <TouchableOpacity style={styles.fab} onPress={() => setIsModalVisible(true)} activeOpacity={0.8}>
        <Ionicons name="add" size={32} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default StudySessionsScreen;

// STYLES
const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row', 
    backgroundColor: '#F9FAFB',
  },
  listFrame: {
    flex: 1,
    width: '100%',
    alignSelf: 'stretch',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  scrollContent: {
    paddingTop: 8,
    paddingHorizontal: 16,
  },
  listTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  welcomeText: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 16,
  },
  logoutButton: {
    padding: 8,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 2, 
    padding: 5,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5, 
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardCourse: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3B82F6', 
    textTransform: 'uppercase',
  },
  cardTopic: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 16,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 90,
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  detailsBlock: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 10,
    marginBottom: 10,
  },
  locationBlock: {
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  detailIcon: {
    width: 30,
    textAlign: 'center',
  },
  detailLabel: {
    fontSize: 15,
    color: '#6B7280', 
    marginLeft: 4,
    flex: 1,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'right',
    flexShrink: 1,
  },
  locationDetailsText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 34, 
    marginTop: 4,
    fontStyle: 'italic',
  },
  mapContainer: {
    borderRadius: 0,
    overflow: 'hidden',
    height: 100, 
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: '#F3F4F6', 
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  mapText: {
    marginTop: 5,
    fontSize: 14,
    color: '#4B5563',
    textAlign: 'center',
    fontWeight: '600',
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
  errorTextSmall: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 5,
  },
  emptyStateContainer: {
    marginTop: 40,
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
    marginTop: 4,
    textAlign: 'center',
  },
  // Join/Leave button styles (from Joining-Sessions branch)
  joinButton: {
    backgroundColor: '#3B82F6',  // Blue color
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  joinButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  // New styles for creation modal and FAB (from feat/calendar-gcal-button branch)
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  closeButton: {
    padding: 5,
  },
  formScrollView: {
    flex: 1,
    marginTop: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  googlePlacesContainer: {
    flex: 1,
  },
  googlePlacesListView: {
    backgroundColor: 'white',
    borderColor: '#D1D5DB',
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 2,
  },
  dateTimePickerButton: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  dateTimePickerText: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  
  /* ============ SEARCH & FILTER STYLES ============
     AI-ASSISTED
     Source/Tool: GitHub Copilot (Elias Ghanayem)
     Date: 2025-11-12
     
     These styles control the appearance of the search UI components.
     Key patterns used:
     - flexDirection: 'row' makes items line up horizontally
     - backgroundColor with # codes for colors
     - borderRadius makes rounded corners
     - paddingHorizontal/Vertical adds space inside elements
     - marginHorizontal/Vertical adds space outside elements
  */
  
  // Container for the search bar
  filterContainer: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  // Search bar container (with icon and input field)
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
});