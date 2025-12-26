import React, { createContext, useContext, useState, useEffect } from "react";
import { useSocketContext } from "./SocketContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiClient, messageApi, notificationApi } from "@/utils/api";

interface UnreadContextType {
  unreadMessages: number;
  unreadNotifications: number;
  incrementMessages: () => void;
  incrementNotifications: () => void;
  resetMessages: () => void;
  resetNotifications: () => void;
  refreshCounts: () => void;
}

const UnreadContext = createContext<UnreadContextType | undefined>(undefined);

export const useUnreadContext = () => {
  const context = useContext(UnreadContext);
  if (!context) {
    throw new Error("useUnreadContext must be used within UnreadProvider");
  }
  return context;
};

export const UnreadProvider = ({ children }: { children: React.ReactNode }) => {
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const { socket, isConnected } = useSocketContext();
  const api = useApiClient();
  const queryClient = useQueryClient();

  // Fetch unread message count
  const { data: conversationsData, refetch: refetchConversations } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => messageApi.getConversations(api),
    select: (response) => response.data.conversations,
    staleTime: 30000,
  });

  // Fetch unread notification count
  const { data: notificationsData, refetch: refetchNotifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationApi.getNotifications(api),
    select: (response) => response.data.notifications,
    staleTime: 30000,
  });

  // Calculate unread counts from data
  useEffect(() => {
    if (conversationsData) {
      const unread = conversationsData.filter((conv: any) => !conv.isRead).length;
      setUnreadMessages(unread);
    }
  }, [conversationsData]);

  useEffect(() => {
    if (notificationsData) {
      const unread = notificationsData.filter((notif: any) => !notif.isRead).length;
      setUnreadNotifications(unread);
    }
  }, [notificationsData]);

  // Listen for real-time updates
  useEffect(() => {
    if (!socket || !isConnected) return;

    // New message notification
    const handleNewMessage = (data: any) => {
      console.log("[UNREAD] New message notification:", data);
      setUnreadMessages((prev) => prev + 1);
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    };

    // New notification
    const handleNewNotification = (data: any) => {
      console.log("[UNREAD] New notification:", data);
      setUnreadNotifications((prev) => prev + 1);
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    };

    socket.on("new_message_notification", handleNewMessage);
    socket.on("new_notification", handleNewNotification);

    return () => {
      socket.off("new_message_notification", handleNewMessage);
      socket.off("new_notification", handleNewNotification);
    };
  }, [socket, isConnected]);

  const incrementMessages = () => setUnreadMessages((prev) => prev + 1);
  const incrementNotifications = () => setUnreadNotifications((prev) => prev + 1);
  const resetMessages = () => setUnreadMessages(0);
  const resetNotifications = () => setUnreadNotifications(0);
  
  const refreshCounts = () => {
    refetchConversations();
    refetchNotifications();
  };

  return (
    <UnreadContext.Provider
      value={{
        unreadMessages,
        unreadNotifications,
        incrementMessages,
        incrementNotifications,
        resetMessages,
        resetNotifications,
        refreshCounts,
      }}
    >
      {children}
    </UnreadContext.Provider>
  );
};
