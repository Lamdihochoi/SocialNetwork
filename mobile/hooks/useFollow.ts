import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";
import { useApiClient, userApi } from "../utils/api";
import { useState, useCallback } from "react";

export const useFollow = () => {
  const api = useApiClient();
  const queryClient = useQueryClient();
  
  // ⚡ LOCAL STATE: Track follow status for INSTANT UI update
  const [localFollowingIds, setLocalFollowingIds] = useState<Set<string>>(new Set());
  const [toggledIds, setToggledIds] = useState<Set<string>>(new Set()); // Track which IDs we've toggled

  // ⚡ OPTIMISTIC: Follow/Unfollow responds instantly
  const followMutation = useMutation({
    mutationFn: (targetUserId: string) => userApi.followUser(api, targetUserId),
    onSuccess: (data) => {
      // ⚡ Background sync - don't block UI
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: (error: any, targetUserId) => {
      console.error("[useFollow] Error:", error?.message);
      
      // ⚡ Rollback local state on error
      setToggledIds(prev => {
        const next = new Set(prev);
        next.delete(targetUserId);
        return next;
      });
      
      if (error?.response?.status === 401) {
        Alert.alert("Lỗi xác thực", "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      } else if (error?.response?.status === 404) {
        Alert.alert("Lỗi", "Người dùng không tồn tại.");
      } else {
        Alert.alert("Lỗi", "Không thể thực hiện thao tác follow lúc này.");
      }
    },
  });

  // ⚡ INSTANT: Toggle with immediate local update (like the like button)
  const toggleFollow = useCallback(async (targetUserId: string): Promise<boolean> => {
    if (!targetUserId) return false;

    // ⚡ Update local state IMMEDIATELY - no waiting
    setToggledIds(prev => {
      const next = new Set(prev);
      if (next.has(targetUserId)) {
        next.delete(targetUserId);
      } else {
        next.add(targetUserId);
      }
      return next;
    });

    // ⚡ Also update query data optimistically
    queryClient.setQueryData(["authUser"], (old: any) => {
      if (!old) return old;
      const currentFollowing = old.following || [];
      const isCurrentlyFollowing = currentFollowing.some(
        (f: any) => (typeof f === "string" ? f : f._id) === targetUserId
      );
      
      return {
        ...old,
        following: isCurrentlyFollowing
          ? currentFollowing.filter((f: any) => (typeof f === "string" ? f : f._id) !== targetUserId)
          : [...currentFollowing, { _id: targetUserId }],
        followingCount: isCurrentlyFollowing 
          ? (old.followingCount || 0) - 1 
          : (old.followingCount || 0) + 1,
      };
    });

    // Fire mutation in background (don't await)
    followMutation.mutate(targetUserId);
    
    return true;
  }, [followMutation, queryClient]);

  // ⚡ Check if following (uses local toggle state for instant response)
  const isFollowing = useCallback((targetUserId: string, serverFollowing: any[] = []): boolean => {
    // If we've toggled this ID locally, use toggled state
    if (toggledIds.has(targetUserId)) {
      // Check server state and return opposite (since it's toggled)
      const serverIsFollowing = serverFollowing.some(
        (f: any) => (typeof f === "string" ? f : f._id) === targetUserId
      );
      return !serverIsFollowing;
    }
    
    // Otherwise use server state
    return serverFollowing.some(
      (f: any) => (typeof f === "string" ? f : f._id) === targetUserId
    );
  }, [toggledIds]);

  return { 
    toggleFollow, 
    isFollowing,
    loading: followMutation.isPending,
  };
};
