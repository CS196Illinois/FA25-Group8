// Place at the top of your file
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PERMISSION_KEY = '@notification_permission_asked';
const NOTIFICATION_MAPPING_KEY = '@notification_session_mapping';

// Check if we've already asked for permission
async function hasAskedForPermission() {
  try {
    const value = await AsyncStorage.getItem(PERMISSION_KEY);
    return value === 'true';
  } catch (error) {
    console.error('Error checking permission status:', error);
    return false;
  }
}

// Mark that we've asked for permission
async function markPermissionAsked() {
  try {
    await AsyncStorage.setItem(PERMISSION_KEY, 'true');
  } catch (error) {
    console.error('Error saving permission status:', error);
  }
}

// Helper functions for notification-session mapping
async function saveNotificationMapping(sessionId, notificationId) {
  try {
    const mappingJson = await AsyncStorage.getItem(NOTIFICATION_MAPPING_KEY);
    const mapping = mappingJson ? JSON.parse(mappingJson) : {};
    mapping[sessionId] = notificationId;
    await AsyncStorage.setItem(NOTIFICATION_MAPPING_KEY, JSON.stringify(mapping));
  } catch (error) {
    console.error('Error saving notification mapping:', error);
  }
}

async function getNotificationIdBySessionId(sessionId) {
  try {
    const mappingJson = await AsyncStorage.getItem(NOTIFICATION_MAPPING_KEY);
    const mapping = mappingJson ? JSON.parse(mappingJson) : {};
    return mapping[sessionId] || null;
  } catch (error) {
    console.error('Error getting notification ID:', error);
    return null;
  }
}

async function removeNotificationMapping(sessionId) {
  try {
    const mappingJson = await AsyncStorage.getItem(NOTIFICATION_MAPPING_KEY);
    const mapping = mappingJson ? JSON.parse(mappingJson) : {};
    delete mapping[sessionId];
    await AsyncStorage.setItem(NOTIFICATION_MAPPING_KEY, JSON.stringify(mapping));
  } catch (error) {
    console.error('Error removing notification mapping:', error);
  }
}

// Request notification permission (call ONCE, e.g., app start or after user signs in)
async function getNotificationPermission() {
  // Get current permission status first
  const { status: existingStatus } = await Notifications.getPermissionsAsync();

  // If already granted, return true (user may have enabled in settings)
  if (existingStatus === 'granted') {
    return true;
  }

  // Check if we've already asked before
  const alreadyAsked = await hasAskedForPermission();

  // If we haven't asked before, ask now
  if (!alreadyAsked) {
    const { status } = await Notifications.requestPermissionsAsync();
    await markPermissionAsked();

    if (status !== 'granted') {
      alert('Please enable notifications to get reminders!');
      return false;
    }
    return true;
  }

  // We've asked before and user denied - don't ask again
  return false;
}

// Main function: Call this when scheduling a session
// Returns the notification ID so you can cancel it later
async function scheduleSessionReminder(sessionStartTime, sessionId) {
  // Ensure permission
  const hasPermission = await getNotificationPermission();
  if (!hasPermission) return null;

  // Convert sessionStartTime to Date if needed
  const triggerDate = new Date(sessionStartTime); // Handles both string or Date
  triggerDate.setMinutes(triggerDate.getMinutes() - 30); // 30 minutes before session

  // Schedule the notification
  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Session Reminder',
      body: 'Your session starts in 30 minutes!',
      sound: true,
      data: { sessionId }, // Store session ID in notification data
    },
    trigger: triggerDate,
  });

  // Save the mapping between sessionId and notificationId
  await saveNotificationMapping(sessionId, notificationId);

  console.log(`Scheduled notification ${notificationId} for session ${sessionId}`);
  return notificationId;
}

// Cancel a specific notification by its ID
async function cancelSessionReminder(notificationId, sessionId = null) {
  if (!notificationId) return;

  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    console.log(`Cancelled notification ${notificationId}`);

    // Remove from mapping if sessionId provided
    if (sessionId) {
      await removeNotificationMapping(sessionId);
    }
  } catch (error) {
    console.error('Error cancelling notification:', error);
  }
}

// Cancel notification by session ID
async function cancelSessionReminderBySessionId(sessionId) {
  try {
    // Get the notification ID from our stored mapping
    const notificationId = await getNotificationIdBySessionId(sessionId);

    if (!notificationId) {
      console.log(`No notification found for session ${sessionId}`);
      return;
    }

    await Notifications.cancelScheduledNotificationAsync(notificationId);
    await removeNotificationMapping(sessionId);
    console.log(`Cancelled notification for session ${sessionId}`);
  } catch (error) {
    console.error('Error cancelling notification by session ID:', error);
  }
}

// Cancel all scheduled notifications
async function cancelAllReminders() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    // Clear all mappings
    await AsyncStorage.setItem(NOTIFICATION_MAPPING_KEY, JSON.stringify({}));
    console.log('Cancelled all notifications');
  } catch (error) {
    console.error('Error cancelling all notifications:', error);
  }
}

// Get all scheduled notifications
async function getAllScheduledNotifications() {
  try {
    const notifications = await Notifications.getAllScheduledNotificationsAsync();
    return notifications;
  } catch (error) {
    console.error('Error getting scheduled notifications:', error);
    return [];
  }
}

// Example: Usage in your app logic
//
// 1. Request permission once (e.g., in App.js or after login)
// await getNotificationPermission();
//
// 2. Schedule a session reminder
// const session = { id: '123', startTime: '2025-11-05T18:00:00' };
// const notificationId = await scheduleSessionReminder(session.startTime, session.id);
// // Store notificationId with your session data if needed
//
// 3. Cancel a specific reminder
// await cancelSessionReminder(notificationId);
// // OR
// await cancelSessionReminderBySessionId(session.id);
//
// 4. Get all scheduled notifications
// const scheduled = await getAllScheduledNotifications();
// console.log('Scheduled notifications:', scheduled);

export {
  getNotificationPermission,
  scheduleSessionReminder,
  cancelSessionReminder,
  cancelSessionReminderBySessionId,
  cancelAllReminders,
  getAllScheduledNotifications,
};
