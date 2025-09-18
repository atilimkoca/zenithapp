import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

class PushNotificationSender {
  constructor() {
    // Expo's push notification endpoint
    this.EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
  }

  // Send push notification to specific user
  async sendPushToUser(userId, notification) {
    try {

      // Get user's push token from Firestore
      const pushToken = await this.getUserPushToken(userId);
      
      if (!pushToken) {
        console.warn('⚠️ No push token found for user:', userId);
        return { success: false, error: 'No push token' };
      }

      // Send via Expo Push API
      const result = await this.sendViaExpoPush([pushToken], notification);
      
      // Also save to Firestore for in-app display
      await this.saveNotificationToFirestore({
        ...notification,
        userId: userId,
        recipients: 'user'
      });

      return result;

    } catch (error) {
      console.error('❌ Error sending push to user:', error);
      return { success: false, error: error.message };
    }
  }

  // Send broadcast push notification to all users
  async sendBroadcastPush(notification) {
    try {

      // Get all user push tokens
      const pushTokens = await this.getAllPushTokens();
      
      if (pushTokens.length === 0) {
        console.warn('⚠️ No push tokens found for broadcast');
        return { success: false, error: 'No recipients' };
      }

      // Send via Expo Push API
      const result = await this.sendViaExpoPush(pushTokens, notification);
      
      // Save to Firestore for in-app display
      await this.saveNotificationToFirestore({
        ...notification,
        recipients: 'all'
      });

      return result;

    } catch (error) {
      console.error('❌ Error sending broadcast push:', error);
      return { success: false, error: error.message };
    }
  }

  // Get user's push token from Firestore
  async getUserPushToken(userId) {
    try {
      const userQuery = query(
        collection(db, 'users'),
        where('__name__', '==', userId)
      );
      
      const querySnapshot = await getDocs(userQuery);
      
      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data();
        return userData.pushToken || null;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error getting user push token:', error);
      return null;
    }
  }

  // Get all push tokens for broadcast
  async getAllPushTokens() {
    try {
      const usersQuery = query(
        collection(db, 'users'),
        where('notificationsEnabled', '==', true)
      );
      
      const querySnapshot = await getDocs(usersQuery);
      const tokens = [];
      
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        if (userData.pushToken) {
          tokens.push(userData.pushToken);
        }
      });
      
      return tokens;
      
    } catch (error) {
      console.error('❌ Error getting all push tokens:', error);
      return [];
    }
  }

  // Send notification via Expo Push API
  async sendViaExpoPush(pushTokens, notification) {
    try {
      const messages = pushTokens.map(token => ({
        to: token,
        title: notification.title,
        body: notification.message,
        data: {
          notificationId: notification.id || Date.now().toString(),
          type: notification.type || 'general',
          source: 'fcm-push'
        },
        sound: 'default',
        badge: 1,
        priority: 'high'
      }));


      const response = await fetch(this.EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });

      const result = await response.json();
      
      if (response.ok) {
        return { success: true, data: result };
      } else {
        console.error('❌ Push notification error:', result);
        return { success: false, error: result };
      }

    } catch (error) {
      console.error('❌ Error sending via Expo Push:', error);
      return { success: false, error: error.message };
    }
  }

  // Save notification to Firestore (for in-app display)
  async saveNotificationToFirestore(notification) {
    try {
      const notificationData = {
        title: notification.title,
        message: notification.message,
        type: notification.type || 'general',
        recipients: notification.recipients || 'user',
        createdAt: serverTimestamp(),
        isRead: false,
        ...(notification.userId && { userId: notification.userId })
      };

      const docRef = await addDoc(collection(db, 'notifications'), notificationData);
      
      return docRef.id;
    } catch (error) {
      console.error('❌ Error saving notification to Firestore:', error);
      return null;
    }
  }

  // Test function - send notification to yourself
  async sendTestNotification(userId) {
    const testNotification = {
      title: "FCM Test Notification 🚀",
      message: "This is a test push notification from your admin panel!",
      type: "test"
    };

    return await this.sendPushToUser(userId, testNotification);
  }
}

// Export singleton instance
export default new PushNotificationSender();