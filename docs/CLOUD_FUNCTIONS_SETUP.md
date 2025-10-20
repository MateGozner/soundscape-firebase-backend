# Firebase Cloud Functions Configuration

## Installation & Setup

### Prerequisites
- Node.js 14+ (Firebase recommends Node 18+)
- Firebase CLI
- TypeScript knowledge (optional but recommended)

### Setup Instructions

1. **Navigate to functions directory**
   ```bash
   cd functions
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   firebase functions:config:set stripe.secret="your-secret-key"
   firebase functions:config:set sendgrid.key="your-api-key"
   ```

4. **Deploy functions**
   ```bash
   firebase deploy --only functions
   ```

## Available Cloud Functions

### User Management

#### `createUserProfile`
- **Trigger**: Auth onCreate
- **Purpose**: Create user profile when new user signs up
- **Payload**: User object from Firebase Auth

#### `deleteUserData`
- **Trigger**: Auth onDelete
- **Purpose**: Clean up user data when account is deleted

### Recording Management

#### `onRecordingCreate`
- **Trigger**: Firestore onCreate `/recordings/{recordingId}`
- **Purpose**: Create activity record and update user stats

#### `onRecordingDelete`
- **Trigger**: Firestore onDelete `/recordings/{recordingId}`
- **Purpose**: Delete associated data and clean up storage

#### `updateRecordingStats`
- **Trigger**: Firestore onChange `/comments/{commentId}`
- **Purpose**: Update recording comment count

### Social Features

#### `onCommentCreate`
- **Trigger**: Firestore onCreate `/comments/{commentId}`
- **Purpose**: Update recording stats and create activity

#### `onReactionCreate`
- **Trigger**: Firestore onCreate `/reactions/{reactionId}`
- **Purpose**: Update reaction count and create activity

#### `onFollowCreate`
- **Trigger**: Firestore onCreate `/follows/{followId}`
- **Purpose**: Update follower counts and create activity

### Notifications

#### `sendCommentNotification`
- **Trigger**: Firestore onCreate `/comments/{commentId}`
- **Purpose**: Send notification to recording owner

#### `sendReactionNotification`
- **Trigger**: Firestore onCreate `/reactions/{reactionId}`
- **Purpose**: Send notification to recording owner

## Testing Cloud Functions

### Local Emulator

```bash
# Start emulator
firebase emulators:start

# Access Emulator UI
# http://localhost:4000
```

### Unit Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

### Manual Testing

```bash
# Trigger HTTP function
curl http://localhost:5001/your-project/us-central1/functionName

# Trigger with data
curl -X POST http://localhost:5001/your-project/us-central1/functionName \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}'
```

## Environment Configuration

### Develop Environment
```bash
firebase use develop
firebase deploy --only functions
```

### Production Environment
```bash
firebase use production
firebase deploy --only functions
```

### List All Environments
```bash
firebase use -l
```

## Monitoring & Logs

### View Function Logs
```bash
# View all logs
firebase functions:log

# Follow logs in real-time
firebase functions:log --follow

# Filter by function
firebase functions:log --limit 100
```

### Performance Monitoring
- Configure in Firebase Console
- Monitor in Cloud Monitoring

## Best Practices

1. **Keep functions focused** - One function per task
2. **Use TypeScript** - Better type safety and catching errors
3. **Minimize dependencies** - Smaller bundle size = faster execution
4. **Handle errors gracefully** - Always catch and log errors
5. **Test thoroughly** - Unit test before deploy
6. **Version control** - Track all changes with git
7. **Monitor performance** - Check execution time and memory usage

## Common Issues & Solutions

### Issue: Function timeout
**Solution**: Increase timeout setting or optimize code

### Issue: Cold start delay
**Solution**: Reduce dependency size or accept first-call delay

### Issue: Environment variables not loading
**Solution**: Ensure `firebase functions:config:get` shows variables

### Issue: Permission denied errors
**Solution**: Check Firebase security rules and IAM permissions

## Useful Commands

```bash
# Deploy specific function
firebase deploy --only functions:functionName

# List all functions
firebase functions:list

# Delete a function
firebase functions:delete functionName

# View function details
firebase functions:describe functionName

# Set memory and timeout
firebase functions:config:set memory=512MB timeout=60s
```

## Documentation References
- [Firebase Cloud Functions](https://firebase.google.com/docs/functions)
- [Firestore Triggers](https://firebase.google.com/docs/functions/firestore-events)
- [Cloud Functions Pricing](https://firebase.google.com/pricing/functions)
