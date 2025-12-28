import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { io, Socket } from "socket.io-client";
import { useAuth, useUser } from "@clerk/clerk-expo";

// Use env variable or fallback
const SOCKET_URL = process.env.EXPO_PUBLIC_API_URL || "http://192.168.68.129:5001";

interface OnlineUser {
  clerkId: string;
  mongoUserId: string;
  lastSeen: string;
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  socketError: string | null;
  onlineUsers: Set<string>; // Set of clerkIds that are online
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  emitTypingStart: (conversationId: string, userId: string) => void;
  emitTypingStop: (conversationId: string, userId: string) => void;
  emitMarkRead: (conversationId: string, readerId: string) => void;
  emitSendMessage: (data: { receiverId: string; content: string; tempId: string }) => void;
  isUserOnline: (clerkId: string) => boolean;
  // 🔔 Global message callback - for updating conversations list
  setOnNewMessageCallback: (callback: ((message: any) => void) | null) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocketContext = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocketContext must be used within a SocketProvider");
  }
  return context;
};

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [socketError, setSocketError] = useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const socketRef = useRef<Socket | null>(null);
  const { getToken, isSignedIn, userId } = useAuth();
  const { user } = useUser();
  
  // 🔔 Global message callback ref
  const onNewMessageCallbackRef = useRef<((message: any) => void) | null>(null);

  useEffect(() => {
    let socket: Socket | null = null;

    const initSocket = async () => {
      // 1. Only connect if signed in
      if (!isSignedIn || !userId) return;

      // 2. Prevent multiple connections if already connected
      if (socketRef.current?.connected) {
         return;
      }

      console.log("Initializing socket connection to:", SOCKET_URL);

      try {
        const token = await getToken();
        
        // 3. Create new socket connection with userId for tracking
        // ⚡ OPTIMIZED: Use websocket only - faster than polling
        socket = io(SOCKET_URL, {
          auth: { 
            token,
            userId, // 🔥 Send userId to server for online tracking
          },
          transports: ["websocket"], // ⚡ WebSocket only - no polling delay
          reconnection: true,
          reconnectionDelay: 500,    // ⚡ Faster reconnect
          reconnectionAttempts: 10,
          timeout: 10000,            // ⚡ Timeout after 10s
        });

        socketRef.current = socket;

        socket.on("connect", () => {
          console.log("Socket connected:", socket?.id);
          setIsConnected(true);
          setSocketError(null);

          // Request current online users list
          socket?.emit("get_online_users", (users: OnlineUser[]) => {
            const onlineSet = new Set(users.map(u => u.clerkId));
            setOnlineUsers(onlineSet);
            console.log("Online users:", onlineSet.size);
          });
        });

        // 🟢 Listen for user coming online
        socket.on("user_online", (data: OnlineUser) => {
          console.log("User came online:", data.clerkId);
          setOnlineUsers(prev => new Set([...prev, data.clerkId]));
        });

        // 🔴 Listen for user going offline
        socket.on("user_offline", (data: OnlineUser) => {
          console.log("User went offline:", data.clerkId);
          setOnlineUsers(prev => {
            const newSet = new Set(prev);
            newSet.delete(data.clerkId);
            return newSet;
          });
        });

        // 📋 Receive online users list
        socket.on("online_users_list", (users: OnlineUser[]) => {
          const onlineSet = new Set(users.map(u => u.clerkId));
          setOnlineUsers(onlineSet);
        });

        // 🔔 GLOBAL: Listen for incoming messages (for realtime update even when chat is closed)
        socket.on("receive_message", (data: any) => {
          console.log("[SOCKET] Received message globally:", data?._id);
          // Trigger the callback if set (used by messages screen to update list)
          if (onNewMessageCallbackRef.current) {
            onNewMessageCallbackRef.current(data);
          }
        });

        socket.on("disconnect", (reason) => {
          console.log("Socket disconnected:", reason);
          setIsConnected(false);
        });

        socket.on("connect_error", (error) => {
          console.warn("Socket connection error:", error.message);
          setSocketError(error.message);
          setIsConnected(false);
        });
      } catch (error) {
        console.error("Failed to initialize socket:", error);
        setSocketError("Failed to connect to server");
      }
    };

    initSocket();

    // 4. Cleanup function
    return () => {
      if (socketRef.current) {
        console.log("Cleaning up socket connection...");
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
        setOnlineUsers(new Set());
      }
    };
  }, [isSignedIn, userId]);

  const joinConversation = useCallback((conversationId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("join_conversation", conversationId);
    }
  }, []);

  const leaveConversation = useCallback((conversationId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("leave_room", conversationId);
    }
  }, []);

  const emitTypingStart = useCallback((conversationId: string, userId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("typing_start", { roomId: conversationId, userId });
    }
  }, []);

  const emitTypingStop = useCallback((conversationId: string, userId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("typing_stop", { roomId: conversationId, userId });
    }
  }, []);

  // 👁️ Mark messages as read
  const emitMarkRead = useCallback((conversationId: string, readerId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("mark_messages_read", { conversationId, readerId });
    }
  }, []);

  // Check if a user is online
  const isUserOnline = useCallback((clerkId: string): boolean => {
    return onlineUsers.has(clerkId);
  }, [onlineUsers]);

  // 🔔 Set callback for global message events
  const setOnNewMessageCallback = useCallback((callback: ((message: any) => void) | null) => {
    onNewMessageCallbackRef.current = callback;
  }, []);

  // 🚀 SOCKET-FIRST: Send message via socket for instant delivery
  const emitSendMessage = useCallback((data: { receiverId: string; content: string; tempId: string }) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("send_message", data);
      console.log("[SOCKET] Emitting send_message:", data.tempId);
    } else {
      console.warn("[SOCKET] Not connected, cannot send message");
    }
  }, []);

  return (
    <SocketContext.Provider
      value={{
        socket: socketRef.current,
        isConnected,
        socketError,
        onlineUsers,
        joinConversation,
        leaveConversation,
        emitTypingStart,
        emitTypingStop,
        emitMarkRead,
        isUserOnline,
        setOnNewMessageCallback,
        emitSendMessage,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};
