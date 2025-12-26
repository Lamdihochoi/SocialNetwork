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
    joinConversation,
    leaveConversation,
    emitTypingStart,
    emitTypingStop,
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

  return {
    socket,
    isConnected,
    socketError,
    joinConversation,
    leaveConversation,
    onReceiveMessage,
    emitTypingStart,
    emitTypingStop,
  };
};
