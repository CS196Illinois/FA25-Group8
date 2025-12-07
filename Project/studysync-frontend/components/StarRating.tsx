/* AI-ASSISTED
   Source/Tool: GitHub Copilot (Chat)
   Author/Reviewer: Elias Ghanayem
   Date: 2025-12-07
   Why AI: Reusable star rating component for location reviews.
   Notes: Supports both display-only and interactive modes. */

import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface StarRatingProps {
  rating: number;
  size?: number;
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
  color?: string;
}

export const StarRating: React.FC<StarRatingProps> = ({
  rating,
  size = 20,
  interactive = false,
  onRatingChange,
  color = '#F59E0B',
}) => {
  const handlePress = (starIndex: number) => {
    if (interactive && onRatingChange) {
      onRatingChange(starIndex);
    }
  };

  return (
    <View style={styles.container}>
      {[1, 2, 3, 4, 5].map((star) => {
        const Component = interactive ? TouchableOpacity : View;
        return (
          <Component
            key={star}
            onPress={() => handlePress(star)}
            style={styles.star}
          >
            <Ionicons
              name={star <= rating ? 'star' : 'star-outline'}
              size={size}
              color={star <= rating ? color : '#D1D5DB'}
            />
          </Component>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  star: {
    marginRight: 4,
  },
});