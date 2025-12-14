import express from "express";
import {
  getConversations,
  getMessageHistory,
  sendMessage,
  getFriends,
} from "../controllers/message.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { uploadMessage } from "../middleware/upload.middleware.js";

const router = express.Router();

// All message routes require authentication
router.get("/friends", protectRoute, getFriends);
router.get("/conversations", protectRoute, getConversations);
router.get("/:otherUserId", protectRoute, getMessageHistory);
router.post("/send", protectRoute, uploadMessage.single("file"), sendMessage);

export default router;

