/* Q: Why (tabs) folder?
   A: Our app uses expo-router file-based routing. The (tabs) folder
   is a route group that creates the bottom tab navigation. Files inside
   it automatically become tabs when registered in the _layout.tsx file. */
   
/* AI-ASSISTED
   Source/Tool: GitHub Copilot (Chat)
   Author/Reviewer: Elias Ghanayem
   Date: 2025-11-19
   Why AI: Initial UIUC campus map screen with react-native-maps.
   Notes: Validated by checking map renders centered on Main Quad with working pan/zoom. */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';

export default function CampusMapScreen() {
  // UIUC Main Quad coordinates
  const initialRegion = {
    latitude: 40.1106,
    longitude: -88.2073,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  };

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation={true}
        showsMyLocationButton={true}
      />
    </View>
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