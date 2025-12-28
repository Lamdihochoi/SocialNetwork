import asyncHandler from "express-async-handler";
import Notification from "../models/notification.model.js";

export const getNotifications = asyncHandler(async (req, res) => {
  // Use req.user from protectRoute middleware
  const user = req.user;
  if (!user) return res.status(401).json({ error: "User not authenticated" });

  const notifications = await Notification.find({ to: user._id })
    .sort({ createdAt: -1 })
    .populate("from", "username firstName lastName profilePicture")
    .populate("post", "content image")
    .populate("comment", "content");

  res.status(200).json({ notifications });
});

export const deleteNotification = asyncHandler(async (req, res) => {
  const user = req.user;
  const { notificationId } = req.params;

  if (!user) return res.status(401).json({ error: "User not authenticated" });

  const notification = await Notification.findOneAndDelete({
    _id: notificationId,
    to: user._id,
  });

  if (!notification) return res.status(404).json({ error: "Notification not found" });

  res.status(200).json({ message: "Notification deleted successfully" });
});

// ==============================
// ✅ Đánh dấu đã đọc thông báo
// ==============================
export const markAsRead = asyncHandler(async (req, res) => {
  const user = req.user;
  const { notificationId } = req.params;

  console.log("[NOTIFICATION] markAsRead:", { notificationId, userId: user?._id });

  if (!user) {
    console.log("[NOTIFICATION] Error: User not authenticated");
    return res.status(401).json({ error: "User not authenticated" });
  }

  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, to: user._id },
    { isRead: true },
    { new: true }
  );

  if (!notification) {
    console.log("[NOTIFICATION] Error: Notification not found");
    return res.status(404).json({ error: "Notification not found" });
  }

  console.log("[NOTIFICATION] Marked as read:", notification._id);
  res.status(200).json({ notification });
});