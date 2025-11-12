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
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons'; 

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
    Timestamp 
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

const SessionCard: React.FC<{ session: StudySession }> = ({ session }) => {
  const numAttendees = session.attendees.length;
  const timeStart = formatTime(session.startTime);
  const timeEnd = formatTime(session.endTime);
  const date = formatDate(session.startTime);
  const timeRange = `${timeStart} - ${session.endTime ? timeEnd : 'Ongoing'}`;

  const policyText = session.signupPolicy.charAt(0).toUpperCase() + session.signupPolicy.slice(1) + ' Sign-up';
  const attendeeCountText = session.capacity 
    ? `${numAttendees} / ${session.capacity} Attending` 
    : `${numAttendees} Attending`;
  
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

      {/* Google Calendar (review-before-save) */}
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

// MAIN COMPONENT: StudySessionsScreen
const StudySessionsScreen = () => {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
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
      <View style={styles.listFrame}>
        <View style={styles.header}>
          <Text style={styles.listTitle}>Upcoming Study Sessions</Text>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={24} color="#EF4444" />
          </TouchableOpacity>
        </View>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
        >
          {user && (
            <Text style={styles.welcomeText}>Welcome, {user.displayName || user.email}!</Text>
          )}
          
          {sessions.length > 0 ? (
            sessions.map(session => (
              <SessionCard key={session.id} session={session} />
            ))
          ) : (
            <EmptyState />
          )}

          <View style={{ height: 40 }} /> 
        </ScrollView>
      </View>
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
  }
});