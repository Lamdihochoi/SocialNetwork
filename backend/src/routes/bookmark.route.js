import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { 
  toggleBookmark, 
  getBookmarks, 
  checkBookmark 
} from "../controllers/bookmark.controller.js";

const router = express.Router();

// All routes require authentication
router.use(protectRoute);

// Get user's bookmarks
router.get("/", getBookmarks);

// Toggle bookmark on a post
router.post("/:postId", toggleBookmark);

// Check if post is bookmarked
router.get("/:postId/check", checkBookmark);

export default router;
