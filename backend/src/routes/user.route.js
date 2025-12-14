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
} from "../controllers/user.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

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
router.put("/profile", protectRoute, updateProfile);

// ✅ Follow / Unfollow user
// 🔥 SỬA QUAN TRỌNG: Đổi ":targetUserId" thành ":id" để khớp với Controller
router.post("/:id/follow", protectRoute, followUser);

// Lấy danh sách follow (Cũng nên để thống nhất là :id hoặc :userId)
router.get("/:userId/follows", protectRoute, getFollowList);

// Get mutual follows (friends)
router.get("/mutual-follows", protectRoute, getMutualFollows);

// Get user by ID (placed last to avoid conflicts with other routes)
router.get("/:id", getUserById);

export default router;
