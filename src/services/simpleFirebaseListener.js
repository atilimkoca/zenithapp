import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import * as Notifications from 'expo-notifications';
import { db } from '../config/firebase';

// Simplified Firebase notification listener that's more reliable
class SimpleFirebaseListener {
  constructor() {
    this.seenNotificationIds = new Set();
    this.isInitialized = false;
    this.unsubscribeFunctions = [];
  }

  async setupListener(userId) {
    if (!userId) {
      return null;
    }


    try {
      // Query for user-specific notifications
      const userQuery = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        limit(20)
      );

      // Query for broadcast notifications
      const broadcastQuery = query(
        collection(db, 'notifications'),
        where('recipients', '==', 'all'),
        limit(20)
      );

      // Set up user notifications listener
      const unsubscribeUser = onSnapshot(
        userQuery,
        (querySnapshot) => {
          this.handleNotificationSnapshot(querySnapshot, 'user');
        },
        (error) => {
          }
      );

      // Set up broadcast notifications listener
      const unsubscribeBroadcast = onSnapshot(
        broadcastQuery,
        (querySnapshot) => {
          this.handleNotificationSnapshot(querySnapshot, 'broadcast');
        },
        (error) => {
          }
      );

      this.unsubscribeFunctions = [unsubscribeUser, unsubscribeBroadcast];

      // Initialize after 2 seconds to avoid showing existing notifications
      setTimeout(() => {
        this.isInitialized = true;
      }, 2000);

      // Return cleanup function
      return () => {
        this.cleanup();
      };

    } catch (error) {
      return null;
    }
  }

  handleNotificationSnapshot(querySnapshot, source) {
    if (!this.isInitialized) {
      // On initial load, just track existing notifications
      querySnapshot.forEach((doc) => {
        this.seenNotificationIds.add(doc.id);
      });
      return;
    }

    // Process new notifications
    const newNotifications = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const notification = {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt)
      };

      // Check if it's a new, unread notification
      if (!this.seenNotificationIds.has(doc.id) && !notification.isRead) {
        newNotifications.push(notification);
        this.seenNotificationIds.add(doc.id);
      }
    });

    // Trigger notifications for new ones
    if (newNotifications.length > 0) {
      newNotifications.forEach(notification => {
        this.triggerLocalNotification(notification, source);
      });
    }
  }

  async triggerLocalNotification(notification, source) {
    try {

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.message,
          data: {
            notificationId: notification.id,
            type: notification.type || 'general',
            source: `firebase-${source}`,
          },
          sound: 'default',
          badge: 1,
        },
        trigger: null, // Show immediately
      });

      return true;

    } catch (error) {
      return false;
    }
  }

  cleanup() {
    this.unsubscribeFunctions.forEach(unsubscribe => {
      if (unsubscribe) unsubscribe();
    });
    this.unsubscribeFunctions = [];
    this.seenNotificationIds.clear();
    this.isInitialized = false;
  }
}

// Create singleton instance
const simpleListener = new SimpleFirebaseListener();

// Export setup function
export const setupSimpleFirebaseListener = (userId) => {
  return simpleListener.setupListener(userId);
};

// Export test function
export const testSimpleFirebaseListener = async () => {
  try {
    const testNotification = {
      id: 'test-' + Date.now(),
      title: 'Test Firebase Listener 🧪',
      message: 'Simple Firebase listener test',
      type: 'general'
    };

    return await simpleListener.triggerLocalNotification(testNotification, 'test');
  } catch (error) {
    return false;
  }
};