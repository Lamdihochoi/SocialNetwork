import { useState } from "react";
import { useApiClient, bookmarkApi } from "../utils/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";

export const useBookmarks = () => {
  const api = useApiClient();
  const queryClient = useQueryClient();

  // Get all bookmarks
  const {
    data: bookmarksData,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["bookmarks"],
    queryFn: () => bookmarkApi.getBookmarks(api),
    select: (response) => response.data.bookmarks,
  });

  // Toggle bookmark mutation
  const toggleBookmarkMutation = useMutation({
    mutationFn: (postId: string) => bookmarkApi.toggleBookmark(api, postId),
    onSuccess: (response, postId) => {
      // Invalidate bookmarks query to refresh
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: () => {
      Alert.alert("Lỗi", "Không thể lưu bài viết. Thử lại.");
    },
  });

  const toggleBookmark = (postId: string) => {
    toggleBookmarkMutation.mutate(postId);
  };

  // Check if a post is bookmarked (local check)
  const isBookmarked = (postId: string) => {
    return bookmarksData?.some((post: any) => post._id === postId) || false;
  };

  return {
    bookmarks: bookmarksData || [],
    isLoading,
    error,
    refetch,
    isRefetching,
    toggleBookmark,
    isToggling: toggleBookmarkMutation.isPending,
    isBookmarked,
  };
};
