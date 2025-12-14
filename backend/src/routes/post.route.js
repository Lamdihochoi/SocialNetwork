import express from "express";
import {
  createPost,
  getPostById,
  deletePost,
  getPost,
  getPosts,
  getUserPosts,
  likePost,
  searchPosts,
} from "../controllers/post.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import upload from "../middleware/upload.middleware.js";

const router = express.Router();

// ===============================
// 🟢 Protected routes (đã thêm)
// ===============================
router.get("/", protectRoute, getPosts);
router.get("/search", protectRoute, searchPosts);
router.get("/user/:username", protectRoute, getUserPosts);

// ===============================
// 🔹 Public routes
// ===============================
router.get("/:postId", getPost);

// ===============================
// 🔒 Auth-required actions
// ===============================
router.post("/", protectRoute, upload.single("image"), createPost);
// 👇 THÊM DÒNG NÀY (Đặt dưới router.get("/") và trên router.delete)
router.get("/:id", protectRoute, getPostById);
router.post("/:postId/like", protectRoute, likePost);
router.delete("/:postId", protectRoute, deletePost);

export default router;
