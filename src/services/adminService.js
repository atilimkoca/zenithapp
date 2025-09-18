import { doc, getDoc, setDoc, collection, query, where, getDocs, orderBy, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

// Admin service for managing user approvals
export const adminService = {
  // Get all pending users for admin approval
  getPendingUsers: async () => {
    try {
      const q = query(
        collection(db, 'users'),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const pendingUsers = [];
      
      querySnapshot.forEach((doc) => {
        pendingUsers.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return {
        success: true,
        users: pendingUsers
      };
    } catch (error) {
      console.error('Error getting pending users:', error);
      return {
        success: false,
        error: error.code,
        message: 'Bekleyen kullanıcılar alınırken hata oluştu.'
      };
    }
  },

  // Approve a user
  approveUser: async (userId, adminId) => {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        return {
          success: false,
          message: 'Kullanıcı bulunamadı.'
        };
      }
      
      const userData = userDoc.data();
      
      await setDoc(userRef, {
        ...userData,
        status: 'approved',
        isActive: true,
        approvedAt: new Date().toISOString(),
        approvedBy: adminId,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      return {
        success: true,
        message: 'Kullanıcı başarıyla onaylandı.'
      };
    } catch (error) {
      console.error('Error approving user:', error);
      return {
        success: false,
        error: error.code,
        message: 'Kullanıcı onaylanırken hata oluştu.'
      };
    }
  },

  // Reject a user
  rejectUser: async (userId, adminId, reason = '') => {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        return {
          success: false,
          message: 'Kullanıcı bulunamadı.'
        };
      }
      
      const userData = userDoc.data();
      
      await setDoc(userRef, {
        ...userData,
        status: 'rejected',
        isActive: false,
        rejectedAt: new Date().toISOString(),
        rejectedBy: adminId,
        rejectionReason: reason,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      return {
        success: true,
        message: 'Kullanıcı reddedildi.'
      };
    } catch (error) {
      console.error('Error rejecting user:', error);
      return {
        success: false,
        error: error.code,
        message: 'Kullanıcı reddedilirken hata oluştu.'
      };
    }
  },

  // Get user by ID
  getUserById: async (userId) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      
      if (userDoc.exists()) {
        return {
          success: true,
          user: {
            id: userDoc.id,
            ...userDoc.data()
          }
        };
      } else {
        return {
          success: false,
          message: 'Kullanıcı bulunamadı.'
        };
      }
    } catch (error) {
      console.error('Error getting user:', error);
      return {
        success: false,
        error: error.code,
        message: 'Kullanıcı bilgileri alınırken hata oluştu.'
      };
    }
  },

  // Get all users with filters
  getAllUsers: async (status = null) => {
    try {
      let q;
      
      if (status) {
        q = query(
          collection(db, 'users'),
          where('status', '==', status),
          orderBy('createdAt', 'desc')
        );
      } else {
        q = query(
          collection(db, 'users'),
          orderBy('createdAt', 'desc')
        );
      }
      
      const querySnapshot = await getDocs(q);
      const users = [];
      
      querySnapshot.forEach((doc) => {
        users.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return {
        success: true,
        users: users
      };
    } catch (error) {
      console.error('Error getting users:', error);
      return {
        success: false,
        error: error.code,
        message: 'Kullanıcılar alınırken hata oluştu.'
      };
    }
  },

  // Update user status (for bulk operations)
  updateUserStatus: async (userId, status, adminId, reason = '') => {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        return {
          success: false,
          message: 'Kullanıcı bulunamadı.'
        };
      }
      
      const userData = userDoc.data();
      const updateData = {
        ...userData,
        status: status,
        isActive: status === 'approved',
        updatedAt: new Date().toISOString()
      };
      
      // Add status-specific fields
      if (status === 'approved') {
        updateData.approvedAt = new Date().toISOString();
        updateData.approvedBy = adminId;
      } else if (status === 'rejected') {
        updateData.rejectedAt = new Date().toISOString();
        updateData.rejectedBy = adminId;
        updateData.rejectionReason = reason;
      }
      
      await setDoc(userRef, updateData, { merge: true });
      
      return {
        success: true,
        message: `Kullanıcı durumu ${status} olarak güncellendi.`
      };
    } catch (error) {
      console.error('Error updating user status:', error);
      return {
        success: false,
        error: error.code,
        message: 'Kullanıcı durumu güncellenirken hata oluştu.'
      };
    }
  },

  // Delete user completely (from Firestore only - Firebase Auth deletion must be done from admin backend)
  deleteUser: async (userId, adminId) => {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        return {
          success: false,
          message: 'Kullanıcı bulunamadı.'
        };
      }

      // Delete from Firestore
      await deleteDoc(userRef);
      
      // Note: Firebase Auth user deletion must be done from admin panel backend
      // using Firebase Admin SDK, not from client-side
      
      return {
        success: true,
        message: 'Kullanıcı başarıyla silindi. (Firebase Auth silme işlemi admin panelinden yapılmalıdır.)'
      };
    } catch (error) {
      console.error('Error deleting user:', error);
      return {
        success: false,
        error: error.code,
        message: 'Kullanıcı silinirken hata oluştu.'
      };
    }
  }
};
