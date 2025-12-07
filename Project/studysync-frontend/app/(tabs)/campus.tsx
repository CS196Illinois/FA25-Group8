import React, { useRef } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';

export default function CampusMapScreen() {
  const mapRef = useRef<MapView>(null);
  
  // UIUC Main Quad coordinates
  const initialRegion = {
    latitude: 40.1106,
    longitude: -88.2073,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  };

  return (
    <SafeAreaView style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation={true}
        showsMyLocationButton={true}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
});