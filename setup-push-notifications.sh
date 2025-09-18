#!/bin/bash

echo "🔧 Setting up Push Notifications for Zenith App"
echo "============================================="

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo "❌ EAS CLI is not installed. Installing..."
    npm install -g @expo/eas-cli
else
    echo "✅ EAS CLI is already installed"
fi

# Login to EAS (if not already logged in)
echo "🔑 Please login to EAS CLI:"
eas login

# Initialize EAS project
echo "🚀 Initializing EAS project..."
eas build:configure

echo ""
echo "📋 Next Steps:"
echo "=============="
echo "1. Run 'eas build --platform ios --profile development' to build for iOS"
echo "2. Run 'eas build --platform android --profile development' to build for Android"
echo "3. Install the development build on your device"
echo "4. The app will automatically register for push notifications"
echo "5. Use the Admin Panel in the app to test push notifications"
echo ""
echo "⚠️  Important Notes:"
echo "- For iOS: You need an Apple Developer account"
echo "- For Android: Development builds support push notifications"
echo "- Expo Go has limitations with push notifications"
echo ""
echo "🔗 Useful Commands:"
echo "eas build:list                    # List all builds"
echo "eas device:list                   # List registered devices"
echo "eas build --platform all          # Build for both platforms"