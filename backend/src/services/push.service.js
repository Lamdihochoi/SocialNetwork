import fetch from "node-fetch";

const EXPO_PUSH_API = "https://exp.host/--/api/v2/push/send";

/**
 * Send push notification via Expo Push API
 * @param {string} expoPushToken - Expo push token (ExponentPushToken[xxx])
 * @param {object} notification - { title, body, data }
 */
export const sendPushNotification = async (expoPushToken, notification) => {
  if (!expoPushToken || !expoPushToken.startsWith("ExponentPushToken")) {
    console.log("[PUSH] Invalid or missing push token:", expoPushToken);
    return null;
  }

  const message = {
    to: expoPushToken,
    sound: "default",
    title: notification.title,
    body: notification.body,
    data: notification.data || {},
    badge: 1,
  };

  try {
    const response = await fetch(EXPO_PUSH_API, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    console.log("[PUSH] Sent:", result);
    return result;
  } catch (error) {
    console.error("[PUSH] Error sending notification:", error);
    return null;
  }
};

/**
 * Send push notification to multiple users
 */
export const sendPushNotifications = async (tokens, notification) => {
  const validTokens = tokens.filter(
    (t) => t && t.startsWith("ExponentPushToken")
  );

  if (validTokens.length === 0) {
    console.log("[PUSH] No valid tokens to send to");
    return [];
  }

  const messages = validTokens.map((token) => ({
    to: token,
    sound: "default",
    title: notification.title,
    body: notification.body,
    data: notification.data || {},
    badge: 1,
  }));

  try {
    const response = await fetch(EXPO_PUSH_API, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();
    console.log("[PUSH] Sent to", validTokens.length, "devices");
    return result;
  } catch (error) {
    console.error("[PUSH] Error sending notifications:", error);
    return [];
  }
};

/**
 * Helper to create notification content
 */
export const createNotificationContent = {
  newLike: (likerName) => ({
    title: "Lượt thích mới",
    body: `${likerName} đã thích bài viết của bạn`,
  }),
  newComment: (commenterName, preview) => ({
    title: "Bình luận mới",
    body: `${commenterName}: ${preview.substring(0, 50)}${preview.length > 50 ? "..." : ""}`,
  }),
  newFollower: (followerName) => ({
    title: "Người theo dõi mới",
    body: `${followerName} đã bắt đầu theo dõi bạn`,
  }),
  newMessage: (senderName, preview) => ({
    title: senderName,
    body: preview.substring(0, 100),
  }),
};
