import asyncHandler from "express-async-handler";
import Message from "../models/message.model.js";
import Conversation from "../models/conversation.model.js";
import User from "../models/user.model.js";
import cloudinary from "../config/cloudinary.js";

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

  // Get current user with populated following
  const currentUserDoc = await User.findById(currentUser._id).populate(
    "following",
    "username firstName lastName profilePicture"
  );

  if (!currentUserDoc) {
    return res.status(404).json({ error: "User not found" });
  }

  // Find all users who:
  // 1. Are in currentUser's following list
  // 2. Have currentUser in their following list (mutual follow)
  const friends = [];

  for (const followedUser of currentUserDoc.following) {
    const otherUser = await User.findById(followedUser._id).populate(
      "following",
      "_id"
    );

    if (otherUser) {
      // Check if the other user also follows current user
      const otherUserFollowsCurrent = otherUser.following.some(
        (id) => id.toString() === currentUser._id.toString()
      );

      if (otherUserFollowsCurrent) {
        friends.push({
          _id: otherUser._id,
          username: otherUser.username,
          firstName: otherUser.firstName,
          lastName: otherUser.lastName,
          profilePicture: otherUser.profilePicture,
        });
      }
    }
  }

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
      select: "username firstName lastName profilePicture",
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

      return {
        _id: conv._id,
        user: {
          _id: otherParticipant._id,
          username: otherParticipant.username,
          firstName: otherParticipant.firstName,
          lastName: otherParticipant.lastName,
          profilePicture: otherParticipant.profilePicture,
        },
        lastMessage: conv.lastMessage?.content || "Bắt đầu cuộc trò chuyện",
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

  res.status(200).json({
    conversation: {
      _id: conversation._id,
      otherUser: {
        _id: otherUser._id,
        username: otherUser.username,
        firstName: otherUser.firstName,
        lastName: otherUser.lastName,
        profilePicture: otherUser.profilePicture,
      },
    },
    messages,
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

  let conversation = await Conversation.findOne({
    participants: { $all: [senderDoc._id, receiverDoc._id] },
  });

  if (!conversation) {
    conversation = await Conversation.create({
      participants: [senderDoc._id, receiverDoc._id],
    });
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
      } else if (isPDF || isWord) {
        resourceType = "raw";
        folder = "social_media_messages/documents";
        messageType = "file";
      }

      // Convert buffer to base64 for Cloudinary
      const base64File = `data:${file.mimetype};base64,${file.buffer.toString(
        "base64"
      )}`;

      const uploadResponse = await cloudinary.uploader.upload(base64File, {
        folder: folder,
        resource_type: resourceType,
        ...(isImage && {
          transformation: [
            { width: 800, height: 800, crop: "limit" },
            { quality: "auto" },
            { format: "auto" },
          ],
        }),
      });

      attachment = {
        url: uploadResponse.secure_url,
        type: isImage ? "image" : "file",
        fileName: file.originalname || "attachment",
        fileSize: file.size,
      };

      // If no text content, set a default message
      if (!messageContent) {
        messageContent = isImage
          ? "📷 Image"
          : isPDF
          ? "📄 PDF Document"
          : "📝 Document";
      }
    } catch (uploadError) {
      console.error("Cloudinary upload error:", uploadError);
      return res.status(400).json({ error: "Failed to upload file" });
    }
  }

  const message = await Message.create({
    sender: senderDoc._id,
    receiver: receiverDoc._id,
    content: messageContent,
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

  if (req.io) {
    // Gửi vào phòng chat
    req.io.to(roomId).emit("receive_message", message);

    // Gửi thông báo popup
    req.io.to(`user_${receiverId}`).emit("new_message_notification", {
      sender: message.sender,
      content: message.content,
      conversationId: conversation._id,
    });
  } else {
    console.warn("Socket.io not found in request!");
  }

  res.status(201).json({ message });
});
