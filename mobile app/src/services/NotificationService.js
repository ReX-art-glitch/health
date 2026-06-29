import PushNotification from 'react-native-push-notification';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

class NotificationServiceClass {
  constructor() {
    this.initialized = false;
  }

  /**
   * Initialize notifications
   */
  async initialize() {
    if (this.initialized) return;

    PushNotification.configure({
      // Called when notification is received or app is opened from notification
      onNotification: function (notification) {
        console.log('Notification received:', notification);
        
        // Handle notification data
        if (notification.data) {
          handleNotificationData(notification.data);
        }

        // Required on iOS
        if (Platform.OS === 'ios') {
          notification.finish('backgroundFetchResultNoData');
        }
      },

      // Called when user registers for push
      onRegister: function (token) {
        console.log('Device token:', token.token);
        AsyncStorage.setItem('deviceToken', token.token);
      },

      // IOS ONLY (optional): default: all - Permissions to register
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },

      // Should the initial notification be popped automatically
      popInitialNotification: true,

      // Request permissions
      requestPermissions: true,
    });

    // Create notification channels for Android
    if (Platform.OS === 'android') {
      this.createChannels();
    }

    this.initialized = true;
  }

  /**
   * Create notification channels (Android)
   */
  createChannels() {
    PushNotification.createChannel(
      {
        channelId: 'alerts',
        channelName: 'Health Alerts',
        channelDescription: 'Critical health alerts and notifications',
        importance: 5,
        vibrate: true,
        soundName: 'alert.wav',
      },
      (created) => console.log(`Alert channel created: ${created}`)
    );

    PushNotification.createChannel(
      {
        channelId: 'reminders',
        channelName: 'Reminders',
        channelDescription: 'Vaccination and appointment reminders',
        importance: 4,
        vibrate: true,
      },
      (created) => console.log(`Reminder channel created: ${created}`)
    );

    PushNotification.createChannel(
      {
        channelId: 'sync',
        channelName: 'Sync Status',
        channelDescription: 'Data synchronization status updates',
        importance: 2,
        vibrate: false,
      },
      (created) => console.log(`Sync channel created: ${created}`)
    );
  }

  /**
   * Schedule local notification
   */
  scheduleLocalNotification(title, message, date, data = {}) {
    PushNotification.localNotificationSchedule({
      channelId: 'reminders',
      title: title,
      message: message,
      date: date,
      data: data,
      allowWhileIdle: true,
      importance: 'high',
      priority: 'high',
    });
  }

  /**
   * Send immediate notification
   */
  sendImmediateNotification(title, message, channelId = 'alerts', data = {}) {
    PushNotification.localNotification({
      channelId: channelId,
      title: title,
      message: message,
      data: data,
      importance: 'high',
      priority: 'high',
      vibrate: true,
      playSound: true,
      soundName: 'default',
    });
  }

  /**
   * Schedule vaccination reminder
   */
  scheduleVaccinationReminder(childName, vaccineType, dueDate, location) {
    // Remind 1 day before
    const reminderDate = new Date(dueDate);
    reminderDate.setDate(reminderDate.getDate() - 1);

    this.scheduleLocalNotification(
      'Vaccination Reminder',
      `${childName} is due for ${vaccineType} vaccination tomorrow at ${location}`,
      reminderDate,
      { type: 'vaccination', childName, vaccineType, location }
    );

    // Remind on the day
    this.scheduleLocalNotification(
      'Vaccination Due Today',
      `${childName} should receive ${vaccineType} vaccination today at ${location}`,
      new Date(dueDate),
      { type: 'vaccination', childName, vaccineType, location }
    );
  }

  /**
   * Schedule ANC visit reminder
   */
  scheduleANCVisitReminder(patientName, visitDate, facility) {
    const reminderDate = new Date(visitDate);
    reminderDate.setDate(reminderDate.getDate() - 1);

    this.scheduleLocalNotification(
      'ANC Visit Reminder',
      `${patientName} has ANC visit scheduled at ${facility} tomorrow`,
      reminderDate,
      { type: 'anc_visit', patientName, facility }
    );
  }

  /**
   * Send outbreak alert
   */
  sendOutbreakAlert(disease, location, cases) {
    this.sendImmediateNotification(
      '⚠️ Disease Outbreak Alert',
      `${disease} outbreak detected in ${location}. ${cases} cases reported.`,
      'alerts',
      { type: 'outbreak', disease, location, cases }
    );
  }

  /**
   * Cancel all notifications
   */
  cancelAllNotifications() {
    PushNotification.cancelAllLocalNotifications();
  }

  /**
   * Cancel specific notification
   */
  cancelNotification(id) {
    PushNotification.cancelLocalNotification(id);
  }

  /**
   * Get scheduled notifications
   */
  getScheduledNotifications(callback) {
    PushNotification.getScheduledLocalNotifications(callback);
  }

  /**
   * Set badge count (iOS)
   */
  setBadgeCount(count) {
    if (Platform.OS === 'ios') {
      PushNotification.setApplicationIconBadgeNumber(count);
    }
  }

  /**
   * Clear badge count
   */
  clearBadge() {
    this.setBadgeCount(0);
  }
}

// Handle notification data when user taps notification
const handleNotificationData = (data) => {
  switch (data.type) {
    case 'vaccination':
      // Navigate to vaccination screen
      break;
    case 'outbreak':
      // Navigate to disease surveillance
      break;
    case 'anc_visit':
      // Navigate to maternal health
      break;
    case 'inventory':
      // Navigate to inventory
      break;
    default:
      // Navigate to home
      break;
  }
};

export const NotificationService = new NotificationServiceClass();