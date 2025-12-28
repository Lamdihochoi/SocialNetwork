import { getAuth } from "@clerk/express";
import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import Conversation from "../models/conversation.model.js";
// 🔐 Backend encryption removed - using pure E2E (frontend encrypts/decrypts)

/**
 * Socket.IO event handlers
 * This file contains all socket event handlers for real-time communication
 */

// 🔥 ONLINE USERS TRACKING
// Map: clerkId -> { socketId, mongoUserId, lastSeen }
const onlineUsers = new Map();

// Helper to get online user IDs
export const getOnlineUserIds = () => {
  return Array.from(onlineUsers.keys());
};

// Helper to check if user is online
export const isUserOnline = (userId) => {
  return onlineUsers.has(userId);
};

/**
 * Initialize socket handlers
 * @param {Server} io - Socket.IO server instance
 */
export const initializeSocketHandlers = (io) => {
  io.on("connection", async (socket) => {
    console.log("User connected:", socket.id);

    // 🔐 Authenticate and track user
    const token = socket.handshake.auth?.token;
    let currentUserId = null;
    let mongoUserId = null;

    // Try to get user from handshake (userId sent from client)
    const userIdFromClient = socket.handshake.auth?.userId;
    
    if (userIdFromClient) {
      currentUserId = userIdFromClient;
      
      // Try to find MongoDB user
      try {
        const user = await User.findOne({ clerkId: userIdFromClient });
        if (user) {
          mongoUserId = user._id.toString();
          
          // Update lastSeen to now (online)
          await User.findByIdAndUpdate(user._id, { lastSeen: new Date() });
        }
      } catch (err) {
        console.error("Error finding user:", err);
      }
    }

    // 🟢 TRACK ONLINE USER
    if (currentUserId) {
      onlineUsers.set(currentUserId, {
        socketId: socket.id,
        mongoUserId,
        lastSeen: new Date(),
      });

      // ⚡ Join user-specific room for targeted notifications
      if (mongoUserId) {
        socket.join(`user_${mongoUserId}`);
        console.log(`Socket ${socket.id} joined room: user_${mongoUserId}`);
      }

      // Broadcast to all: this user is now online
      socket.broadcast.emit("user_online", {
        clerkId: currentUserId,
        mongoUserId,
        lastSeen: new Date().toISOString(),
      });

      console.log(`User ${currentUserId} is now online. Total online: ${onlineUsers.size}`);
      
      // 🔥 FIX: Send current online users list to newly connected socket
      const onlineList = Array.from(onlineUsers.entries()).map(([clerkId, data]) => ({
        clerkId,
        mongoUserId: data.mongoUserId,
        lastSeen: data.lastSeen.toISOString ? data.lastSeen.toISOString() : data.lastSeen,
      }));
      socket.emit("online_users_list", onlineList);
    }

    // 📋 GET ONLINE USERS - Client requests current online list
    socket.on("get_online_users", (callback) => {
      const onlineList = Array.from(onlineUsers.entries()).map(([clerkId, data]) => ({
        clerkId,
        mongoUserId: data.mongoUserId,
        lastSeen: data.lastSeen.toISOString(),
      }));
      
      if (typeof callback === "function") {
        callback(onlineList);
      } else {
        socket.emit("online_users_list", onlineList);
      }
    });

    // Handle joining a conversation room (for private messaging)
    socket.on("join_conversation", (conversationId) => {
      socket.join(conversationId);
      console.log(`User ${socket.id} joined conversation: ${conversationId}`);
    });

    // Legacy support: join_room still works
    socket.on("join_room", (roomId) => {
      socket.join(roomId);
      console.log(`User ${socket.id} joined room: ${roomId}`);
    });

    // Handle leaving a room
    socket.on("leave_room", (roomId) => {
      socket.leave(roomId);
      console.log(`User ${socket.id} left room: ${roomId}`);
    });

    // 👁️ MARK MESSAGES AS READ
    socket.on("mark_messages_read", async (data) => {
      const { conversationId, readerId } = data;
      
      if (!conversationId || !readerId) return;

      try {
        // Update all unread messages in this conversation where reader is the receiver
        const result = await Message.updateMany(
          {
            conversation: conversationId,
            receiver: readerId,
            isRead: false,
          },
          {
            $set: { isRead: true, readAt: new Date() }
          }
        );

        console.log(`Marked ${result.modifiedCount} messages as read in conversation ${conversationId}`);

        // Notify sender that their messages have been read
        socket.to(conversationId).emit("messages_read", {
          conversationId,
          readBy: readerId,
          readAt: new Date().toISOString(),
        });
      } catch (error) {
        console.error("Error marking messages as read:", error);
      }
    });

    // Handle typing indicator
    socket.on("typing_start", (data) => {
      const { roomId, userId } = data;
      socket.to(roomId).emit("user_typing", {
        userId,
        roomId,
        isTyping: true,
      });
    });

    socket.on("typing_stop", (data) => {
      const { roomId, userId } = data;
      socket.to(roomId).emit("user_typing", {
        userId,
        roomId,
        isTyping: false,
      });
    });

    // 🚀 SOCKET-FIRST: Send message via socket for instant delivery
    socket.on("send_message", async (data) => {
      const { receiverId, content, tempId } = data;
      
      if (!currentUserId || !mongoUserId || !receiverId || !content) {
        console.warn("[SOCKET] send_message: Missing required fields");
        return;
      }

      try {
        console.log(`[SOCKET] Processing message from ${mongoUserId} to ${receiverId}`);
        
        // Find receiver
        const receiver = await User.findById(receiverId);
        if (!receiver) {
          console.warn("[SOCKET] send_message: Receiver not found");
          return;
        }

        // Find or create conversation
        let conversation = await Conversation.findOne({
          participants: { $all: [mongoUserId, receiverId], $size: 2 },
        });

        if (!conversation) {
          conversation = await Conversation.create({
            participants: [mongoUserId, receiverId],
          });
        }

        // 🔐 E2E: Content already encrypted by frontend, store as-is
        const message = await Message.create({
          sender: mongoUserId,
          receiver: receiverId,
          conversation: conversation._id,
          content: content, // Store E2E encrypted content directly
        });

        // Update conversation lastMessage
        conversation.lastMessage = message._id;
        await conversation.save();

        // Prepare message for clients (with decrypted content)
        const sender = await User.findById(mongoUserId).select("firstName lastName username profilePicture");
        const messageForClient = {
          _id: message._id,
          tempId, // 🔥 Include tempId so client can replace optimistic message
          sender: {
            _id: mongoUserId,
            firstName: sender?.firstName,
            lastName: sender?.lastName,
            username: sender?.username,
            profilePicture: sender?.profilePicture,
          },
          receiver: {
            _id: receiverId,
            firstName: receiver?.firstName,
            lastName: receiver?.lastName,
            username: receiver?.username,
            profilePicture: receiver?.profilePicture,
          },
          content, // E2E encrypted content - frontend will decrypt
          createdAt: message.createdAt,
          isRead: false,
          conversationId: conversation._id,
        };

        // 🔥 INSTANT BROADCAST: Emit to all relevant rooms
        const roomId = conversation._id.toString();
        
        // 1. Conversation room - for users with chat open
        io.to(roomId).emit("receive_message", messageForClient);
        
        // 2. Receiver's user room - for realtime notifications
        io.to(`user_${receiverId}`).emit("receive_message", messageForClient);
        
        // 3. Sender's user room - for multi-device sync
        io.to(`user_${mongoUserId}`).emit("receive_message", messageForClient);
        
        // 🔔 Send notification to receiver
        io.to(`user_${receiverId}`).emit("new_message_notification", {
          sender: messageForClient.sender,
          content,
          conversationId: conversation._id,
        });

        console.log(`[SOCKET] Message sent instantly: ${message._id} to rooms: ${roomId}, user_${receiverId}, user_${mongoUserId}`);
      } catch (error) {
        console.error("[SOCKET] Error sending message:", error);
      }
    });

    // 🔴 HANDLE DISCONNECTION
    socket.on("disconnect", async () => {
      console.log("User disconnected:", socket.id);

      if (currentUserId) {
        // Update lastSeen in database
        try {
          if (mongoUserId) {
            await User.findByIdAndUpdate(mongoUserId, { lastSeen: new Date() });
          }
        } catch (err) {
          console.error("Error updating lastSeen:", err);
        }

        // Remove from online users
        onlineUsers.delete(currentUserId);

        // Broadcast to all: this user is now offline
        socket.broadcast.emit("user_offline", {
          clerkId: currentUserId,
          mongoUserId,
          lastSeen: new Date().toISOString(),
        });

        console.log(`User ${currentUserId} is now offline. Total online: ${onlineUsers.size}`);
      }
    });
  });
};

