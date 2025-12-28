import { useEffect } from "react";
import { useSocketContext } from "@/context/SocketContext";

/**
 * Hook to consume SocketContext
 * Provides socket instance and helper methods
 */
export const useSocket = () => {
  const {
    socket,
    isConnected,
    socketError,
    onlineUsers,
    joinConversation,
    leaveConversation,
    emitTypingStart,
    emitTypingStop,
    emitMarkRead,
    emitSendMessage,
    isUserOnline,
    setOnNewMessageCallback,
  } = useSocketContext();

  // Helper to listen for new messages with automatic cleanup
  const onReceiveMessage = (callback: (data: any) => void) => {
    if (socket) {
      socket.on("receive_message", callback);
    }
    
    // Return cleanup function
    return () => {
      if (socket) {
        socket.off("receive_message", callback);
      }
    };
  };

  // 👁️ Helper to listen for messages read event
  const onMessagesRead = (callback: (data: { conversationId: string; readBy: string; readAt: string }) => void) => {
    if (socket) {
      socket.on("messages_read", callback);
    }
    
    return () => {
      if (socket) {
        socket.off("messages_read", callback);
      }
    };
  };

  return {
    socket,
    isConnected,
    socketError,
    onlineUsers,
    joinConversation,
    leaveConversation,
    onReceiveMessage,
    onMessagesRead,
    emitTypingStart,
    emitTypingStop,
    emitMarkRead,
    emitSendMessage,
    isUserOnline,
    setOnNewMessageCallback,
  };
};
