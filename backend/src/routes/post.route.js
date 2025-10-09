import express from "express";
import {
  createPost,
  deletePost,
  getPost,
  getPosts,
  getUserPosts,
  likePost,
} from "../controllers/post.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import upload from "../middleware/upload.middleware.js";

const router = express.Router();

// ===============================
// 🟢 Protected routes (đã thêm)
// ===============================
router.get("/", protectRoute, getPosts);
router.get("/user/:username", protectRoute, getUserPosts);

// ===============================
// 🔹 Public routes
// ===============================
router.get("/:postId", getPost);

// ===============================
// 🔒 Auth-required actions
// ===============================
router.post("/", protectRoute, upload.single("image"), createPost);
router.post("/:postId/like", protectRoute, likePost);
router.delete("/:postId", protectRoute, deletePost);

export default router;
