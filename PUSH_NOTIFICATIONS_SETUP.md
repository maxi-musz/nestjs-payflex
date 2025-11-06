# Push Notifications Setup Guide
**Complete Documentation for Smart Edu Push Notification System**

## 📋 Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Database Schema](#database-schema)
5. [API Endpoints](#api-endpoints)
6. [Implementation Details](#implementation-details)
7. [Usage Examples](#usage-examples)
8. [Integration Guide](#integration-guide)
9. [Configuration](#configuration)
10. [Troubleshooting](#troubleshooting)

## 🎯 Overview

The Smart Edu backend implements a comprehensive push notification system using **Expo Push Notifications** service. This system allows sending notifications to iOS and Android devices for various events like new assignments, announcements, and system updates.

### Key Features:
- ✅ **Device Token Management** - Register/unregister device tokens
- ✅ **Multi-User Notifications** - Send to specific users or user groups
- ✅ **Role-Based Targeting** - Send to all, teachers, students, directors, or admins
- ✅ **School-Scoped** - Notifications are scoped to specific schools
- ✅ **Rich Data Payload** - Include custom data for deep linking
- ✅ **Automatic Token Management** - Handles token updates and deactivation

## 🏗️ Architecture

```
┌─────────────────┐
│  Mobile App     │
│  (React Native) │
└────────┬────────┘
         │
         │ 1. Register Device Token
         ▼
┌─────────────────────────────────┐
│  Push Notifications Controller  │
│  /push-notifications/*          │
└────────┬────────────────────────┘
         │
         │ 2. Store Token in DB
         ▼
┌─────────────────────────────────┐
│  Push Notifications Service     │
│  - registerDevice()             │
│  - sendPushNotification()       │
│  - sendNotificationByType()     │
└────────┬────────────────────────┘
         │
         │ 3. Query Device Tokens
         ▼
┌─────────────────────────────────┐
│  Prisma Service                 │
│  DeviceToken Model              │
└────────┬────────────────────────┘
         │
         │ 4. Send via Expo API
         ▼
┌─────────────────────────────────┐
│  Expo Push Notification Service  │
│  https://exp.host/--/api/v2/     │
└────────┬────────────────────────┘
         │
         │ 5. Deliver to Devices
         ▼
┌─────────────────┐
│  User Devices   │
│  (iOS/Android)  │
└─────────────────┘
```

## 🛠️ Technology Stack

### Backend:
- **NestJS** - Framework
- **Prisma** - Database ORM
- **Expo Push Notifications** - Push notification service
- **PostgreSQL** - Database

### Mobile:
- **React Native** - Mobile framework
- **Expo** - Development platform
- **expo-notifications** - Push notification library

## 💾 Database Schema

### DeviceToken Model

```prisma
model DeviceToken {
  id         String   @id @default(cuid())
  token      String   @unique
  deviceType String
  user_id    String
  school_id  String
  isActive   Boolean  @default(true)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  school     School   @relation(fields: [school_id], references: [id])
  user       User     @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@index([user_id])
  @@index([school_id])
  @@index([token])
  @@index([isActive])
}
```

### Fields:
- **id**: Unique identifier (CUID)
- **token**: Expo push token (unique)
- **deviceType**: `ios` or `android`
- **user_id**: Reference to User
- **school_id**: Reference to School
- **isActive**: Whether token is currently active
- **createdAt/updatedAt**: Timestamps

## 🔌 API Endpoints

### Base URL
```
POST /api/v1/push-notifications
```

### 1. Register Device Token

**Endpoint:** `POST /push-notifications/register-device`

**Authentication:** Required (JWT Bearer Token)

**Request Body:**
```json
{
  "token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "deviceType": "ios" // or "android"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Device registered successfully",
  "data": {
    "id": "cmeriw5pj0003vlluarf41gun",
    "token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
    "deviceType": "ios",
    "user_id": "user123",
    "school_id": "school456",
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "User not found or invalid school data",
  "statusCode": 400
}
```

### 2. Unregister Device Token

**Endpoint:** `DELETE /push-notifications/unregister-device`

**Authentication:** Required (JWT Bearer Token)

**Request Body:**
```json
{
  "token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Device unregistered successfully",
  "data": null
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "Device token not found",
  "statusCode": 404
}
```

### 3. Send Push Notification

**Endpoint:** `POST /push-notifications/send-push`

**Authentication:** Required (JWT Bearer Token)

**Request Body:**
```json
{
  "notificationId": "cmeriw5pj0003vlluarf41gun",
  "title": "New Assignment Posted",
  "body": "You have a new assignment in Mathematics",
  "recipients": ["user1", "user2", "user3"],
  "data": {
    "type": "assignment",
    "assignmentId": "cmeriw5pj0003vlluarf41gun",
    "screen": "AssignmentDetail"
  }
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Push notification sent successfully",
  "data": {
    "sent": 3,
    "total": 3,
    "result": {
      "data": [
        {
          "status": "ok",
          "id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
        }
      ]
    }
  }
}
```

## 🔧 Implementation Details

### Module Structure

```
src/push-notifications/
├── push-notifications.module.ts      # Module definition
├── push-notifications.controller.ts   # API endpoints
├── push-notifications.service.ts      # Business logic
├── dto/
│   ├── register-device.dto.ts        # Register device DTO
│   ├── unregister-device.dto.ts      # Unregister device DTO
│   ├── send-push.dto.ts              # Send push DTO
│   └── device-token-response.dto.ts   # Response DTO
├── interfaces/
│   └── push-notification.interface.ts  # TypeScript interfaces
└── utils/
    └── api-docs/
        └── push-notifications.docs.ts   # Swagger documentation
```

### Service Methods

#### 1. `registerDevice(user: User, dto: RegisterDeviceDto)`

**Purpose:** Register or update a device token for push notifications.

**Flow:**
1. Validates user and school_id
2. Checks if token already exists
3. Updates existing token or creates new one
4. Deactivates other tokens for the same user (prevents duplicates)
5. Returns registered device token

**Key Logic:**
- If token exists → Update it
- If token is new → Create it
- Deactivate all other tokens for the user in the same school

#### 2. `unregisterDevice(user: User, dto: UnregisterDeviceDto)`

**Purpose:** Unregister a device token (mark as inactive).

**Flow:**
1. Validates user and school_id
2. Finds the device token
3. Sets `isActive = false`
4. Returns success response

#### 3. `sendPushNotification(user: User, dto: SendPushDto)`

**Purpose:** Send push notification to specific users.

**Flow:**
1. Validates user and school_id
2. Queries active device tokens for recipients
3. Prepares push messages array
4. Sends to Expo Push API
5. Returns send results

**Message Format:**
```typescript
{
  to: deviceToken.token,
  sound: 'default',
  title: dto.title,
  body: dto.body,
  data: dto.data || {},
  badge: 1
}
```

#### 4. `sendNotificationByType(notificationData: ISendPushNotification)`

**Purpose:** Send notifications based on notification type (role-based).

**Supported Types:**
- `all` - All users in school
- `teachers` - All teachers in school
- `students` - All students in school
- `school_director` - All directors in school
- `admin` - All super admins
- Custom recipients array

**Flow:**
1. Determines user IDs based on notification type
2. Queries device tokens for those users
3. Prepares and sends push messages
4. Returns send results

### Helper Methods

#### `sendToExpo(messages: IPushMessage[])`

**Purpose:** Send messages to Expo Push Notification API.

**Endpoint:** `https://exp.host/--/api/v2/push/send`

**Headers:**
```typescript
{
  'Accept': 'application/json',
  'Accept-encoding': 'gzip, deflate',
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${process.env.EXPO_ACCESS_TOKEN}` // Optional
}
```

**Request Body:**
```json
[
  {
    "to": "ExponentPushToken[xxx]",
    "sound": "default",
    "title": "Notification Title",
    "body": "Notification Body",
    "data": {},
    "badge": 1
  }
]
```

#### User ID Retrieval Methods

- `getAllUserIdsInSchool(schoolId)` - Get all user IDs in school
- `getTeacherUserIdsInSchool(schoolId)` - Get teacher user IDs
- `getStudentUserIdsInSchool(schoolId)` - Get student user IDs
- `getDirectorUserIdsInSchool(schoolId)` - Get director user IDs
- `getAdminUserIds()` - Get super admin user IDs

## 📱 Usage Examples

### Example 1: Register Device (Mobile App)

```typescript
// React Native / Expo
import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync } from './utils/notifications';

// Get push token
const token = await registerForPushNotificationsAsync();

// Register with backend
const response = await fetch('https://api.example.com/api/v1/push-notifications/register-device', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userToken}`
  },
  body: JSON.stringify({
    token: token,
    deviceType: Platform.OS === 'ios' ? 'ios' : 'android'
  })
});

const result = await response.json();
console.log('Device registered:', result);
```

### Example 2: Send Notification to Specific Users

```typescript
// Backend Service
const response = await this.pushNotificationsService.sendPushNotification(user, {
  notificationId: 'notif123',
  title: 'New Assignment',
  body: 'You have a new assignment in Mathematics',
  recipients: ['user1', 'user2', 'user3'],
  data: {
    type: 'assignment',
    assignmentId: 'assign123',
    screen: 'AssignmentDetail'
  }
});
```

### Example 3: Send Notification by Type (Role-Based)

```typescript
// Backend Service
const result = await this.pushNotificationsService.sendNotificationByType({
  title: 'School Announcement',
  body: 'Important announcement for all students',
  notificationType: 'students',
  schoolId: 'school123',
  data: {
    type: 'announcement',
    notificationId: 'notif123',
    screen: 'AnnouncementDetail'
  }
});

if (result.success) {
  console.log(`Sent to ${result.sent} devices`);
}
```

### Example 4: Integration in Notification Service

```typescript
// src/school/director/notifications/notifications.service.ts

// After creating a notification
const pushResult = await this.pushNotificationsService.sendNotificationByType({
  title: dto.title,
  body: dto.description,
  notificationType: dto.type, // 'all', 'teachers', 'students', etc.
  schoolId: fullUser.school_id,
  data: {
    type: 'notification',
    notificationId: notification.id,
    screen: 'NotificationDetail'
  }
});
```

## 🔗 Integration Guide

### Step 1: Import Module

```typescript
// app.module.ts
import { PushNotificationsModule } from './push-notifications/push-notifications.module';

@Module({
  imports: [
    // ... other modules
    PushNotificationsModule,
  ],
})
export class AppModule {}
```

### Step 2: Inject Service

```typescript
// your-service.ts
import { PushNotificationsService } from 'src/push-notifications/push-notifications.service';

@Injectable()
export class YourService {
  constructor(
    private readonly pushNotificationsService: PushNotificationsService
  ) {}
}
```

### Step 3: Use Service Methods

```typescript
// Send notification
await this.pushNotificationsService.sendNotificationByType({
  title: 'Title',
  body: 'Body',
  notificationType: 'students',
  schoolId: 'school123',
  data: { /* custom data */ }
});
```

## ⚙️ Configuration

### Environment Variables

Add to `.env` file:

```env
# Expo Push Notifications (Optional - for higher rate limits)
EXPO_ACCESS_TOKEN=your-expo-access-token-here
```

**Note:** Expo Push API works without an access token, but using one provides:
- Higher rate limits
- Better reliability
- Priority support

### Get Expo Access Token

1. Go to [Expo Dashboard](https://expo.dev/)
2. Create an account or sign in
3. Go to **Settings** → **Access Tokens**
4. Create a new access token
5. Add to `.env` file

### Module Dependencies

```typescript
// push-notifications.module.ts
@Module({
  imports: [
    PrismaModule,           // Database access
    AcademicSessionModule,  // Academic session service
  ],
  controllers: [PushNotificationsController],
  providers: [PushNotificationsService],
  exports: [PushNotificationsService]  // Export for use in other modules
})
```

## 🐛 Troubleshooting

### Issue 1: Device Token Not Registered

**Symptoms:**
- Notifications not received
- Token registration returns error

**Solutions:**
1. Verify user has valid `school_id`
2. Check token format: `ExponentPushToken[...]`
3. Ensure device type is `ios` or `android`
4. Check database connection

### Issue 2: Notifications Not Delivered

**Symptoms:**
- API returns success but no notification received

**Solutions:**
1. Verify device token is active (`isActive = true`)
2. Check Expo Push API response for errors
3. Verify notification permissions on device
4. Check device is connected to internet
5. Verify token hasn't expired (Expo tokens can expire)

### Issue 3: Duplicate Notifications

**Symptoms:**
- Same notification received multiple times

**Solutions:**
1. Check for duplicate device tokens in database
2. Ensure `registerDevice` deactivates old tokens
3. Verify token uniqueness constraint

### Issue 4: Expo API Rate Limits

**Symptoms:**
- API returns rate limit errors

**Solutions:**
1. Add `EXPO_ACCESS_TOKEN` to `.env`
2. Implement batching for large recipient lists
3. Add retry logic with exponential backoff

### Issue 5: School Scoping Issues

**Symptoms:**
- Notifications sent to wrong users

**Solutions:**
1. Verify `school_id` is correctly set
2. Check device tokens belong to correct school
3. Verify user's school_id matches token's school_id

## 📊 Best Practices

### 1. Token Management
- ✅ Always deactivate old tokens when registering new ones
- ✅ Unregister tokens when user logs out
- ✅ Handle token expiration gracefully
- ✅ Validate token format before storing

### 2. Notification Content
- ✅ Keep titles short (< 50 characters)
- ✅ Keep body concise (< 150 characters)
- ✅ Include relevant data for deep linking
- ✅ Use appropriate notification types

### 3. Error Handling
- ✅ Don't fail main operation if push fails
- ✅ Log push notification errors
- ✅ Handle Expo API errors gracefully
- ✅ Return meaningful error messages

### 4. Performance
- ✅ Batch notifications when possible
- ✅ Use `sendNotificationByType` for role-based notifications
- ✅ Query only active tokens
- ✅ Cache user IDs for frequently used queries

### 5. Security
- ✅ Validate user permissions before sending
- ✅ Ensure school scoping is enforced
- ✅ Validate device tokens before storing
- ✅ Use HTTPS for all API calls

## 🔐 Security Considerations

1. **Authentication Required:** All endpoints require JWT authentication
2. **School Scoping:** Notifications are scoped to user's school
3. **Token Validation:** Device tokens are validated before storage
4. **User Verification:** User must belong to the school to send notifications
5. **Data Privacy:** Only active tokens are queried and used

## 📈 Monitoring

### Key Metrics to Monitor:
- Number of registered devices
- Notification delivery rate
- Expo API response times
- Failed notification attempts
- Active vs inactive tokens

### Logging:
The service logs all operations with colored output:
- 🟢 Green: Success operations
- 🟡 Yellow: Warnings
- 🔴 Red: Errors
- 🔵 Cyan: Info messages

## 🎉 Summary

The Smart Edu push notification system provides:
- ✅ Complete device token management
- ✅ Flexible notification targeting (users, roles, schools)
- ✅ Integration with Expo Push Notifications
- ✅ School-scoped security
- ✅ Easy integration with other services
- ✅ Comprehensive error handling
- ✅ Professional logging and monitoring

**Ready to use in production!** 🚀

---

## 📚 Additional Resources

- [Expo Push Notifications Documentation](https://docs.expo.dev/push-notifications/overview/)
- [Expo Push API Reference](https://docs.expo.dev/push-notifications/sending-notifications/)
- [NestJS Documentation](https://docs.nestjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs/)
