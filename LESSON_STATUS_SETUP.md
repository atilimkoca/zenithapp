# Lesson Status Setup Guide

## Firebase Settings for Lesson Status

To enable lesson status display (Başlangıç, Orta, İleri), you need to add lesson status configuration to your Firebase Firestore.

### 1. Create Settings Collection

In your Firestore console, create a `settings` collection if it doesn't exist.

### 2. Add Lesson Status Document

Create a document with ID `lessonStatus` in the `settings` collection:

```json
{
  "levels": [
    {
      "id": "beginner",
      "name": "Başlangıç",
      "color": "#10B981"
    },
    {
      "id": "intermediate", 
      "name": "Orta",
      "color": "#F59E0B"
    },
    {
      "id": "advanced",
      "name": "İleri", 
      "color": "#EF4444"
    }
  ],
  "description": "Lesson difficulty/status levels for the mobile app",
  "lastUpdated": "2025-01-09T00:00:00.000Z"
}
```

### 3. Update Lesson Documents

In your `lessons` collection, make sure each lesson document has a `level` field:

```json
{
  "title": "Morning Yoga",
  "type": "Yoga",
  "level": "beginner",
  // ... other fields
}
```

### 4. Default Behavior

If the Firebase settings are not available, the app will use these defaults:
- Başlangıç (Green: #10B981)
- Orta (Orange: #F59E0B) 
- İleri (Red: #EF4444)

### 5. Display

The app will now show two badges for each lesson:
1. **Lesson Type Badge** (Green): Shows the lesson type (Pilates, Yoga, etc.)
2. **Status Badge** (Colored): Shows the difficulty level (Başlangıç, Orta, İleri)

## Updated Features

✅ Removed "güç artışı" and "zihin ve beden uyumu için yoga pratiği" texts
✅ Added lesson status fetching from Firebase
✅ Display both lesson type and status badges
✅ Color-coded status levels
✅ Fallback to default values if Firebase data not available

## Service Functions

- `fetchLessonStatus()`: Fetches status levels from Firebase
- `getLessonStatus()`: Public function to get status levels
- Enhanced `getAllLessons()`: Now includes status information for each lesson
