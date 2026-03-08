# Push Notifications (No Firebase)

This app uses **Expo Push Notifications**: your backend sends messages to Expo’s servers, and Expo delivers them to Apple (APNs) and Google (FCM) for you. You never touch Firebase in your code; everything stays between your backend and the app.

---

## 1. Compliance (Apple & Google)

- **Permission first**: The app asks the user for notification permission before using push. No sending until the user grants it.
- **User control**: Users can turn off notifications in device Settings at any time. We don’t bypass that.
- **Relevant use**: Use push for things like transaction alerts, support replies, and security — not spam. This aligns with store guidelines and reduces rejection risk.

---

## 2. How It Works

1. **App**: When the user is logged in, the app requests permission (if needed), gets an **Expo push token**, and sends it to your backend (e.g. `POST /api/v1/user/register-push-token` with `{ "push_token": "ExponentPushToken[xxx]" }`).
2. **Backend**: You store that token per user (and update it when they re-register).
3. **Sending**: When you want to notify the user, your backend calls **Expo’s Push API** (see below). Expo then delivers to the device via APNs (iOS) or FCM (Android).

No Firebase SDK in the app; your backend only talks to Expo.

---

## 3. Simulator / Unsupported Environments

- **iOS Simulator**: Push is not supported. The app detects this and **skips** registering for push (no token, no error).
- **Android Emulator**: Same idea — if push isn’t available, we skip and the app keeps working.
- **Expo Go on Android (SDK 53+)**: Push is not supported in Expo Go on Android. It works on a **development build** or **production build** (see `docs/BUILDS-AND-EXPO-GO.md`).

So: if you’re on a simulator or in Expo Go on Android, notification usage is skipped for that run; the rest of the app behaves normally.

---

## 4. Backend: Sending a Push (Expo Push API)

Send a `POST` request to:

```
https://exp.host/--/api/v2/push/send
```

**Headers:**

- `Content-Type: application/json`
- `Accept: application/json`

**Body (single notification):**

```json
{
  "to": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "title": "Payment received",
  "body": "You received ₦5,000 from John.",
  "sound": "default",
  "badge": 1,
  "data": {
    "screen": "transaction",
    "id": "txn_123"
  }
}
```

**Body (multiple tokens):**

```json
[
  {
    "to": "ExponentPushToken[xxx]",
    "title": "New message",
    "body": "Support replied to your ticket.",
    "sound": "default",
    "data": { "screen": "support", "id": "conv_abc" }
  },
  {
    "to": "ExponentPushToken[yyy]",
    "title": "Reminder",
    "body": "Complete your verification."
  }
]
```

**Fields (common):**

| Field    | Description |
|----------|-------------|
| `to`     | Expo push token (from the app). |
| `title`  | Notification title. |
| `body`   | Notification body. |
| `sound`  | `"default"` for system sound, or name of a custom sound file (e.g. `"notification.wav"` if you add it to the app). |
| `badge`  | Number on the app icon (iOS; 0 to clear). |
| `data`   | Custom JSON. The app uses `screen` and `id` to open a specific screen when the user taps the notification (see below). |
| `channelId` | Android: channel ID (e.g. `"default"`). |
| `priority`  | `"default"` or `"normal"` or `"high"`. |

Full reference: [Expo Push API](https://docs.expo.dev/push-notifications/sending-notifications/#message-format).

---

## 5. Adding Sound (and Other Options)

- **Default sound**: In the payload, set `"sound": "default"`. No extra setup.
- **Custom sound**: The app bundles `assets/sounds/notification-1.wav`. In the push payload use `"sound": "notification-1"` (or `"notification-1.wav"` on iOS). The app exports `NOTIFICATION_SOUND_NAME` from `@/lib/push-notifications` so the backend can use the same string.
- **Android channel**: The app creates a `default` channel with sound. You can add more channels in `src/lib/push-notifications.ts` (e.g. “Transactions”, “Support”) and pass `channelId` from the backend.
- **Badge**: Set `badge` in the payload. The app’s notification handler allows badge updates.

---

## 6. Deep Link When User Taps (data.screen)

The app handles `data.screen` and `data.id` when the user taps a notification:

| `data.screen`   | `data.id`   | Action |
|-----------------|------------|--------|
| `"support"`     | conversation id | Opens that support chat. |
| `"support"`     | (none)     | Opens support list. |
| `"transaction"` | transaction id | Opens that transaction in history. |

You can extend this in `src/lib/push-notifications.ts` in `handleNotificationResponse()`.

---

## 7. Backend Endpoint

The app calls:

- **`POST /api/v1/user/register-push-token`**  
  Body: `{ "push_token": "ExponentPushToken[xxx]" }`  
  You should: associate this token with the current user (replace any previous token for this device/app).

If your backend uses a different path or body shape, change `src/api/services/notifications.ts` to match.

---

## 8. EAS Project ID (Required for Token)

Expo needs a **project ID** to issue push tokens. When you use EAS (Expo Application Services):

1. Run `eas init` (or create the project in the Expo dashboard).
2. In `app.json` (or `app.config.js`), under `expo.extra.eas`, set `projectId` to your EAS project ID.

Example in `app.config.js`:

```js
export default {
  expo: {
    // ...
    extra: {
      eas: {
        projectId: "your-project-id-from-eas",
      },
    },
  },
};
```

Without `projectId`, the app will not get a push token (it skips gracefully and logs in dev).

---

## 9. Summary

- **No Firebase** in the app; backend uses Expo Push API.
- **Compliant**: permission-first, user can disable in system settings.
- **Simulator / Expo Go Android**: push is skipped; app still works.
- **Sound**: use `"sound": "default"` or a custom file; extend channels on Android as needed.
- **Deep links**: use `data.screen` and `data.id`; extend `handleNotificationResponse()` for new screens.
