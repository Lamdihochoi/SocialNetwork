import { getAuth } from "@clerk/express";
import User from "../models/user.model.js";

/**
 * Socket.IO event handlers
 * This file contains all socket event handlers for real-time communication
 */

/**
 * Initialize socket handlers
 * @param {Server} io - Socket.IO server instance
 */
export const initializeSocketHandlers = (io) => {
  io.on("connection", async (socket) => {
    console.log("User connected:", socket.id);

    // Authenticate socket connection (optional, for protected routes)
    // You can verify the token from the handshake auth
    const token = socket.handshake.auth?.token;
    
    // TODO: Verify Clerk token and fetch user from MongoDB
    // For now, we'll just log the connection

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
      
      // Notify others in the room (optional)
      socket.to(roomId).emit("user_left", {
        socketId: socket.id,
        roomId,
      });
    });

    // Handle sending a message (handled by API endpoint, but socket can be used for typing indicators)
    // Note: Actual message sending is handled by POST /api/messages/send endpoint
    // which saves to DB and emits the receive_message event

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

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });
};

