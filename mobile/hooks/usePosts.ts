import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient, postApi } from "../utils/api";
import { useSocketContext } from "@/context/SocketContext";
import { useCurrentUser } from "./useCurrentUser";

export const usePosts = (username?: string) => {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const { socket } = useSocketContext();
  const { currentUser } = useCurrentUser();

  const {
    data: postsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: username ? ["userPosts", username] : ["posts"],
    queryFn: () =>
      username ? postApi.getUserPosts(api, username) : postApi.getPosts(api),
    select: (response) => response.data,

    // ⚡ ULTRA-FAST: Instant refresh
    staleTime: 0, // Luôn fetch fresh khi mount
    gcTime: 1000 * 60 * 10, // Cache 10 phút
    refetchOnWindowFocus: true, // Sync khi quay lại app
    refetchOnMount: true,
    placeholderData: (prev) => prev, // ⚡ Hiển thị data cũ ngay lập tức
  });

  // ⚡ REALTIME: Listen for socket events
  useEffect(() => {
    if (!socket) return;

    // Helper to safely get posts array from query data
    const getPostsArray = (data: any): any[] => {
      if (!data) return [];
      // Handle axios response format
      if (data?.data && Array.isArray(data.data)) return data.data;
      if (Array.isArray(data)) return data;
      return [];
    };

    // Helper to update posts in query data
    const updateQueryData = (queryKey: any[], updater: (posts: any[]) => any[]) => {
      queryClient.setQueryData(queryKey, (old: any) => {
        const posts = getPostsArray(old);
        const newPosts = updater(posts);
        // Return in same format as original
        if (old?.data) return { ...old, data: newPosts };
        return newPosts;
      });
    };

    // New post from any user
    const handleNewPost = (post: any) => {
      // Only add to main feed, not user-specific feeds
      if (!username) {
        updateQueryData(["posts"], (posts) => {
          // 🔥 Check if post already exists to prevent duplicates
          const exists = posts.some((p) => p._id === post._id);
          if (exists) return posts;
          return [post, ...posts];
        });
      }
    };

    // Post liked/unliked - ignore if from current user (already optimistically updated)
    const handlePostLiked = (data: { postId: string; userId: string; isLiked: boolean }) => {
      // Skip if this is current user's own like (already handled by optimistic update)
      if (data.userId === currentUser?._id) {
        console.log("[SOCKET] Ignoring own like event - already optimistically updated");
        return;
      }
      
      const queryKey = username ? ["userPosts", username] : ["posts"];
      updateQueryData(queryKey, (posts) =>
        posts.map((p) => {
          if (p._id !== data.postId) return p;
          
          const currentLikes = p.likes || [];
          
          if (data.isLiked) {
            // 🔥 FIX: Check if userId already in likes to prevent duplicates
            if (currentLikes.includes(data.userId)) {
              console.log("[SOCKET] User already in likes array, skipping");
              return p; // Already liked, don't add again
            }
            return { ...p, likes: [...currentLikes, data.userId] };
          } else {
            return { ...p, likes: currentLikes.filter((id: string) => id !== data.userId) };
          }
        })
      );
    };

    // Post deleted
    const handlePostDeleted = (data: { postId: string }) => {
      const queryKey = username ? ["userPosts", username] : ["posts"];
      updateQueryData(queryKey, (posts) =>
        posts.filter((p) => p._id !== data.postId)
      );
    };

    // New comment on a post
    const handleNewComment = (data: { postId: string; comment: any }) => {
      // 🔥 FIX: Skip own comments (already handled by optimistic update in useComments)
      if (data.comment?.user?._id === currentUser?._id) {
        console.log("[SOCKET] Ignoring own comment for post update");
        return;
      }
      
      const queryKey = username ? ["userPosts", username] : ["posts"];
      updateQueryData(queryKey, (posts) =>
        posts.map((p) => {
          if (p._id !== data.postId) return p;
          
          const currentComments = p.comments || [];
          // 🔥 FIX: Check if comment already exists to prevent duplicates
          if (currentComments.some((c: any) => c._id === data.comment._id || c === data.comment._id)) {
            console.log("[SOCKET] Comment already in array, skipping");
            return p;
          }
          return { ...p, comments: [...currentComments, data.comment._id] };
        })
      );
      // Also invalidate comments query for the specific post
      queryClient.invalidateQueries({ queryKey: ["comments", data.postId] });
    };

    socket.on("new_post", handleNewPost);
    socket.on("post_liked", handlePostLiked);
    socket.on("post_deleted", handlePostDeleted);
    socket.on("new_comment", handleNewComment);

    return () => {
      socket.off("new_post", handleNewPost);
      socket.off("post_liked", handlePostLiked);
      socket.off("post_deleted", handlePostDeleted);
      socket.off("new_comment", handleNewComment);
    };
  }, [socket, queryClient, username, currentUser?._id]); // 🔥 FIX: Added currentUser._id to deps

  // Helper functions for safe query data manipulation
  const getPostsArray = (data: any): any[] => {
    if (!data) return [];
    if (data?.data && Array.isArray(data.data)) return data.data;
    if (Array.isArray(data)) return data;
    return [];
  };

  const safeUpdateQueryData = (queryKey: any[], updater: (posts: any[]) => any[]) => {
    queryClient.setQueryData(queryKey, (old: any) => {
      const posts = getPostsArray(old);
      const newPosts = updater(posts);
      if (old?.data) return { ...old, data: newPosts };
      return newPosts;
    });
  };

  // ⚡ OPTIMISTIC UPDATE: Like responds instantly
  const likePostMutation = useMutation({
    mutationFn: (postId: string) => postApi.likePost(api, postId),
    onMutate: async (postId: string) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["posts"] });

      // Snapshot previous value
      const queryKey = username ? ["userPosts", username] : ["posts"];
      const previousPosts = queryClient.getQueryData(queryKey);

      // Optimistically update
      safeUpdateQueryData(queryKey, (posts) =>
        posts.map((p) =>
          p._id === postId
            ? {
                ...p,
                likes: (p.likes || []).includes(currentUser?._id)
                  ? (p.likes || []).filter((id: string) => id !== currentUser?._id)
                  : [...(p.likes || []), currentUser?._id],
              }
            : p
        )
      );

      return { previousPosts, queryKey };
    },
    onError: (err, postId, context) => {
      // Rollback on error
      if (context?.previousPosts) {
        queryClient.setQueryData(context.queryKey, context.previousPosts);
      }
    },
    // No need to invalidate - socket will handle sync
  });

  const deletePostMutation = useMutation({
    mutationFn: (postId: string) => postApi.deletePost(api, postId),
    onMutate: async (postId: string) => {
      const queryKey = username ? ["userPosts", username] : ["posts"];
      const previousPosts = queryClient.getQueryData(queryKey);

      // Optimistically remove
      safeUpdateQueryData(queryKey, (posts) =>
        posts.filter((p) => p._id !== postId)
      );

      return { previousPosts, queryKey };
    },
    onError: (err, postId, context) => {
      if (context?.previousPosts) {
        queryClient.setQueryData(context.queryKey, context.previousPosts);
      }
    },
  });

  // ✅ Khi follow/unfollow ai đó, refresh lại toàn bộ bài viết
  const onUserFollowToggle = async () => {
    await queryClient.invalidateQueries({ queryKey: ["posts"] });
    await queryClient.invalidateQueries({ queryKey: ["userPosts"] });
  };

  const checkIsLiked = (postLikes: string[], user: any) => {
    return user && postLikes.includes(user._id);
  };

  return {
    posts: postsData || [],
    isLoading,
    error,
    refetch,
    toggleLike: (postId: string) => likePostMutation.mutate(postId),
    deletePost: (postId: string) => deletePostMutation.mutate(postId),
    checkIsLiked,
    onUserFollowToggle,
    isLiking: likePostMutation.isPending,
  };
};
