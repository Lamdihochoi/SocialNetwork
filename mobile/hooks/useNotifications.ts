import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "../utils/api";

export const useNotifications = () => {
  const api = useApiClient();
  const queryClient = useQueryClient();

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
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: (notificationId: string) =>
      api.delete(`/notifications/${notificationId}`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) =>
      api.put(`/notifications/${notificationId}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const deleteNotification = (notificationId: string) => {
    deleteNotificationMutation.mutate(notificationId);
  };

  const markAsRead = (notificationId: string) => {
    markAsReadMutation.mutate(notificationId);
  };

  return {
    notifications: notificationsData || [],
    isLoading,
    error,
    refetch,
    isRefetching,
    deleteNotification,
    markAsRead,
    isDeletingNotification: deleteNotificationMutation.isPending,
  };
};
