/* Q: Why (tabs) folder?
   A: Our app uses expo-router file-based routing. The (tabs) folder
   is a route group that creates the bottom tab navigation. Files inside
   it automatically become tabs when registered in the _layout.tsx file. */
   
/* AI-ASSISTED
   Source/Tool: GitHub Copilot (Chat)
   Author/Reviewer: Elias Ghanayem
   Date: 2025-12-07
   Why AI: Enhanced campus map with location search, ratings display, and top 10 pins.
   Notes: Integrates GooglePlacesAutocomplete, Firestore location ratings, and interactive markers. */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Pressable,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import MapView, { PROVIDER_GOOGLE, Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { useAuth } from '../contexts/AuthContext';
import {
  generateLocationId,
  getLocationRating,
  addOrUpdateRating,
  getTopRatedLocations,
  LocationRating,
  LocationCoords,
} from '../../utils/locationRatings';
import { StarRating } from '../../components/StarRating';

const GOOGLE_PLACES_API_KEY = 'YOUR_GOOGLE_PLACES_API_KEY'; // Replace with your actual key

export default function CampusMapScreen() {
  const { user } = useAuth();
  const mapRef = useRef<MapView>(null);
  
  // UIUC Main Quad coordinates
  const initialRegion = {
    latitude: 40.1106,
    longitude: -88.2073,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  };

  // State
  const [selectedLocation, setSelectedLocation] = useState<LocationRating | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [topLocations, setTopLocations] = useState<LocationRating[]>([]);
  const [tempMarker, setTempMarker] = useState<LocationCoords | null>(null);
  const [searchedLocationName, setSearchedLocationName] = useState<string>('');
  const [searchedPlaceId, setSearchedPlaceId] = useState<string | undefined>(undefined);

  // Load top 10 locations on mount
  useEffect(() => {
    loadTopLocations();
  }, []);

  const loadTopLocations = async () => {
    try {
      const top = await getTopRatedLocations(10);
      setTopLocations(top);
    } catch (error) {
      console.error('Error loading top locations:', error);
    }
  };

  // Handle location selection from search
  const handlePlaceSelect = async (data: any, details: any) => {
    if (!details || !details.geometry) return;

    const coords: LocationCoords = {
      latitude: details.geometry.location.lat,
      longitude: details.geometry.location.lng,
    };

    const locationName = details.name || data.description;
    const placeId = details.place_id;

    // Generate location ID
    const locationId = generateLocationId(placeId, locationName, coords);

    // Set temp marker
    setTempMarker(coords);
    setSearchedLocationName(locationName);
    setSearchedPlaceId(placeId);

    // Animate map to location
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 1000);
    }

    // Load or create location rating
    let locationRating = await getLocationRating(locationId);
    
    if (!locationRating) {
      // Create placeholder for new location
      locationRating = {
        locationId,
        locationName,
        locationCoords: coords,
        placeId,
        ratings: [],
        averageRating: 0,
        totalRatings: 0,
      };
    }

    setSelectedLocation(locationRating);
    setShowRatingModal(true);
  };

  // Handle marker press for top locations
  const handleMarkerPress = async (location: LocationRating) => {
    setSelectedLocation(location);
    setShowRatingModal(true);
    setTempMarker(null); // Clear temp marker
    
    // Animate to location
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: location.locationCoords.latitude,
        longitude: location.locationCoords.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 1000);
    }
  };

  // Get pin color based on rank
  const getPinColor = (index: number): string => {
    if (index === 0) return '#FFD700'; // Gold
    if (index === 1) return '#C0C0C0'; // Silver
    if (index === 2) return '#CD7F32'; // Bronze
    return '#3B82F6'; // Blue for 4-10
  };

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        {/* Top 10 location markers */}
        {topLocations.map((location, index) => (
          <Marker
            key={location.locationId}
            coordinate={location.locationCoords}
            pinColor={getPinColor(index)}
            onPress={() => handleMarkerPress(location)}
          >
            <View style={[styles.customMarker, { backgroundColor: getPinColor(index) }]}>
              <Text style={styles.markerText}>{index + 1}</Text>
            </View>
          </Marker>
        ))}

        {/* Temporary marker from search */}
        {tempMarker && (
          <Marker coordinate={tempMarker} pinColor="#EF4444" />
        )}
      </MapView>

      {/* Search bar overlay */}
      <SafeAreaView style={styles.searchContainer}>
        <GooglePlacesAutocomplete
          placeholder="Search locations to see ratings"
          fetchDetails={true}
          onPress={handlePlaceSelect}
          query={{
            key: GOOGLE_PLACES_API_KEY,
            language: 'en',
            components: 'country:us',
            location: `${initialRegion.latitude},${initialRegion.longitude}`,
            radius: 5000,
          }}
          styles={{
            container: { flex: 0 },
            textInput: styles.searchInput,
            listView: styles.searchListView,
          }}
          enablePoweredByContainer={false}
        />
      </SafeAreaView>

      {/* Location Rating Modal */}
      {selectedLocation && (
        <LocationRatingModal
          visible={showRatingModal}
          location={selectedLocation}
          onClose={() => {
            setShowRatingModal(false);
            setSelectedLocation(null);
            setTempMarker(null);
            loadTopLocations(); // Refresh top locations after rating
          }}
          rank={topLocations.findIndex(l => l.locationId === selectedLocation.locationId) + 1 || null}
          totalLocations={topLocations.length}
        />
      )}
    </View>
  );
}

// Location Rating Modal Component
interface LocationRatingModalProps {
  visible: boolean;
  location: LocationRating;
  onClose: () => void;
  rank: number | null;
  totalLocations: number;
}

const LocationRatingModal: React.FC<LocationRatingModalProps> = ({
  visible,
  location,
  onClose,
  rank,
  totalLocations,
}) => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Find current user's rating
  const currentUserRating = location.ratings.find(r => r.userId === user?.uid);

  useEffect(() => {
    if (currentUserRating) {
      setUserRating(currentUserRating.rating);
      setReviewText(currentUserRating.reviewText || '');
    } else {
      setUserRating(0);
      setReviewText('');
    }
  }, [currentUserRating]);

  const handleSubmitRating = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to rate locations');
      return;
    }

    if (userRating === 0) {
      Alert.alert('Error', 'Please select a star rating');
      return;
    }

    setIsSubmitting(true);
    try {
      await addOrUpdateRating(
        location.locationId,
        location.locationName,
        location.locationCoords,
        user.uid,
        user.displayName || user.email || 'Anonymous',
        userRating,
        reviewText.trim(),
        'manual', // Session ID for manual ratings
        location.placeId
      );

      Alert.alert('Success', currentUserRating ? 'Rating updated!' : 'Rating submitted!');
      setIsEditing(false);
      onClose(); // Close and refresh
    } catch (error) {
      console.error('Error submitting rating:', error);
      Alert.alert('Error', 'Failed to submit rating. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(w => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>{location.locationName}</Text>
              {location.totalRatings > 0 && (
                <View style={styles.ratingBadge}>
                  <Text style={styles.avgRatingText}>{location.averageRating.toFixed(1)} ⭐</Text>
                  {rank && rank <= totalLocations && (
                    <Text style={styles.rankText}>
                      • Ranked #{rank} of {totalLocations}
                    </Text>
                  )}
                </View>
              )}
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color="#4B5563" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={true}>
            {/* User's rating section */}
            {currentUserRating && !isEditing ? (
              <View style={styles.userRatingSection}>
                <Text style={styles.sectionTitle}>Your Rating</Text>
                <View style={styles.userRatingCard}>
                  <StarRating rating={currentUserRating.rating} size={24} />
                  {currentUserRating.reviewText && (
                    <Text style={styles.userReviewText}>{currentUserRating.reviewText}</Text>
                  )}
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => setIsEditing(true)}
                  >
                    <Text style={styles.editButtonText}>Edit Rating</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : isEditing || !currentUserRating ? (
              <View style={styles.ratingFormSection}>
                <Text style={styles.sectionTitle}>
                  {currentUserRating ? 'Edit Your Rating' : 'Rate This Location'}
                </Text>
                <View style={styles.ratingForm}>
                  <StarRating
                    rating={userRating}
                    size={32}
                    interactive
                    onRatingChange={setUserRating}
                  />
                  <TextInput
                    style={styles.reviewInput}
                    placeholder="Write your review (optional)"
                    placeholderTextColor="#9CA3AF"
                    value={reviewText}
                    onChangeText={setReviewText}
                    multiline
                    numberOfLines={4}
                  />
                  <View style={styles.formButtons}>
                    <TouchableOpacity
                      style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                      onPress={handleSubmitRating}
                      disabled={isSubmitting}
                    >
                      <Text style={styles.submitButtonText}>
                        {isSubmitting ? 'Submitting...' : 'Submit Rating'}
                      </Text>
                    </TouchableOpacity>
                    {currentUserRating && (
                      <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => {
                          setIsEditing(false);
                          setUserRating(currentUserRating.rating);
                          setReviewText(currentUserRating.reviewText || '');
                        }}
                      >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            ) : null}

            {/* Other users' ratings */}
            {location.ratings.length > 0 && (
              <View style={styles.ratingsListSection}>
                <Text style={styles.sectionTitle}>
                  All Ratings ({location.totalRatings})
                </Text>
                {location.ratings
                  .filter(r => r.userId !== user?.uid)
                  .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
                  .map((rating, index) => (
                    <View key={index} style={styles.ratingCard}>
                      <View style={styles.ratingCardHeader}>
                        <View style={styles.avatar}>
                          <Text style={styles.avatarText}>{getInitials(rating.userName)}</Text>
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={styles.userName}>{rating.userName}</Text>
                          <StarRating rating={rating.rating} size={16} />
                        </View>
                        <Text style={styles.dateText}>{formatDate(rating.timestamp)}</Text>
                      </View>
                      {rating.reviewText && (
                        <Text style={styles.reviewText}>{rating.reviewText}</Text>
                      )}
                    </View>
                  ))}
              </View>
            )}

            {location.totalRatings === 0 && !isEditing && !currentUserRating && (
              <View style={styles.emptyState}>
                <Ionicons name="star-outline" size={48} color="#9CA3AF" />
                <Text style={styles.emptyStateText}>No ratings yet</Text>
                <Text style={styles.emptyStateSubText}>Be the first to rate {location.locationName}!</Text>
                <TouchableOpacity
                  style={styles.rateNowButton}
                  onPress={() => setIsEditing(true)}
                >
                  <Text style={styles.rateNowButtonText}>Rate Now</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  searchContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: 16,
    zIndex: 10,
  },
  searchInput: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchListView: {
    backgroundColor: 'white',
    borderRadius: 8,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  customMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  markerText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avgRatingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
  },
  rankText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
  },
  modalScroll: {
    flex: 1,
  },
  userRatingSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  userRatingCard: {
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 8,
  },
  userReviewText: {
    fontSize: 15,
    color: '#1F2937',
    marginTop: 12,
    lineHeight: 22,
  },
  editButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  ratingFormSection: {
    marginBottom: 20,
  },
  ratingForm: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 8,
  },
  reviewInput: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1F2937',
    marginTop: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  formButtons: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#4B5563',
    fontSize: 16,
    fontWeight: '600',
  },
  ratingsListSection: {
    marginBottom: 20,
  },
  ratingCard: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  ratingCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  reviewText: {
    fontSize: 15,
    color: '#1F2937',
    lineHeight: 22,
    marginTop: 8,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
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
  },
  rateNowButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  rateNowButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});