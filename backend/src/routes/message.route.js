import express from "express";
import {
  getConversations,
  getMessageHistory,
  sendMessage,
  getFriends,
  markMessagesAsRead,
  editMessage,
  deleteMessage,
  deleteConversation,
  clearConversation,
} from "../controllers/message.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { uploadMessage } from "../middleware/upload.middleware.js";

const router = express.Router();

// All message routes require authentication
router.get("/friends", protectRoute, getFriends);
router.get("/conversations", protectRoute, getConversations);
router.get("/:otherUserId", protectRoute, getMessageHistory);
router.post("/send", protectRoute, uploadMessage.single("file"), sendMessage);
router.put("/:conversationId/read", protectRoute, markMessagesAsRead);
router.patch("/edit/:messageId", protectRoute, editMessage);
router.delete("/:messageId", protectRoute, deleteMessage);

// 🗑️ Conversation management
router.delete("/conversation/:conversationId", protectRoute, deleteConversation);
router.delete("/conversation/:conversationId/clear", protectRoute, clearConversation);

export default router;


