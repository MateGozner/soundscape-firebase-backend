# 🎵 SoundScape - Firebase Backend

Backend infrastructure for the SoundScape application including Firebase Firestore security rules, Cloud Functions, and storage configuration.

## 📋 Project Structure

```
soundscape-firebase-backend/
├── functions/                    # Cloud Functions
│   ├── src/
│   │   ├── index.ts
│   │   ├── user/
│   │   ├── recording/
│   │   ├── social/
│   │   └── notifications/
│   ├── package.json
│   ├── tsconfig.json
│   └── .gitignore
├── firestore/                    # Firestore Rules & Indexes
│   ├── firestore.rules           # Security rules
│   ├── firestore.indexes.json    # Indexes
│   └── schema.md                 # Database schema
├── security/                     # Security configuration
│   ├── auth.md
│   └── security-best-practices.md
├── storage/                      # Storage Rules
│   └── storage.rules             # Cloud Storage rules
├── docs/                         # Documentation
│   ├── SETUP.md
│   ├── ARCHITECTURE.md
│   └── API_REFERENCE.md
├── .firebaserc
├── firebase.json
├── .gitignore
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Firebase CLI installed (`npm install -g firebase-tools`)
- Node.js 14+ and npm
- Firebase account with active project

### Setup

1. **Initialize Firebase Project**
   ```bash
   firebase init
   ```

2. **Login to Firebase**
   ```bash
   firebase login
   ```

3. **Install Dependencies**
   ```bash
   cd functions
   npm install
   ```

4. **Deploy Rules and Functions**
   ```bash
   firebase deploy
   ```

## 📦 Components

### Cloud Firestore

#### Collections Structure

```
users/ {userId}
├── email: string
├── username: string
├── displayName: string
├── profileImageUrl: string
├── bio: string
├── createdAt: timestamp
├── followerCount: number
├── followingCount: number
├── recordingCount: number
├── interests: array
└── isVerified: boolean

recordings/ {recordingId}
├── userId: string (reference)
├── title: string
├── description: string
├── audioUrl: string
├── duration: number
├── latitude: double
├── longitude: double
├── recordedAt: timestamp
├── tags: array
├── likeCount: number
├── commentCount: number
├── isPublic: boolean
└── locationName: string

comments/ {commentId}
├── recordingId: string (reference)
├── userId: string (reference)
├── text: string
├── createdAt: timestamp
└── likeCount: number

reactions/ {reactionId}
├── recordingId: string (reference)
├── userId: string (reference)
├── type: string (like, emoji)
├── emoji: string
└── createdAt: timestamp

activities/ {activityId}
├── userId: string (reference)
├── type: string
├── targetId: string
├── targetType: string
├── createdAt: timestamp
└── metadata: map
```

### Cloud Functions

#### Available Functions

**User Management**
- `onCreate`: Create user profile on signup
- `onUpdate`: Update user statistics
- `onDelete`: Cleanup user data

**Recording Management**
- `uploadRecording`: Handle recording metadata
- `updateRecordingStats`: Update like/comment counts
- `deleteRecording`: Cleanup storage and database

**Social Interactions**
- `onCommentCreate`: Update comment count
- `onReactionCreate`: Update reaction count
- `notifyUser`: Send notifications

**Realtime Updates**
- `updateActivityFeed`: Add activity to user feeds
- `updateUserStats`: Update statistics

### Cloud Storage

#### Bucket Structure

```
soundscape-bucket/
├── recordings/
│   └── {userId}/
│       ├── {recordingId}.m4a
│       ├── {recordingId}.wav
│       └── {recordingId}.metadata.json
├── profiles/
│   └── {userId}/
│       └── profile-image.jpg
└── thumbnails/
    └── {recordingId}/
        └── thumbnail.jpg
```

### Security Rules

#### Firestore Rules Overview

```
- Users can read public data
- Users can only write their own documents
- Recordings require location data
- Comments require authentication
- Activities are server-generated
```

#### Storage Rules Overview

```
- Audio files: only owner can write
- Profile images: only owner can write
- Thumbnails: only cloud functions can write
- All files: authenticated users can read public
```

## 🔐 Security

### Authentication
- Firebase Auth for user management
- Email/Password, Google OAuth, Apple Sign-In
- Custom claims for role management

### Firestore Security Rules
- User-level access control
- Document-level permissions
- Batch operation limits
- Rate limiting

### Storage Security Rules
- Path-based access control
- File size limits
- File type validation
- Public/Private bucket controls

See [SECURITY.md](./security/auth.md) for detailed security information.

## 📝 Firestore Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
    
    // Recordings collection
    match /recordings/{recordingId} {
      allow read: if resource.data.isPublic == true || request.auth.uid == resource.data.userId;
      allow create: if request.auth != null;
      allow update, delete: if request.auth.uid == resource.data.userId;
    }
    
    // Comments collection
    match /comments/{commentId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth.uid == resource.data.userId;
    }
    
    // Reactions collection
    match /reactions/{reactionId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow delete: if request.auth.uid == resource.data.userId;
    }
    
    // Activities collection
    match /activities/{activityId} {
      allow read: if request.auth.uid == resource.data.userId;
      allow write: if false; // Only Cloud Functions
    }
  }
}
```

## 📊 Indexes

Firestore automatically creates single field indexes. For composite queries, define indexes in `firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "recordings",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "latitude",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "longitude",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "recordedAt",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "recordings",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "userId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "recordedAt",
          "order": "DESCENDING"
        }
      ]
    }
  ]
}
```

## 🔧 Cloud Functions

### Example Function

```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

// Create user profile on signup
export const createUserProfile = functions.auth.user().onCreate(async (user) => {
  const userData = {
    id: user.uid,
    email: user.email,
    displayName: user.displayName || '',
    profileImageUrl: user.photoURL || '',
    bio: '',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    followerCount: 0,
    followingCount: 0,
    recordingCount: 0,
    interests: [],
    isVerified: false,
  };

  await admin.firestore().collection('users').doc(user.uid).set(userData);
});

// Update recording statistics
export const updateRecordingStats = functions.firestore
  .document('comments/{commentId}')
  .onCreate(async (snap, context) => {
    const comment = snap.data();
    const recordingRef = admin
      .firestore()
      .collection('recordings')
      .doc(comment.recordingId);

    await recordingRef.update({
      commentCount: admin.firestore.FieldValue.increment(1),
    });
  });
```

## 📚 Documentation

- [Setup Guide](./docs/SETUP.md)
- [Architecture Overview](./docs/ARCHITECTURE.md)
- [API Reference](./docs/API_REFERENCE.md)
- [Security Best Practices](./security/security-best-practices.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)

## 🧪 Testing

### Test Cloud Functions Locally

```bash
# Install Firebase Emulator
firebase init emulators

# Run emulator
firebase emulators:start

# Run tests
npm test
```

### Test Firestore Rules

```bash
# Use Firebase emulator
firebase emulators:start --only firestore

# Run rule tests
npm run test:rules
```

## 🚀 Deployment

### Deploy All

```bash
firebase deploy
```

### Deploy Specific Components

```bash
# Deploy functions only
firebase deploy --only functions

# Deploy rules only
firebase deploy --only firestore:rules,storage

# Deploy specific function
firebase deploy --only functions:createUserProfile
```

### Environment Variables

Create `.env` file or use Firebase config:

```bash
firebase functions:config:set \
  sendgrid.key="your-key" \
  stripe.secret="your-secret"
```

## 📊 Monitoring

### View Logs

```bash
firebase functions:log
```

### Monitor Usage

```bash
firebase open
# Then navigate to: Project Settings > Usage
```

### Setup Alerts

Configure alerts in Firebase Console:
- Functions errors
- Quota usage
- Performance metrics

## 🤝 Contributing

1. Create feature branch
2. Test changes locally
3. Deploy to staging first
4. Create PR for review
5. Deploy to production

## 📄 License

MIT License - See LICENSE file

## 📞 Support

For issues and questions:
- GitHub Issues: [Create Issue](https://github.com/soundscape/soundscape-firebase-backend/issues)
- Email: backend@soundscape.app

---

**Made with ❤️ by the SoundScape Team**
