import * as Notifications from 'expo-notifications';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';

// Service specifically for handling Firebase notifications and triggering local notifications
export const firebaseNotificationListener = {
  // Track which notifications we've already seen to detect new ones
  seenNotificationIds: new Set(),
  isInitialized: false,

  // Setup real-time listener for user notifications from web admin panel
  setupRealtimeListener: (userId) => {
    if (!userId) {
      console.warn('⚠️ No userId provided for notification listener');
      return null;
    }


    // Query for user-specific notifications (created from web admin)
    const userQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    // Query for broadcast notifications (recipients: "all")
    const broadcastQuery = query(
      collection(db, 'notifications'),
      where('recipients', '==', 'all'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    // Function to handle new notifications
    const handleNewNotifications = (notifications, queryType) => {
      if (!firebaseNotificationListener.isInitialized) {
        // On initial load, just track existing notifications
        notifications.forEach(notif => {
          firebaseNotificationListener.seenNotificationIds.add(notif.id);
        });
        return;
      }

      // Check for truly new notifications
      const newNotifications = notifications.filter(notif => {
        return !firebaseNotificationListener.seenNotificationIds.has(notif.id) && 
               !notif.isRead; // Only show unread notifications
      });

      if (newNotifications.length > 0) {
        
        newNotifications.forEach(async (notif) => {
          // Add to seen set
          firebaseNotificationListener.seenNotificationIds.add(notif.id);
          
          // Trigger local notification
          await firebaseNotificationListener.triggerLocalNotification(notif, queryType);
        });
      }
    };

    // Set up user-specific notifications listener
    const unsubscribeUser = onSnapshot(
      userQuery, 
      (querySnapshot) => {
        const notifications = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          notifications.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt)
          });
        });

        handleNewNotifications(notifications, 'user');
      },
      (error) => {
        console.error('❌ User notifications listener error:', error);
      }
    );

    // Set up broadcast notifications listener
    const unsubscribeBroadcast = onSnapshot(
      broadcastQuery,
      (querySnapshot) => {
        const notifications = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          notifications.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt)
          });
        });

        handleNewNotifications(notifications, 'broadcast');
      },
      (error) => {
        console.error('❌ Broadcast notifications listener error:', error);
      }
    );

    // Mark as initialized after a short delay to avoid initial load notifications
    setTimeout(() => {
      firebaseNotificationListener.isInitialized = true;
    }, 2000);

    // Return cleanup function
    return () => {
      unsubscribeUser();
      unsubscribeBroadcast();
      firebaseNotificationListener.seenNotificationIds.clear();
      firebaseNotificationListener.isInitialized = false;
    };
  },

  // Trigger a local notification that appears on the phone
  triggerLocalNotification: async (notification, source = 'firebase') => {
    try {

      // Use direct import instead of require
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.message,
          data: {
            notificationId: notification.id,
            type: notification.type || 'general',
            source: `firebase-${source}`,
            userId: notification.userId,
          },
          sound: 'default',
          badge: 1,
        },
        trigger: null, // Show immediately
      });

      
      return {
        success: true,
        notificationId: notificationId
      };

    } catch (error) {
      console.error('❌ Failed to trigger local notification:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Manual test function to verify the listener is working
  testListener: async (userId) => {
    
    // Simulate a new notification by triggering a local notification
    const testNotification = {
      id: 'test-' + Date.now(),
      title: 'Test Firebase Listener 🧪',
      message: 'Bu bildirim Firebase listener\'ının çalıştığını gösterir',
      type: 'general',
      createdAt: new Date(),
      userId: userId
    };

    return await firebaseNotificationListener.triggerLocalNotification(testNotification, 'test');
  }
};

// Export the setup function for easy use
export const setupFirebaseNotificationListener = (userId) => {
  return firebaseNotificationListener.setupRealtimeListener(userId);
};