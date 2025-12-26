import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@clerk/clerk-expo";

// Use env variable or fallback
const SOCKET_URL = process.env.EXPO_PUBLIC_API_URL || "http://192.168.68.129:5001";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  socketError: string | null;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  emitTypingStart: (conversationId: string, userId: string) => void;
  emitTypingStop: (conversationId: string, userId: string) => void;
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
  const socketRef = useRef<Socket | null>(null);
  const { getToken, isSignedIn } = useAuth();

  useEffect(() => {
    let socket: Socket | null = null;

    const initSocket = async () => {
      // 1. Only connect if signed in
      if (!isSignedIn) return;

      // 2. Prevent multiple connections if already connected
      if (socketRef.current?.connected) {
         return;
      }

      console.log("Initializing socket connection to:", SOCKET_URL);

      try {
        const token = await getToken();
        
        // 3. Create new socket connection
        socket = io(SOCKET_URL, {
          auth: { token },
          transports: ["websocket", "polling"],
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionAttempts: 5,
        });

        socketRef.current = socket;

        socket.on("connect", () => {
          console.log("Socket connected:", socket?.id);
          setIsConnected(true);
          setSocketError(null);
        });

        socket.on("disconnect", (reason) => {
          console.log("Socket disconnected:", reason);
          if (reason === "io server disconnect") {
             // Server disconnected us, likely token expired or manual kick.
             // We can let it stay disconnected or try strict reconnect logic if needed.
             // For now, let's reset state.
             setIsConnected(false);
          } else {
             setIsConnected(false);
          }
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
      }
    };
  }, [isSignedIn]); // Only re-run if login state changes.

  const joinConversation = (conversationId: string) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("join_conversation", conversationId);
    }
  };

  const leaveConversation = (conversationId: string) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("leave_room", conversationId);
    }
  };

  const emitTypingStart = (conversationId: string, userId: string) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("typing_start", { roomId: conversationId, userId });
    }
  };

  const emitTypingStop = (conversationId: string, userId: string) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("typing_stop", { roomId: conversationId, userId });
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket: socketRef.current,
        isConnected,
        socketError,
        joinConversation,
        leaveConversation,
        emitTypingStart,
        emitTypingStop,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};
