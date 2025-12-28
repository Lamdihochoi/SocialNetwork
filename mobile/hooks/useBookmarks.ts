import { useApiClient, bookmarkApi } from "../utils/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";
import { useState, useCallback, useEffect } from "react";

export const useBookmarks = () => {
  const api = useApiClient();
  const queryClient = useQueryClient();

  // ⚡ LOCAL STATE: Track bookmarked posts for instant UI updates
  const [localBookmarks, setLocalBookmarks] = useState<Set<string>>(new Set());

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
    staleTime: 0, // Always fresh
    gcTime: 1000 * 60 * 5,
    refetchOnMount: true,
  });

  // ⚡ Sync local state with server data
  useEffect(() => {
    if (bookmarksData) {
      setLocalBookmarks(new Set(bookmarksData.map((post: any) => post._id)));
    }
  }, [bookmarksData]);

  // ⚡ OPTIMISTIC: Bookmark responds instantly (like button style)
  const toggleBookmarkMutation = useMutation({
    mutationFn: (postId: string) => bookmarkApi.toggleBookmark(api, postId),
    onSuccess: () => {
      // Refresh bookmarks to get the full data
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
    },
    onError: (err, postId) => {
      // Rollback local state on error
      setLocalBookmarks((prev) => {
        const next = new Set(prev);
        if (next.has(postId)) {
          next.delete(postId);
        } else {
          next.add(postId);
        }
        return next;
      });
      Alert.alert("Lỗi", "Không thể lưu bài viết. Thử lại.");
    },
  });

  // ⚡ INSTANT: Toggle with immediate local update
  const toggleBookmark = useCallback((postId: string) => {
    // Update local state IMMEDIATELY
    setLocalBookmarks((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });

    // Then fire mutation (server will sync)
    toggleBookmarkMutation.mutate(postId);
  }, [toggleBookmarkMutation]);

  // Check if a post is bookmarked (INSTANT from local state)
  const isBookmarked = useCallback((postId: string): boolean => {
    return localBookmarks.has(postId);
  }, [localBookmarks]);

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
