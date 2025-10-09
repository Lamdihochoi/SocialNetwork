import express from "express";
import {
  followUser,
  getCurrentUser,
  getUserProfile,
  syncUser,
  updateProfile,
  getFollowList,
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
router.post("/sync", protectRoute, syncUser);
router.get("/me", protectRoute, getCurrentUser);
router.put("/profile", protectRoute, updateProfile);

// ✅ Follow / Unfollow user
router.post("/:targetUserId/follow", protectRoute, followUser);
router.get("/:userId/follows", protectRoute, getFollowList);

export default router;
