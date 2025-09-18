import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  addDoc, 
  getDocs,
  limit,
  startAfter,
  getDoc
} from 'firebase/firestore';
import * as Notifications from 'expo-notifications';
import { db } from '../config/firebase';

export const notificationService = {
  // Get notifications for a user with pagination
  getUserNotifications: async (userId, limitCount = 20, lastDoc = null) => {
    try {
      
      // Use fallback query to avoid index issues while index is building
      
      // Query 1: Get notifications specifically for this user
      const userSpecificQuery = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        limit(limitCount)
      );
      
      // Query 2: Get broadcast notifications (recipients: "all")
      const broadcastQuery = query(
        collection(db, 'notifications'),
        where('recipients', '==', 'all'),
        limit(limitCount)
      );
      
      
      const [userSpecificSnapshot, broadcastSnapshot] = await Promise.all([
        getDocs(userSpecificQuery),
        getDocs(broadcastQuery)
      ]);
      
      const notifications = [];
      
      // Process user-specific notifications
      userSpecificSnapshot.forEach((doc) => {
        const data = doc.data();
        notifications.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
          isRead: data.isRead || false,
          type: data.type || 'general'
        });
      });
      
      // Process broadcast notifications
      broadcastSnapshot.forEach((doc) => {
        const data = doc.data();
        notifications.push({
          id: doc.id,
          ...data,
          userId: userId, // Add userId for consistency
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
          isRead: data.isRead || false,
          type: data.type === 'info' ? 'general' : (data.type || 'general'), // Convert 'info' to 'general'
          recipients: data.recipients
        });
      });

      // Remove duplicates and sort manually on client side (newest first)
      const uniqueNotifications = notifications.filter((notif, index, self) => 
        index === self.findIndex(n => n.id === notif.id)
      );
      
      uniqueNotifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      // Limit after sorting
      const limitedNotifications = uniqueNotifications.slice(0, limitCount);
      
      
      return {
        success: true,
        notifications: limitedNotifications,
        lastDoc: null, // Disable pagination for fallback
        hasMore: uniqueNotifications.length > limitCount,
        usingFallback: true
      };
      
    } catch (error) {
      console.error('❌ Error fetching notifications:', error);
      return {
        success: false,
        error: error.code,
        message: 'Bildirimler yüklenirken hata oluştu.',
        notifications: []
      };
    }
  },

  // Listen to real-time notifications for a user (DISABLED - using simple Firebase listener instead)
  listenToUserNotifications: (userId, callback) => {
    try {
      
      // Listen to user-specific notifications
      const userSpecificQuery = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        limit(25)
      );
      
      // Listen to broadcast notifications
      const broadcastQuery = query(
        collection(db, 'notifications'),
        where('recipients', '==', 'all'),
        limit(25)
      );

      let userNotifications = [];
      let broadcastNotifications = [];

      const processNotifications = (isInitialLoad = false) => {
        const allNotifications = [
          ...userNotifications.map(n => ({ ...n, source: 'user-specific' })),
          ...broadcastNotifications.map(n => ({ 
            ...n, 
            userId: userId, // Add userId for consistency
            source: 'broadcast',
            type: n.type === 'info' ? 'general' : (n.type || 'general')
          }))
        ];

        // Remove duplicates and sort
        const uniqueNotifications = allNotifications.filter((notif, index, self) => 
          index === self.findIndex(n => n.id === notif.id)
        );
        
        uniqueNotifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        // NOTE: Removed local notification triggering to prevent duplicates
        // The simpleFirebaseListener handles this now

        const unreadCount = uniqueNotifications.filter(notif => !notif.isRead).length;
        
        
        callback({
          success: true,
          notifications: uniqueNotifications,
          unreadCount
        });
      };

      // Set up user-specific listener
      const unsubscribeUser = onSnapshot(userSpecificQuery, (querySnapshot) => {
        const wasInitialLoad = userNotifications.length === 0;
        userNotifications = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          userNotifications.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
            isRead: data.isRead || false
          });
        });
        processNotifications(wasInitialLoad);
      }, (error) => {
        console.error('❌ User-specific notifications error:', error);
      });

      // Set up broadcast listener
      const unsubscribeBroadcast = onSnapshot(broadcastQuery, (querySnapshot) => {
        const wasInitialLoad = broadcastNotifications.length === 0;
        broadcastNotifications = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          broadcastNotifications.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
            isRead: data.isRead || false
          });
        });
        processNotifications(wasInitialLoad);
      }, (error) => {
        console.error('❌ Broadcast notifications error:', error);
      });

      // Return cleanup function for both listeners
      return () => {
        unsubscribeUser();
        unsubscribeBroadcast();
      };

    } catch (error) {
      console.error('❌ Error setting up notifications listener:', error);
      return null;
    }
  },

  // Mark notification as read
  markAsRead: async (notificationId) => {
    try {
      
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        isRead: true,
        readAt: new Date()
      });

      
      return {
        success: true,
        message: 'Bildirim okundu olarak işaretlendi.'
      };
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
      return {
        success: false,
        error: error.code,
        message: 'Bildirim güncellenirken hata oluştu.'
      };
    }
  },

  // Mark all notifications as read for a user
  markAllAsRead: async (userId) => {
    try {
      
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('isRead', '==', false)
      );

      const querySnapshot = await getDocs(q);
      
      const promises = querySnapshot.docs.map(docRef => 
        updateDoc(docRef.ref, {
          isRead: true,
          readAt: new Date()
        })
      );

      await Promise.all(promises);
      
      
      return {
        success: true,
        message: 'Tüm bildirimler okundu olarak işaretlendi.'
      };
    } catch (error) {
      console.error('❌ Error marking all notifications as read:', error);
      return {
        success: false,
        error: error.code,
        message: 'Bildirimler güncellenirken hata oluştu.'
      };
    }
  },

  // Get unread notification count
  getUnreadCount: async (userId) => {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('isRead', '==', false)
      );

      const querySnapshot = await getDocs(q);
      const count = querySnapshot.size;
      
      
      return {
        success: true,
        count
      };
    } catch (error) {
      console.error('❌ Error getting unread count:', error);
      return {
        success: false,
        error: error.code,
        count: 0
      };
    }
  },

  // Send notification (for admin use)
  sendNotification: async (notificationData) => {
    try {
      
      const notification = {
        ...notificationData,
        isRead: false,
        createdAt: new Date(),
        type: notificationData.type || 'general', // general, lesson, credit, promotion
        priority: notificationData.priority || 'normal' // low, normal, high, urgent
      };

      const docRef = await addDoc(collection(db, 'notifications'), notification);
      
      
      return {
        success: true,
        notificationId: docRef.id,
        message: 'Bildirim gönderildi.'
      };
    } catch (error) {
      console.error('❌ Error sending notification:', error);
      return {
        success: false,
        error: error.code,
        message: 'Bildirim gönderilirken hata oluştu.'
      };
    }
  },

  // Send bulk notifications (for admin to send to multiple users)
  sendBulkNotification: async (userIds, notificationData) => {
    try {
      
      const promises = userIds.map(userId => 
        notificationService.sendNotification({
          ...notificationData,
          userId
        })
      );

      const results = await Promise.all(promises);
      const successCount = results.filter(result => result.success).length;
      
      
      return {
        success: true,
        totalSent: successCount,
        totalUsers: userIds.length,
        message: `${successCount}/${userIds.length} kullanıcıya bildirim gönderildi.`
      };
    } catch (error) {
      console.error('❌ Error sending bulk notification:', error);
      return {
        success: false,
        error: error.code,
        message: 'Toplu bildirim gönderilirken hata oluştu.'
      };
    }
  },

  // Get notification types for filtering
  getNotificationTypes: () => {
    return [
      { key: 'general', label: 'Genel', icon: 'information-circle-outline' },
      { key: 'lesson', label: 'Ders', icon: 'fitness-outline' },
      { key: 'credit', label: 'Kredi', icon: 'ticket-outline' },
      { key: 'promotion', label: 'Promosyon', icon: 'gift-outline' },
      { key: 'system', label: 'Sistem', icon: 'settings-outline' }
    ];
  }
};

// Firebase notification structure for reference:
/*
notifications/{notificationId}:
{
  userId: string,              // Target user ID
  title: string,               // Notification title
  message: string,             // Notification content
  type: string,                // general, lesson, credit, promotion, system
  priority: string,            // low, normal, high, urgent
  isRead: boolean,             // Read status
  createdAt: timestamp,        // Creation time
  readAt: timestamp?,          // Read time (optional)
  data: object?,               // Additional data (optional)
  actionUrl: string?,          // Deep link URL (optional)
  imageUrl: string?            // Notification image (optional)
}
*/