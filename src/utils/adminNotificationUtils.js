// Admin Notification Utility with FCM Support
// This file contains helper functions for admin panel to send notifications

import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import * as Notifications from 'expo-notifications';
import PushNotificationSender from '../services/pushNotificationSender';

// Send notification to specific user with FCM push
export const sendNotificationWithPush = async (userId, title, message, type = 'general') => {
  try {

    // Create notification object
    const notification = {
      title,
      message,
      type,
      userId
    };

    // Send via FCM (this handles both push notification AND Firestore storage)
    const pushResult = await PushNotificationSender.sendPushToUser(userId, notification);
    
    if (pushResult.success) {
      return {
        success: true,
        message: 'Notification sent successfully via FCM',
        pushResult
      };
    } else {
      console.warn('⚠️ FCM failed, trying local notification fallback');
      
      // Fallback: Save to Firestore only (for in-app display)
      const notificationData = {
        userId,
        title,
        message,
        type,
        createdAt: serverTimestamp(),
        isRead: false,
        recipients: 'user'
      };

      const docRef = await addDoc(collection(db, 'notifications'), notificationData);
      
      return {
        success: true,
        message: 'Notification saved (FCM failed, using Firestore only)',
        notificationId: docRef.id
      };
    }

  } catch (error) {
    console.error('❌ Error sending notification with push:', error);
    return {
      success: false,
      message: 'Failed to send notification: ' + error.message
    };
  }
};

// Send broadcast notification to all users with FCM push
export const sendBroadcastNotificationWithPush = async (title, message, type = 'general') => {
  try {

    // Create notification object
    const notification = {
      title,
      message,
      type
    };

    // Send via FCM (this handles both push notification AND Firestore storage)
    const pushResult = await PushNotificationSender.sendBroadcastPush(notification);
    
    if (pushResult.success) {
      return {
        success: true,
        message: 'Broadcast notification sent successfully via FCM',
        pushResult
      };
    } else {
      console.warn('⚠️ FCM broadcast failed, trying local notification fallback');
      
      // Fallback: Save to Firestore only (for in-app display)
      const notificationData = {
        title,
        message,
        type,
        createdAt: serverTimestamp(),
        isRead: false,
        recipients: 'all'
      };

      const docRef = await addDoc(collection(db, 'notifications'), notificationData);
      
      return {
        success: true,
        message: 'Broadcast notification saved (FCM failed, using Firestore only)',
        notificationId: docRef.id
      };
    }

  } catch (error) {
    console.error('❌ Error sending broadcast notification with push:', error);
    return {
      success: false,
      message: 'Failed to send broadcast notification: ' + error.message
    };
  }
};

// Test FCM notification
export const sendTestFCMNotification = async (userId) => {
  try {
    
    const result = await PushNotificationSender.sendTestNotification(userId);
    
    if (result.success) {
      return {
        success: true,
        message: 'FCM test notification sent successfully'
      };
    } else {
      console.warn('⚠️ FCM test failed:', result.error);
      return {
        success: false,
        message: 'FCM test failed: ' + result.error
      };
    }
  } catch (error) {
    console.error('❌ Error sending FCM test:', error);
    return {
      success: false,
      message: 'FCM test error: ' + error.message
    };
  }
};

export const adminNotificationUtils = {
  // Send notification with push notification (FCM)
  sendNotificationWithPush: async (userId, notificationData) => {
    return await sendNotificationWithPush(
      userId, 
      notificationData.title, 
      notificationData.message, 
      notificationData.type
    );
  },

  // Send notification to all users with push (FCM)
  sendBroadcastNotificationWithPush: async (notificationData) => {
    return await sendBroadcastNotificationWithPush(
      notificationData.title, 
      notificationData.message, 
      notificationData.type
    );
  },

  // Send a test notification
  sendTestNotification: async (userId) => {
    return await sendNotificationWithPush(
      userId,
      'Test Bildirimi FCM 🚀',
      'Bu bir FCM test bildirimidir. Bildirim sistemi çalışıyor!',
      'test'
    );
  },

  // Send welcome notification to new users
  sendWelcomeNotification: async (userId, userName) => {
    return await sendNotificationWithPush(
      userId,
      'Zénith Studio\'ya Hoş Geldiniz! 🧘‍♀️',
      `Merhaba ${userName}! Yoga yolculuğunuza başlamaya hazır mısınız? İlk dersinizi hemen rezerve edebilirsiniz.`,
      'welcome'
    );
  },

  // Send lesson reminder notification
  sendLessonReminder: async (userId, lessonName, lessonTime) => {
    return await sendNotificationWithPush(
      userId,
      'Ders Hatırlatması 📅',
      `${lessonName} dersiniz ${lessonTime} saatinde başlayacak. Hazır mısınız?`,
      'lesson'
    );
  },

  // Send credit expiration warning
  sendCreditExpirationWarning: async (userId, expirationDate) => {
    return await sendNotificationWithPush(
      userId,
      'Kredi Süresi Uyarısı ⏰',
      `Kalan ders kredileriniz ${expirationDate} tarihinde sona erecek. Rezervasyon yapmayı unutmayın!`,
      'credit'
    );
  },

  // Send promotion notification to all users
  sendPromotionNotification: async (title, message) => {
    return await sendBroadcastNotificationWithPush(title, message, 'promotion');
  },

  // Send system maintenance notification
  sendMaintenanceNotification: async (maintenanceTime) => {
    return await sendBroadcastNotificationWithPush(
      'Sistem Bakımı 🔧',
      `Sistem bakımı nedeniyle ${maintenanceTime} saatleri arasında uygulama kullanılamayacaktır.`,
      'system'
    );
  },

  // Send lesson booking confirmation
  sendBookingConfirmation: async (userId, lessonName, lessonDate, lessonTime) => {
    return await sendNotificationWithPush(
      userId,
      'Rezervasyon Onaylandı ✅',
      `${lessonName} dersiniz ${lessonDate} tarihinde ${lessonTime} saatinde rezerve edildi.`,
      'lesson'
    );
  },

  // Send lesson cancellation
  sendCancellationNotification: async (userId, lessonName, lessonDate) => {
    return await sendNotificationWithPush(
      userId,
      'Ders İptal Edildi ❌',
      `${lessonDate} tarihindeki ${lessonName} dersiniz iptal edildi. Kredi hesabınıza iade edilmiştir.`,
      'lesson'
    );
  },

  // Send credit added notification
  sendCreditAddedNotification: async (userId, creditsAdded, totalCredits) => {
    return await sendNotificationWithPush(
      userId,
      'Kredi Eklendi 🎟️',
      `Hesabınıza ${creditsAdded} ders kredisi eklendi. Toplam krediniz: ${totalCredits}`,
      'credit'
    );
  }
};