import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@clerk/clerk-expo";

// Socket server URL (same domain as API but without /api)
const SOCKET_URL = "http://192.168.68.108:5001";

/**
 * Hook to manage Socket.IO connection
 * Handles connection, disconnection, and provides socket instance
 */
export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [socketError, setSocketError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const { getToken } = useAuth();

  useEffect(() => {
    // Initialize socket connection
    const initSocket = async () => {
      try {
        const token = await getToken();

        if (!token) {
          console.warn("No auth token available for socket connection");
          return;
        }

        // Create socket connection with auth token
        const socket = io(SOCKET_URL, {
          auth: {
            token,
          },
          transports: ["websocket", "polling"],
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionAttempts: 5,
        });

        socketRef.current = socket;

        // Connection handlers
        socket.on("connect", () => {
          console.log("Socket connected:", socket.id);
          setIsConnected(true);
          setSocketError(null);
        });

        socket.on("disconnect", (reason) => {
          console.log("Socket disconnected:", reason);
          setIsConnected(false);
        });

        socket.on("connect_error", (error) => {
          console.error("Socket connection error:", error);
          setSocketError(error.message);
          setIsConnected(false);
        });

        // Cleanup on unmount
        return () => {
          if (socket) {
            socket.disconnect();
            socketRef.current = null;
          }
        };
      } catch (error) {
        console.error("Failed to initialize socket:", error);
        setSocketError("Failed to connect to server");
      }
    };

    initSocket();
  }, [getToken]);

  // Function to join a conversation room
  const joinConversation = (conversationId: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit("join_conversation", conversationId);
    }
  };

  // Function to leave a conversation room
  const leaveConversation = (conversationId: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit("leave_room", conversationId);
    }
  };

  // Function to listen for new messages
  const onReceiveMessage = (callback: (data: any) => void) => {
    if (socketRef.current) {
      socketRef.current.on("receive_message", callback);
    }
    // Cleanup function
    return () => {
      if (socketRef.current) {
        socketRef.current.off("receive_message", callback);
      }
    };
  };

  // Function to emit typing indicator
  const emitTypingStart = (conversationId: string, userId: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit("typing_start", {
        roomId: conversationId,
        userId,
      });
    }
  };

  const emitTypingStop = (conversationId: string, userId: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit("typing_stop", {
        roomId: conversationId,
        userId,
      });
    }
  };

  return {
    socket: socketRef.current,
    isConnected,
    socketError,
    joinConversation,
    leaveConversation,
    onReceiveMessage,
    emitTypingStart,
    emitTypingStop,
  };
};
