import { Tabs } from 'expo-router';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      {/* Existing studysessions tab */}
      <Tabs.Screen
        name="studysessions"
        options={{
          title: 'Sessions',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? 'calendar' : 'calendar-outline'} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />

      {/* Campus Map Tab
       * AI-ASSISTED
       * Source/Tool: GitHub Copilot (Chat)
       * Author/Reviewer: Elias Ghanayem
       * Date: 2025-11-19
       * Purpose: Displays an interactive map focused on campus (eventually showing pins on rated study session locations)
       * Route: Maps to app/(tabs)/campus.tsx via expo-router file-based routing
       * Icon: Uses Ionicons map/map-outline with conditional rendering based on tab focus
       * - 'focused' prop is true when this tab is active, false otherwise
       * - Shows filled 'map' icon when selected, outline version when not selected
       * - 'color' prop automatically matches the app's theme (changes with focus state)
       */}
      <Tabs.Screen
        name="campus"
        options={{
          // Text label displayed below the icon in the bottom tab bar
          title: 'Campus',
          // Function that renders the tab icon, receives color and focus state from Tabs
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              // Ternary: if tab is focused (active), show solid icon; otherwise show outline
              name={focused ? 'map' : 'map-outline'} 
              size={24} 
              // Color is managed by Tabs component based on theme and focus state
              color={color} 
            />
          ),
        }}
      />
      {/* Profile Tab
       * AI-ASSISTED
       * Source/Tool: GitHub Copilot (Chat)
       * Author/Reviewer: Elias Ghanayem
       * Date: 2025-12-05
       * Purpose: User profile screen with session history (created/joined/past), stats, and account management
       * Route: Maps to app/(tabs)/profile.tsx via expo-router file-based routing
       * Icon: Uses Ionicons person/person-outline with conditional rendering based on tab focus
       */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? 'person' : 'person-outline'} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />
    </Tabs>
  );
}