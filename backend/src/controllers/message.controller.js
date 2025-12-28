import asyncHandler from "express-async-handler";
import Message from "../models/message.model.js";
import Conversation from "../models/conversation.model.js";
import User from "../models/user.model.js";
import cloudinary from "../config/cloudinary.js";
// 🔐 Backend encryption removed - using pure E2E (frontend only)

// ❌ ĐÃ XÓA DÒNG NÀY ĐỂ TRÁNH LỖI VÒNG LẶP:
// import { io } from "../server.js";

// ==============================
// 🛠 Helper: Kiểm tra Follow chéo (Mutual Follow)
// ==============================
const checkMutualFollow = (userA, userB) => {
  // Kiểm tra A có follow B không?
  const aFollowsB = userA.following.some(
    (id) => id.toString() === userB._id.toString()
  );

  // Kiểm tra B có follow A không?
  const bFollowsA = userB.following.some(
    (id) => id.toString() === userA._id.toString()
  );

  return aFollowsB && bFollowsA;
};

// ==============================
// 👥 Get Friends (Mutual Follows)
// ==============================
export const getFriends = asyncHandler(async (req, res) => {
  const currentUser = req.user;

  // ⚡ OPTIMIZED: Giảm từ N+1 queries xuống 2 queries
  const currentUserDoc = await User.findById(currentUser._id)
    .select("following")
    .lean();

  if (!currentUserDoc) {
    return res.status(404).json({ error: "User not found" });
  }

  const followingIds = currentUserDoc.following || [];
  
  if (followingIds.length === 0) {
    return res.status(200).json({ friends: [] });
  }

  // Single query: Tìm tất cả users mà:
  // 1. Nằm trong danh sách following của mình
  // 2. Có following chứa ID của mình (mutual follow)
  const friends = await User.find({
    _id: { $in: followingIds },
    following: currentUser._id  // Người đó cũng follow mình
  })
    .select("_id username firstName lastName profilePicture clerkId lastSeen")
    .lean();

  res.status(200).json({ friends });
});

// ==============================
// 📋 Get all conversations
// ==============================
export const getConversations = asyncHandler(async (req, res) => {
  const currentUser = req.user;

  // Tìm các cuộc trò chuyện và populate
  const conversations = await Conversation.find({
    participants: currentUser._id,
  })
    .populate({
      path: "participants",
      select: "username firstName lastName profilePicture clerkId lastSeen",
    })
    .populate({
      path: "lastMessage",
      select: "content createdAt sender isRead",
    })
    .sort({ lastMessageAt: -1 });

  // Format lại dữ liệu
  const formattedConversations = conversations
    .map((conv) => {
      const otherParticipant = conv.participants.find(
        (p) => p._id.toString() !== currentUser._id.toString()
      );

      if (!otherParticipant) return null;

      // 🧠 Logic kiểm tra đã đọc hay chưa:
      // 1. Nếu tin nhắn cuối là do mình gửi -> Coi như đã đọc (true)
      // 2. Nếu người khác gửi -> Lấy giá trị isRead từ DB
      const isMyMessage =
        conv.lastMessage?.sender.toString() === currentUser._id.toString();
      const isRead = isMyMessage ? true : conv.lastMessage?.isRead || false;

      // 🔐 E2E: Content already encrypted by frontend, pass through
      const lastMessageContent = conv.lastMessage?.content || "Bắt đầu cuộc trò chuyện";

      return {
        _id: conv._id,
        user: {
          _id: otherParticipant._id,
          username: otherParticipant.username,
          firstName: otherParticipant.firstName,
          lastName: otherParticipant.lastName,
          profilePicture: otherParticipant.profilePicture,
          clerkId: otherParticipant.clerkId,
          lastSeen: otherParticipant.lastSeen,
        },
        lastMessage: lastMessageContent,
        lastMessageAt: conv.lastMessageAt || conv.createdAt,
        isRead: isRead,
        updatedAt: conv.updatedAt,
      };
    })
    .filter(Boolean);

  res.status(200).json({ conversations: formattedConversations });
});

// ==============================
// 💬 Get message history
// ==============================
export const getMessageHistory = asyncHandler(async (req, res) => {
  const currentUser = req.user;
  const { otherUserId } = req.params;

  const otherUser = await User.findById(otherUserId);
  if (!otherUser) {
    return res.status(404).json({ error: "User not found" });
  }

  const currentUserDoc = await User.findById(currentUser._id);

  // Kiểm tra bạn bè
  const isFriends = checkMutualFollow(currentUserDoc, otherUser);
  if (!isFriends) {
    return res.status(403).json({
      error:
        "Bạn chỉ có thể xem tin nhắn với người đã là bạn bè (Follow chéo).",
    });
  }

  let conversation = await Conversation.findOne({
    participants: { $all: [currentUser._id, otherUser._id] },
  });

  if (!conversation) {
    return res.status(200).json({
      conversation: {
        otherUser: {
          _id: otherUser._id,
          username: otherUser.username,
          firstName: otherUser.firstName,
          lastName: otherUser.lastName,
          profilePicture: otherUser.profilePicture,
          clerkId: otherUser.clerkId,
          lastSeen: otherUser.lastSeen,
        },
      },
      messages: [],
    });
  }

  // 🔥 TÍNH NĂNG MỚI: Đánh dấu tất cả tin nhắn từ người kia gửi cho mình là "Đã đọc"
  await Message.updateMany(
    {
      conversation: conversation._id,
      sender: otherUser._id, // Người gửi là đối phương
      isRead: false, // Đang chưa đọc
    },
    { $set: { isRead: true } }
  );

  // Lấy danh sách tin nhắn
  const messages = await Message.find({ conversation: conversation._id })
    .populate("sender", "username firstName lastName profilePicture")
    .sort({ createdAt: 1 });

  // 🔐 E2E: Messages already encrypted by frontend, just convert to object
  const messagesForClient = messages.map((msg) => msg.toObject());

  res.status(200).json({
    conversation: {
      _id: conversation._id,
      otherUser: {
        _id: otherUser._id,
        username: otherUser.username,
        firstName: otherUser.firstName,
        lastName: otherUser.lastName,
        profilePicture: otherUser.profilePicture,
        clerkId: otherUser.clerkId,
        lastSeen: otherUser.lastSeen,
      },
    },
    messages: messagesForClient,
  });
});

// ==============================
// 📤 Send a message
// ==============================
export const sendMessage = asyncHandler(async (req, res) => {
  const currentUser = req.user;
  const { receiverId, content } = req.body;
  const file = req.file; // File from multer

  // Validate: Must have either content or file
  if (!receiverId || (!content?.trim() && !file)) {
    return res.status(400).json({
      error: "Thiếu ID người nhận hoặc nội dung tin nhắn/file đính kèm",
    });
  }

  const senderDoc = await User.findById(currentUser._id);
  const receiverDoc = await User.findById(receiverId);

  if (!receiverDoc) {
    return res.status(404).json({ error: "Người nhận không tồn tại" });
  }

  const isFriends = checkMutualFollow(senderDoc, receiverDoc);
  if (!isFriends) {
    return res.status(403).json({
      error: "Hai người phải theo dõi nhau mới có thể nhắn tin!",
    });
  }

  // Sort participants để đảm bảo thứ tự nhất quán (tránh duplicate)
  const sortedParticipants = [senderDoc._id, receiverDoc._id].sort((a, b) => 
    a.toString().localeCompare(b.toString())
  );

  let conversation = await Conversation.findOne({
    participants: { $all: sortedParticipants },
  });

  if (!conversation) {
    try {
      conversation = await Conversation.create({
        participants: sortedParticipants,
        lastMessageAt: new Date()
      });
    } catch (err) {
      // Nếu bị duplicate key error, thử find lại
      conversation = await Conversation.findOne({
        participants: { $all: sortedParticipants },
      });
      
      if (!conversation) {
        conversation = await Conversation.findOne({
          $and: [
            { participants: senderDoc._id },
            { participants: receiverDoc._id }
          ]
        });
      }
    }
  }

  // Đảm bảo conversation tồn tại
  if (!conversation) {
    return res.status(500).json({ error: "Không thể tạo cuộc trò chuyện" });
  }

  // Handle file upload if present
  let attachment = {
    url: "",
    type: "text",
    fileName: "",
    fileSize: 0,
  };
  let messageType = "text";
  let messageContent = content?.trim() || "";

  if (file) {

    try {
      // Determine file type
      const isImage = file.mimetype.startsWith("image/");
      const isVideo = file.mimetype.startsWith("video/");
      const isPDF = file.mimetype === "application/pdf";
      const isWord =
        file.mimetype === "application/msword" ||
        file.mimetype ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

      let resourceType = "auto";
      let folder = "social_media_messages";

      if (isImage) {
        resourceType = "image";
        folder = "social_media_messages/images";
        messageType = "image";
      } else if (isVideo) {
        resourceType = "video";
        folder = "social_media_messages/videos";
        messageType = "video";
      } else if (isPDF || isWord) {
        resourceType = "raw";
        folder = "social_media_messages/documents";
        messageType = "file";
      }

      // Convert buffer to base64 for Cloudinary
      const base64File = `data:${file.mimetype};base64,${file.buffer.toString(
        "base64"
      )}`;

      const uploadOptions = {
        folder: folder,
        resource_type: resourceType,
      };

      // Image optimization
      if (isImage) {
        uploadOptions.transformation = [
          { width: 800, height: 800, crop: "limit" },
          { quality: "auto" },
          { format: "auto" },
        ];
      }

      // Video optimization - limit size and generate thumbnail
      if (isVideo) {
        uploadOptions.eager = [
          { width: 480, height: 480, crop: "limit", quality: "auto" }
        ];
        uploadOptions.eager_async = true;
      }

      const uploadResponse = await cloudinary.uploader.upload(base64File, uploadOptions);

      attachment = {
        url: uploadResponse.secure_url,
        type: isImage ? "image" : isVideo ? "video" : "file",
        fileName: file.originalname || "attachment",
        fileSize: file.size,
      };

      // Add video-specific fields
      if (isVideo) {
        attachment.duration = uploadResponse.duration || 0;
        // Generate thumbnail URL from video
        attachment.thumbnail = uploadResponse.secure_url.replace(/\.[^/.]+$/, ".jpg");
      }

      // If no text content, set a default message
      if (!messageContent) {
        messageContent = isImage
          ? "📷 Image"
          : isVideo
          ? "🎬 Video"
          : isPDF
          ? "📄 PDF Document"
          : "📝 Document";
      }
    } catch (uploadError) {
      console.error("DEBUG: Cloudinary upload error FATAL:", uploadError);
      return res.status(400).json({ error: "Failed to upload file" });
    }
  }

  // 🔐 E2E: Content already encrypted by frontend, store as-is
  const message = await Message.create({
    sender: senderDoc._id,
    receiver: receiverDoc._id,
    content: messageContent,  // Store E2E encrypted content directly
    conversation: conversation._id,
    isRead: false,
    messageType: messageType,
    attachment: attachment,
    // Keep image field for backward compatibility
    image: attachment.type === "image" ? attachment.url : "",
  });

  await message.populate(
    "sender",
    "username firstName lastName profilePicture"
  );
  await message.populate(
    "receiver",
    "username firstName lastName profilePicture"
  );

  await Conversation.findByIdAndUpdate(conversation._id, {
    lastMessage: message._id,
    lastMessageAt: message.createdAt,
  });

  // ✅ SỬA QUAN TRỌNG: Dùng req.io thay vì io import từ server
  const roomId = conversation._id.toString();

  // 🔐 E2E: Message is already encrypted, just convert to object for socket
  const messageForClient = message.toObject();

  if (req.io) {
    // 🔥 FIX: Emit to BOTH rooms for reliable realtime
    // 1. Conversation room - for users with chat open
    req.io.to(roomId).emit("receive_message", messageForClient);
    
    // 2. User room - for receiver even if chat is closed
    req.io.to(`user_${receiverDoc._id}`).emit("receive_message", messageForClient);
    
    // 3. Also notify sender's room (for multi-device sync)
    req.io.to(`user_${senderDoc._id}`).emit("receive_message", messageForClient);

    // Gửi thông báo popup (with decrypted content)
    req.io.to(`user_${receiverId}`).emit("new_message_notification", {
      sender: message.sender,
      content: messageContent, // Original unencrypted content
      conversationId: conversation._id,
    });
    
    console.log(`[SOCKET] Message sent to rooms: ${roomId}, user_${receiverDoc._id}`);
  } else {
    console.warn("Socket.io not found in request!");
  }


  // 🔐 Return decrypted message to sender
  res.status(201).json({ message: messageForClient });
});

// ==============================
// ✅ Mark messages as read
// ==============================
export const markMessagesAsRead = asyncHandler(async (req, res) => {
  const currentUser = req.user;
  const { conversationId } = req.params;

  // Find conversation
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    return res.status(404).json({ error: "Conversation not found" });
  }

  // Check if user is participant
  const isParticipant = conversation.participants.some(
    (p) => p.toString() === currentUser._id.toString()
  );
  if (!isParticipant) {
    return res.status(403).json({ error: "Not authorized" });
  }

  // Mark all messages from other user as read
  const result = await Message.updateMany(
    {
      conversation: conversationId,
      sender: { $ne: currentUser._id },
      isRead: false,
    },
    { $set: { isRead: true } }
  );

  // Emit socket event to notify sender that messages were read
  if (req.io && result.modifiedCount > 0) {
    req.io.to(conversationId).emit("messages_read", {
      conversationId,
      readBy: currentUser._id,
      readAt: new Date(),
    });
  }

  res.status(200).json({ 
    message: "Messages marked as read",
    modifiedCount: result.modifiedCount 
  });
});

// ==============================
// ✏️ Edit Message
// ==============================
export const editMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const { content } = req.body;
  const currentUser = req.user;

  if (!content?.trim()) {
    return res.status(400).json({ error: "Content is required" });
  }

  const message = await Message.findById(messageId);
  
  if (!message) {
    return res.status(404).json({ error: "Message not found" });
  }

  // Only sender can edit their message
  if (message.sender.toString() !== currentUser._id.toString()) {
    return res.status(403).json({ error: "Not authorized to edit this message" });
  }

  // 🔐 E2E: Content comes pre-encrypted from frontend
  // Update message
  message.content = content.trim();  // Store E2E encrypted content directly
  message.isEdited = true;
  message.editedAt = new Date();
  await message.save();

  // Emit socket event for realtime update
  if (req.io) {
    req.io.to(message.conversation.toString()).emit("message_edited", {
      messageId: message._id,
      content: content.trim(), // Send decrypted for display
      isEdited: true,
      editedAt: message.editedAt,
    });
  }

  res.status(200).json({
    message: "Message updated successfully",
    data: {
      _id: message._id,
      content: content.trim(),
      isEdited: true,
      editedAt: message.editedAt,
    },
  });
});

// ==============================
// 🗑️ Delete Message
// ==============================
export const deleteMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const currentUser = req.user;

  const message = await Message.findById(messageId);
  
  if (!message) {
    return res.status(404).json({ error: "Message not found" });
  }

  // Only sender can delete their message
  if (message.sender.toString() !== currentUser._id.toString()) {
    return res.status(403).json({ error: "Not authorized to delete this message" });
  }

  const conversationId = message.conversation.toString();

  // Soft delete - mark as deleted instead of removing
  message.isDeleted = true;
  message.deletedAt = new Date();
  message.content = "[DELETED]";  // Plain marker, frontend will show localized text
  await message.save();

  // Emit socket event for realtime update
  if (req.io) {
    req.io.to(conversationId).emit("message_deleted", {
      messageId: message._id,
      conversationId,
      deletedAt: message.deletedAt,
    });
  }

  res.status(200).json({
    message: "Message deleted successfully",
    data: {
      _id: message._id,
      isDeleted: true,
      deletedAt: message.deletedAt,
    },
  });
});

// ==============================
// 🗑️ Delete entire conversation
// ==============================
export const deleteConversation = asyncHandler(async (req, res) => {
  const currentUser = req.user;
  const { conversationId } = req.params;

  const conversation = await Conversation.findById(conversationId);
  
  if (!conversation) {
    return res.status(404).json({ error: "Conversation not found" });
  }

  // Check if user is participant
  const isParticipant = conversation.participants.some(
    (p) => p.toString() === currentUser._id.toString()
  );
  
  if (!isParticipant) {
    return res.status(403).json({ error: "Not authorized to delete this conversation" });
  }

  // Delete all messages in this conversation
  await Message.deleteMany({ conversation: conversationId });
  
  // Delete the conversation
  await Conversation.findByIdAndDelete(conversationId);

  // Emit socket event for realtime update
  if (req.io) {
    req.io.to(conversationId).emit("conversation_deleted", {
      conversationId,
      deletedBy: currentUser._id,
    });
  }

  res.status(200).json({
    message: "Conversation deleted successfully",
    conversationId,
  });
});

// ==============================
// 🧹 Clear all messages in conversation
// ==============================
export const clearConversation = asyncHandler(async (req, res) => {
  const currentUser = req.user;
  const { conversationId } = req.params;

  const conversation = await Conversation.findById(conversationId);
  
  if (!conversation) {
    return res.status(404).json({ error: "Conversation not found" });
  }

  // Check if user is participant
  const isParticipant = conversation.participants.some(
    (p) => p.toString() === currentUser._id.toString()
  );
  
  if (!isParticipant) {
    return res.status(403).json({ error: "Not authorized to clear this conversation" });
  }

  // Delete all messages in this conversation
  const deleteResult = await Message.deleteMany({ conversation: conversationId });
  
  // Reset conversation's last message
  conversation.lastMessage = null;
  conversation.lastMessageAt = new Date();
  await conversation.save();

  // Emit socket event for realtime update
  if (req.io) {
    req.io.to(conversationId).emit("conversation_cleared", {
      conversationId,
      clearedBy: currentUser._id,
    });
  }

  res.status(200).json({
    message: "Conversation cleared successfully",
    conversationId,
    deletedCount: deleteResult.deletedCount,
  });
});
