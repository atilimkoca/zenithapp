# Firebase Setup Guide for Zenith Mobile App

## 📋 Steps to Connect Your Firebase Project

### 1. Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter project name: `zenith-yoga-app` (or your preferred name)
4. Enable Google Analytics if desired
5. Create the project

### 2. Enable Authentication
1. In your Firebase project, go to **Authentication** > **Sign-in method**
2. Enable **Email/Password** authentication
3. Optionally enable other providers (Google, Facebook, etc.)

### 3. Create Firestore Database
1. Go to **Firestore Database**
2. Click **Create database**
3. Choose **Start in test mode** (for development)
4. Select a location (choose closest to your users)

### 4. Get Firebase Configuration
1. Go to **Project settings** (gear icon)
2. Scroll down to **Your apps** section
3. Click **Web app** icon (`</>`)
4. Register your app with name: `Zenith Mobile App`
5. Copy the Firebase configuration object

### 5. Update Firebase Configuration
Replace the configuration in `src/config/firebase.js`:

```javascript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project-id.firebaseapp.com", 
  projectId: "your-actual-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "your-actual-sender-id",
  appId: "your-actual-app-id"
};
```

### 6. Firestore Security Rules (Optional for Development)
For development, you can use these relaxed rules in **Firestore Database** > **Rules**:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Add more collection rules as needed
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 7. Test the Connection
1. Save your configuration changes
2. Run the app: `npx expo start`
3. Try registering a new user
4. Check Firebase Console > Authentication to see the new user
5. Check Firestore Database > Data to see user document

## 🔒 Security Considerations

### For Production:
1. **Firestore Rules**: Implement proper security rules
2. **API Keys**: Consider using Firebase App Check
3. **Environment Variables**: Store sensitive config in environment variables
4. **Email Verification**: Enable email verification for new users

### Recommended Firestore Rules for Production:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null 
        && request.auth.uid == userId
        && request.auth.token.email_verified == true;
    }
    
    // Classes collection - users can read all, but not write
    match /classes/{classId} {
      allow read: if request.auth != null;
      allow write: if false; // Only admins can write (handle via Cloud Functions)
    }
    
    // Bookings - users can only see their own bookings
    match /bookings/{bookingId} {
      allow read, write: if request.auth != null 
        && resource.data.userId == request.auth.uid;
    }
  }
}
```

## 📊 Database Structure

The app creates this Firestore structure:

```
/users/{userId}
  - uid: string
  - email: string
  - firstName: string
  - lastName: string
  - phone: string
  - displayName: string
  - membershipType: string
  - joinDate: timestamp
  - lastLoginAt: timestamp
  - totalClasses: number
  - isActive: boolean
  - preferences: object
    - notifications: boolean
    - emailUpdates: boolean
```

## 🚀 Next Steps

After Firebase is connected, you can:

1. **Add Class Booking**: Create classes collection and booking system
2. **Push Notifications**: Add Firebase Cloud Messaging
3. **Analytics**: Implement Firebase Analytics
4. **Crashlytics**: Add crash reporting
5. **Remote Config**: For feature flags and app configuration
6. **Storage**: For user profile images and class photos

## 🛠️ Troubleshooting

### Common Issues:
1. **"Firebase is not initialized"**: Check firebase.js configuration
2. **Auth errors**: Verify Authentication is enabled in Firebase Console
3. **Firestore permission errors**: Check database rules
4. **Network errors**: Verify internet connection and Firebase project status

### Debug Mode:
Enable Firebase debugging by adding to firebase.js:
```javascript
import { connectAuthEmulator } from 'firebase/auth';
import { connectFirestoreEmulator } from 'firebase/firestore';

// Only in development
if (__DEV__) {
  connectAuthEmulator(auth, 'http://localhost:9099');
  connectFirestoreEmulator(db, 'localhost', 8080);
}
```

## 📱 Features Implemented

✅ **User Registration** with email/password  
✅ **User Login** with email/password  
✅ **Password Reset** via email  
✅ **User Profile** stored in Firestore  
✅ **Authentication State Management**  
✅ **Auto Login/Logout** based on auth state  
✅ **Error Handling** with Turkish messages  
✅ **Loading States** for better UX  

## 🔄 Environment Variables (Optional)

For better security, create `.env` file:
```
FIREBASE_API_KEY=your-api-key
FIREBASE_AUTH_DOMAIN=your-auth-domain
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-storage-bucket
FIREBASE_MESSAGING_SENDER_ID=your-sender-id
FIREBASE_APP_ID=your-app-id
```

Then update firebase.js to use environment variables.
