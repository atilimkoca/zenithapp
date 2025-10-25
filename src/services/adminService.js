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

  // Approve a user with package assignment
  approveUser: async (userId, adminId, packageData = null) => {
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
      const now = new Date();
      
      // Calculate package expiry date (30 days from now)
      const expiryDate = new Date(now);
      expiryDate.setDate(expiryDate.getDate() + 30);
      
      const updateData = {
        ...userData,
        status: 'approved',
        isActive: true,
        approvedAt: now.toISOString(),
        approvedBy: adminId,
        updatedAt: now.toISOString()
      };
      
      // If package is assigned during approval
      if (packageData && packageData.id) {
        // Extract lesson count - try multiple field names for compatibility
        const lessonCount = packageData.lessonCount || packageData.lessons || packageData.classes || 0;

        updateData.packageInfo = {
          packageId: packageData.id,
          packageName: packageData.name || 'Bilinmeyen Paket',
          packageType: packageData.packageType || 'group', // Include package type
          lessonCount: lessonCount,
          assignedAt: now.toISOString(),
          expiryDate: expiryDate.toISOString()
        };
        updateData.remainingClasses = lessonCount;
        updateData.lessonCredits = lessonCount;
      } else {
        // Set expiry date even without package
        updateData.packageInfo = {
          packageId: null,
          packageName: 'Paket Atanmadı',
          packageType: null,
          lessonCount: 0,
          assignedAt: now.toISOString(),
          expiryDate: expiryDate.toISOString()
        };
        updateData.remainingClasses = 0;
        updateData.lessonCredits = 0;
      }
      
      await setDoc(userRef, updateData, { merge: true });
      
      return {
        success: true,
        message: 'Kullanıcı başarıyla onaylandı ve paket atandı.'
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

  // Renew user package
  renewUserPackage: async (userId, packageData, adminId) => {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        return {
          success: false,
          message: 'Kullanıcı bulunamadı.'
        };
      }
      
      // Validate package data
      if (!packageData || !packageData.id) {
        return {
          success: false,
          message: 'Geçersiz paket verisi.'
        };
      }

      // Extract lesson count - try multiple field names for compatibility
      const lessonCount = packageData.lessonCount || packageData.lessons || packageData.classes || 0;
      
      if (lessonCount <= 0) {
        console.warn('⚠️ Package has no lessons:', packageData);
        return {
          success: false,
          message: 'Paket ders sayısı belirtilmemiş. Lütfen paketi kontrol edin.'
        };
      }
      
      const userData = userDoc.data();
      const now = new Date();
      
      // Calculate new expiry date (30 days from now)
      const expiryDate = new Date(now);
      expiryDate.setDate(expiryDate.getDate() + 30);
      
      const updateData = {
        packageInfo: {
          packageId: packageData.id,
          packageName: packageData.name || 'Bilinmeyen Paket',
          packageType: packageData.packageType || 'group', // Include package type
          lessonCount: lessonCount,
          assignedAt: now.toISOString(),
          expiryDate: expiryDate.toISOString(),
          renewedBy: adminId
        },
        remainingClasses: lessonCount,
        lessonCredits: lessonCount,
        updatedAt: now.toISOString()
      };
      
      await setDoc(userRef, updateData, { merge: true });
      
      return {
        success: true,
        message: 'Paket başarıyla yenilendi.'
      };
    } catch (error) {
      console.error('Error renewing package:', error);
      return {
        success: false,
        error: error.code,
        message: 'Paket yenilenirken hata oluştu.'
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
        const userData = doc.data();
        
        // Only include regular users (members), exclude admins and trainers
        if (userData.role !== 'admin' && userData.role !== 'instructor') {
          users.push({
            id: doc.id,
            ...userData
          });
        }
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
  },

  // Get user statistics for admin dashboard
  getUserStats: async () => {
    try {
      const q = query(collection(db, 'users'));
      const querySnapshot = await getDocs(q);
      
      let total = 0;
      let pending = 0;
      let approved = 0;
      let rejected = 0;
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Only count regular users (members), exclude admins and trainers
        if (data.role === 'admin' || data.role === 'instructor') {
          return; // Skip admins and trainers
        }
        
        total++;
        
        switch (data.status) {
          case 'pending':
            pending++;
            break;
          case 'approved':
            approved++;
            break;
          case 'rejected':
            rejected++;
            break;
          default:
            // Count users without status as approved (legacy users)
            if (!data.status) {
              approved++;
            }
            break;
        }
      });
      
      return {
        success: true,
        data: {
          total,
          pending,
          approved,
          rejected
        }
      };
    } catch (error) {
      console.error('Error getting user stats:', error);
      return {
        success: false,
        error: error.code,
        message: 'Kullanıcı istatistikleri alınırken hata oluştu.'
      };
    }
  },

  // Migration function: Update all users' packageInfo with packageType from their assigned packages
  migrateUserPackageTypes: async () => {
    try {
      console.log('🔄 Starting migration: Adding packageType to users...');

      // Get all users
      const usersQuery = query(collection(db, 'users'));
      const usersSnapshot = await getDocs(usersQuery);

      // Get all packages
      const packagesQuery = query(collection(db, 'packages'));
      const packagesSnapshot = await getDocs(packagesQuery);

      // Create a map of packageId -> packageType
      const packageTypeMap = {};
      packagesSnapshot.forEach((pkgDoc) => {
        const pkgData = pkgDoc.data();
        packageTypeMap[pkgDoc.id] = pkgData.packageType || 'group';
      });

      console.log('📦 Package type map:', packageTypeMap);

      let updatedCount = 0;
      let skippedCount = 0;
      const updates = [];

      // Process each user
      usersSnapshot.forEach((userDoc) => {
        const userData = userDoc.data();

        // Check if user has packageInfo and a packageId
        if (userData.packageInfo && userData.packageInfo.packageId) {
          const packageId = userData.packageInfo.packageId;
          const packageType = packageTypeMap[packageId];

          // Only update if packageType is missing
          if (!userData.packageInfo.packageType && packageType) {
            console.log(`✓ Updating user ${userDoc.id}: package ${packageId} -> ${packageType}`);

            const updatedPackageInfo = {
              ...userData.packageInfo,
              packageType: packageType
            };

            updates.push(
              setDoc(doc(db, 'users', userDoc.id), {
                packageInfo: updatedPackageInfo
              }, { merge: true })
            );

            updatedCount++;
          } else {
            console.log(`⊘ Skipping user ${userDoc.id}: already has packageType or package not found`);
            skippedCount++;
          }
        } else {
          console.log(`⊘ Skipping user ${userDoc.id}: no package assigned`);
          skippedCount++;
        }
      });

      // Execute all updates
      if (updates.length > 0) {
        await Promise.all(updates);
      }

      console.log('✅ Migration complete!');
      console.log(`   Updated: ${updatedCount} users`);
      console.log(`   Skipped: ${skippedCount} users`);

      return {
        success: true,
        message: `Migration complete: ${updatedCount} users updated, ${skippedCount} skipped`,
        updated: updatedCount,
        skipped: skippedCount
      };
    } catch (error) {
      console.error('❌ Error during migration:', error);
      return {
        success: false,
        error: error.code,
        message: 'Migration failed: ' + error.message
      };
    }
  }
};
