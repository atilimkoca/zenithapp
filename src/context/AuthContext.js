import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChange, getCurrentUserData, logoutUser } from '../services/authService';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);
  const [approvalStatus, setApprovalStatus] = useState(null); // pending, approved, rejected
  const [userDataLoaded, setUserDataLoaded] = useState(false); // Track if user data is loaded

  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (authUser) => {
      try {
        if (authUser) {
          // User is signed in
          setUser(authUser);
          setUserDataLoaded(false); // Reset user data loaded state
          
          // Get additional user data from Firestore
          const result = await getCurrentUserData(authUser.uid);
          if (result.success) {
            setUserData(result.userData);
            setApprovalStatus(result.userData.status || 'pending');
          } else {
            // User doesn't exist in Firestore - they were likely deleted from admin panel
            await logoutUser();
            setUser(null);
            setUserData(null);
            setApprovalStatus(null);
            setUserDataLoaded(false);
            return;
          }
          setUserDataLoaded(true); // Mark user data as loaded
        } else {
          // User is signed out
          setUser(null);
          setUserData(null);
          setApprovalStatus(null);
          setUserDataLoaded(false);
        }
      } catch (error) {
        console.error('Auth state change error:', error);
        if (authUser) {
          setUserDataLoaded(true); // Even on error, mark as loaded to avoid infinite loading
        }
      } finally {
        setLoading(false);
        if (initializing) {
          setInitializing(false);
        }
      }
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, [initializing]);

  const value = {
    user,
    userData,
    loading,
    initializing: initializing || (!!user && !userDataLoaded), // Keep initializing true until user data is loaded
    approvalStatus,
    isAuthenticated: !!user,
    isApproved: !!user && approvalStatus === 'approved',
    isPending: !!user && approvalStatus === 'pending',
    isRejected: !!user && approvalStatus === 'rejected',
    setUserData, // Allow manual updates to user data
    setApprovalStatus, // Allow manual updates to approval status
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
