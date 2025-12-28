import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "../utils/api";
import { useSocketContext } from "@/context/SocketContext";

export const useNotifications = () => {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const { socket } = useSocketContext();

  const {
    data: notificationsData,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.get("/notifications"),
    select: (res) => res.data.notifications,
    // ⚡ FAST: 15s staleTime for notifications
    staleTime: 1000 * 15, // 15 giây
    gcTime: 1000 * 60 * 5, // 5 phút
    refetchOnMount: true,
  });

  // ⚡ REALTIME: Listen for new notifications
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (notification: any) => {
      // Add new notification to the top of the list - handle both data formats
      queryClient.setQueryData(["notifications"], (old: any) => {
        // If already an array
        if (Array.isArray(old)) {
          return [notification, ...old];
        }
        // If raw axios response format
        if (old?.data?.notifications && Array.isArray(old.data.notifications)) {
          return {
            ...old,
            data: {
              ...old.data,
              notifications: [notification, ...old.data.notifications],
            },
          };
        }
        // If undefined or invalid, return array with just the new notification
        return [notification];
      });
    };

    socket.on("new_notification", handleNewNotification);

    return () => {
      socket.off("new_notification", handleNewNotification);
    };
  }, [socket, queryClient]);

  // ⚡ OPTIMISTIC: Delete notification instantly
  const deleteNotificationMutation = useMutation({
    mutationFn: (notificationId: string) =>
      api.delete(`/notifications/${notificationId}`),
    onMutate: async (notificationId: string) => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });
      const previous = queryClient.getQueryData(["notifications"]);
      
      queryClient.setQueryData(["notifications"], (old: any) => {
        if (Array.isArray(old)) {
          return old.filter((n) => n._id !== notificationId);
        }
        if (old?.data?.notifications && Array.isArray(old.data.notifications)) {
          return {
            ...old,
            data: {
              ...old.data,
              notifications: old.data.notifications.filter((n: any) => n._id !== notificationId),
            },
          };
        }
        return old;
      });
      return { previous };
    },
    onError: (err, notificationId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["notifications"], context.previous);
      }
    },
  });

  // ⚡ OPTIMISTIC: Mark as read instantly
  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) =>
      api.put(`/notifications/${notificationId}/read`),
    onMutate: async (notificationId: string) => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });
      const previous = queryClient.getQueryData(["notifications"]);
      
      // Optimistic update - handle both array and object formats
      queryClient.setQueryData(["notifications"], (old: any) => {
        // If already an array (from previous select)
        if (Array.isArray(old)) {
          return old.map((n) =>
            n._id === notificationId ? { ...n, isRead: true } : n
          );
        }
        // If it's the raw response object
        if (old?.data?.notifications) {
          return {
            ...old,
            data: {
              ...old.data,
              notifications: old.data.notifications.map((n: any) =>
                n._id === notificationId ? { ...n, isRead: true } : n
              ),
            },
          };
        }
        return old;
      });
      return { previous };
    },
    onSuccess: () => {
      // Invalidate to ensure all consumers get consistent data
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (err, notificationId, context) => {
      console.error("[NOTIFICATION] Error marking as read:", err);
      if (context?.previous) {
        queryClient.setQueryData(["notifications"], context.previous);
      }
    },
  });

  const deleteNotification = (notificationId: string) => {
    deleteNotificationMutation.mutate(notificationId);
  };

  const markAsRead = (notificationId: string) => {
    markAsReadMutation.mutate(notificationId);
  };

  // Count unread notifications
  const unreadCount = notificationsData?.filter((n: any) => !n.isRead).length || 0;

  return {
    notifications: notificationsData || [],
    isLoading,
    error,
    refetch,
    isRefetching,
    deleteNotification,
    markAsRead,
    isDeletingNotification: deleteNotificationMutation.isPending,
    unreadCount,
  };
};
