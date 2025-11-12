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
   Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
// Import for Google Places
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
// Import for Date/Time Picker
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

//FIREBASE IMPORTS
import { FIREBASE_APP } from '../firebaseConfig';
import {
   getAuth
} from 'firebase/auth';
import {
   getFirestore,
   collection,
   onSnapshot,
   query,
   DocumentData,
   setLogLevel,
   Timestamp,
   addDoc,
   serverTimestamp // Import for adding new documents and timestamps
} from 'firebase/firestore';

//CONTEXT
import { useAuth } from './contexts/AuthContext';

//INTERFACES
interface LocationCoords {
   latitude: number;
   longitude: number;
}

// Represents the data structure in Firestore
interface StudySessionFirestore {
   creatorId: string;
   creatorName: string;
   course: string;
   topic: string;
   locationName: string;
   locationDetails?: string;
   locationCoords: LocationCoords;
   startTime: Timestamp; // Use Timestamp for sending to Firestore
   endTime?: Timestamp | null;
   signupPolicy: 'required' | 'preferred' | 'open';
   capacity?: number;
   attendees: string[];
   isFull: boolean;
   createdAt: Timestamp; // Use Timestamp for sending to Firestore
}

// Represents the data structure used in the app (with Date objects)
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

// Selected location state for the form
interface SelectedLocation {
   name: string;
   coords: LocationCoords | null;
   details?: string;
}

//DATA & MAP UTILITIES
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

//REUSABLE COMPONENTS
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
                <DetailRow
                   iconName="location-sharp"
                   label="Location"
                   value={session.locationName}
               />
               {session.locationDetails && (
                   <Text style={styles.locationDetailsText}>
                       • {session.locationDetails}
                   </Text>
               )}
           </View>
           <MapExcerpt locationName={session.locationName} coords={session.locationCoords} />
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

// Session Creation

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

   const onDateTimeChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
       setShowDateTimePicker(Platform.OS === 'ios');
       if (selectedDate) {
           setStartTime(selectedDate);
       }
   };

   const handleSubmit = async () => {
       if (!user) {
           Alert.alert("Error", "You must be logged in to create a session.");
           return;
       }
       if (!course || !topic || !location || !location.coords) {
           Alert.alert("Missing Information", "Please fill out Course, Topic, and Location.");
           return;
       }

       setIsSubmitting(true);
       try {
           const db = getFirestore(FIREBASE_APP);
           const sessionsCollectionRef = collection(db, "sessions");
          
           // Prepare the new session document
           const newSession: Omit<StudySessionFirestore, 'id' | 'createdAt'> = {
               creatorId: user.uid,
               creatorName: user.displayName || user.email || 'Anonymous',
               course: course.trim(),
               topic: topic.trim(),
               locationName: location.name,
               locationDetails: locationDetails.trim() || undefined,
               locationCoords: location.coords,
               startTime: Timestamp.fromDate(startTime),
               endTime: null, // You can add a field for this later if needed
               signupPolicy: signupPolicy,
               capacity: capacity ? parseInt(capacity, 10) : undefined,
               attendees: [user.uid], // Creator automatically attends
               isFull: false,
           };

           // Add the document to Firestore
           await addDoc(sessionsCollectionRef, {
               ...newSession,
               createdAt: serverTimestamp() // Let Firestore set the creation time
           });

           Alert.alert("Success!", "Your study session has been created.");
           setIsSubmitting(false);
           onClose(); // Close the modal
           // Reset form
           setCourse('');
           setTopic('');
           setLocation(null);
           setLocationDetails('');
           setStartTime(new Date());
           setCapacity('');
       } catch (error) {
           console.error("Error creating session:", error);
           Alert.alert("Error", "Could not create the session. Please try again.");
           setIsSubmitting(false);
       }
   };

   return (
       <Modal
           animationType="slide"
           transparent={true}
           visible={visible}
           onRequestClose={onClose}
       >
           <KeyboardAvoidingView
               behavior={Platform.OS === "ios" ? "padding" : "height"}
               style={styles.modalBackdrop}
           >
               <Pressable style={styles.modalBackdrop} onPress={onClose} />
               <View style={[styles.modalContent, { height: MODAL_HEIGHT }]}>
                   <View style={styles.modalHeader}>
                       <Text style={styles.modalTitle}>New Study Session</Text>
                       <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                           <Ionicons name="close-circle" size={30} color="#6B7280" />
                       </TouchableOpacity>
                   </View>
                  
                   <ScrollView style={styles.formScrollView} showsVerticalScrollIndicator={false}>
                       <Text style={styles.label}>Course</Text>
                       <TextInput
                           style={styles.input}
                           placeholder="e.g., CS 124"
                           value={course}
                           onChangeText={setCourse}
                       />

                       <Text style={styles.label}>Topic</Text>
                       <TextInput
                           style={styles.input}
                           placeholder="e.g., Midterm 1 Prep"
                           value={topic}
                           onChangeText={setTopic}
                       />

                       <Text style={styles.label}>Location</Text>
                       <GooglePlacesAutocomplete
                           placeholder='Search for a location'
                           onPress={(data, details = null) => {
                               const { lat, lng } = details?.geometry.location || {};
                               setLocation({
                                   name: data.description,
                                   coords: lat && lng ? { latitude: lat, longitude: lng } : null,
                               });
                           }}
                           query={{
                               // --- IMPORTANT GMAPS API KEY---
                               key: 'AIzaSyCSpOvxSXhquORKm4TJQvj1tMC3KpRBm4I',
                               language: 'en',
                           }}
                           fetchDetails={true}
                           styles={{
                               container: styles.googlePlacesContainer,
                               textInput: styles.input,
                               listView: styles.googlePlacesListView,
                           }}
                           // Keep results within a reasonable area (optional, example: Illinois)
                           // predefinedPlaces={[...]}
                           // currentLocation={true}
                           // currentLocationLabel="Current location"
                       />

                       <Text style={styles.label}>Location Details (Optional)</Text>
                       <TextInput
                           style={styles.input}
                           placeholder="e.g., Room 12, Main Library"
                           value={locationDetails}
                           onChangeText={setLocationDetails}
                       />

                       <Text style={styles.label}>Start Time</Text>
                       <TouchableOpacity onPress={() => setShowDateTimePicker(true)} style={styles.dateTimePickerButton}>
                            <Text style={styles.dateTimePickerText}>
                               {`${formatDate(startTime)} at ${formatTime(startTime)}`}
                           </Text>
                       </TouchableOpacity>
                      
                       {showDateTimePicker && (
                           <DateTimePicker
                               testID="dateTimePicker"
                               value={startTime}
                               mode="datetime"
                               is24Hour={false}
                               display="default"
                               onChange={onDateTimeChange}
                           />
                       )}

                       <Text style={styles.label}>Capacity (Optional)</Text>
                       <TextInput
                           style={styles.input}
                           placeholder="e.g., 10"
                           value={capacity}
                           onChangeText={setCapacity}
                           keyboardType="number-pad"
                       />
                      
                       {/* You could add the SignupPolicy picker here later */}

                       <TouchableOpacity
                           style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                           onPress={handleSubmit}
                           disabled={isSubmitting}
                       >
                           {isSubmitting ? (
                               <ActivityIndicator color="#FFF" />
                           ) : (
                               <Text style={styles.submitButtonText}>Create Session</Text>
                           )}
                       </TouchableOpacity>
                   </ScrollView>
               </View>
           </KeyboardAvoidingView>
       </Modal>
   );
};


//MAIN COMPONENT: StudySessionsScreen
const StudySessionsScreen = () => {
   const [sessions, setSessions] = useState<StudySession[]>([]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);
   const [isModalVisible, setIsModalVisible] = useState(false); // New state for modal
  
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
                       //Safely handle Timestamps from Firestore
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

       //Cleanup function to prevent memory leaks
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

   //RENDER LOGIC
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

                   <View style={{ height: 100 }} />
               </ScrollView>
           </View>

           {/* --- NEW Floating Action Button --- */}
           <TouchableOpacity
               style={styles.fab}
               onPress={() => setIsModalVisible(true)}
               activeOpacity={0.8}
           >
               <Ionicons name="add" size={32} color="white" />
           </TouchableOpacity>
       </SafeAreaView>
   );
};

export default StudySessionsScreen;

//STYLES
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

   // --- NEW MODAL & FORM STYLES ---
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
       shadowOffset: { width: 0, height: 4 },
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
       // The component has its own container, no need for extra styling here
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
       marginBottom: 40, // Add padding for keyboard
   },
   submitButtonDisabled: {
       backgroundColor: '#9CA3AF',
   },
   submitButtonText: {
       color: 'white',
       fontSize: 18,
       fontWeight: 'bold',
   },
});