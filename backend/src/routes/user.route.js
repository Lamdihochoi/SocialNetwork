import express from "express";
import {
  followUser,
  getCurrentUser,
  getUserProfile,
  getUserById,
  syncUser,
  updateProfile,
  getFollowList,
  getMutualFollows,
  blockUser,
  getBlockedUsers,
  registerPushToken,
} from "../controllers/user.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { uploadProfile } from "../middleware/upload.middleware.js";

const router = express.Router();

/**
 * 🟢 Public Routes
 */
router.get("/profile/:username", getUserProfile);

/**
 * 🔒 Protected Routes
 */
// ✅ Chuẩn: sync không cần protectRoute để tạo user lần đầu
router.post("/sync", syncUser);
router.get("/me", protectRoute, getCurrentUser);
router.put("/profile", protectRoute, uploadProfile, updateProfile);

// ✅ Follow / Unfollow user
router.post("/:id/follow", protectRoute, followUser);

// 🚫 Block / Unblock user
router.post("/:id/block", protectRoute, blockUser);
router.get("/blocked", protectRoute, getBlockedUsers);

// Lấy danh sách follow
router.get("/:userId/follows", protectRoute, getFollowList);

// Get mutual follows (friends)
router.get("/mutual-follows", protectRoute, getMutualFollows);

// 🔔 Push notification token
router.post("/push-token", protectRoute, registerPushToken);

// Get user by ID (placed last to avoid conflicts with other routes)
router.get("/:id", getUserById);

export default router;
