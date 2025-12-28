import { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";
import { useApiClient, commentApi } from "../utils/api";
import { useSocketContext } from "@/context/SocketContext";
import { useCurrentUser } from "./useCurrentUser";

export const useComments = (postId?: string) => {
  const [commentText, setCommentText] = useState("");
  const api = useApiClient();
  const queryClient = useQueryClient();
  const { socket } = useSocketContext();
  const { currentUser } = useCurrentUser();

  // ⚡ Fetch comments for a specific post
  const {
    data: commentsRaw,
    isLoading: isLoadingComments,
    refetch: refetchComments,
  } = useQuery({
    queryKey: ["comments", postId],
    queryFn: async () => {
      const res = await commentApi.getComments(api, postId!);
      return res.data.comments || [];
    },
    enabled: !!postId,
    staleTime: 0, // ⚡ Luôn fresh - tối ưu cho realtime
    gcTime: 1000 * 60 * 5,
    refetchOnMount: true,
  });

  // 🔥 FIX: Deduplicate comments before rendering
  const comments = useMemo(() => {
    const raw = Array.isArray(commentsRaw) ? commentsRaw : [];
    const seen = new Set<string>();
    return raw.filter((c: any) => {
      if (seen.has(c._id)) return false;
      seen.add(c._id);
      return true;
    });
  }, [commentsRaw]);

  // ⚡ REALTIME: Listen for new comments on this post
  useEffect(() => {
    if (!socket || !postId) return;

    const handleNewComment = (data: { postId: string; comment: any }) => {
      if (data.postId === postId) {
        // 🔥 FIX: Ignore own comments - already handled by optimistic update
        if (data.comment?.user?._id === currentUser?._id) {
          console.log("[SOCKET] Ignoring own comment - already optimistically added");
          return;
        }
        
        // 🔥 FIX: Check if comment already exists to prevent duplicates
        queryClient.setQueryData(["comments", postId], (old: any) => {
          const oldArray = Array.isArray(old) ? old : [];
          const exists = oldArray.some((c: any) => c._id === data.comment._id);
          if (exists) return oldArray;
          return [data.comment, ...oldArray];
        });
      }
    };

    socket.on("new_comment", handleNewComment);

    return () => {
      socket.off("new_comment", handleNewComment);
    };
  }, [socket, postId, queryClient, currentUser?._id]);

  // ⚡ OPTIMISTIC: Comment appears instantly
  const createCommentMutation = useMutation({
    mutationFn: async ({
      postId,
      content,
    }: {
      postId: string;
      content: string;
    }) => {
      const response = await commentApi.createComment(api, postId, content);
      return response.data;
    },
    onMutate: async ({ postId, content }) => {
      await queryClient.cancelQueries({ queryKey: ["comments", postId] });
      const previous = queryClient.getQueryData(["comments", postId]);

      // Optimistic comment
      const optimisticComment = {
        _id: `temp_${Date.now()}`,
        content,
        user: {
          _id: currentUser?._id,
          username: currentUser?.username,
          firstName: currentUser?.firstName,
          lastName: currentUser?.lastName,
          profilePicture: currentUser?.profilePicture,
        },
        createdAt: new Date().toISOString(),
        isOptimistic: true,
      };

      // Safely handle old data - ensure it's an array before spreading
      queryClient.setQueryData(["comments", postId], (old: any) => {
        const oldArray = Array.isArray(old) ? old : [];
        return [optimisticComment, ...oldArray];
      });

      // ⚡ FIX: Also update comment count in posts query IMMEDIATELY
      queryClient.setQueryData(["posts"], (old: any) => {
        if (!old?.data?.posts) return old;
        return {
          ...old,
          data: {
            ...old.data,
            posts: old.data.posts.map((post: any) => 
              post._id === postId 
                ? { ...post, comments: [...(post.comments || []), optimisticComment] }
                : post
            )
          }
        };
      });

      // 🔥 FIX: Clear input immediately for instant feedback
      setCommentText("");

      return { previous, postId };
    },
    onSuccess: (data, variables) => {
      // Replace optimistic comment with real one
      queryClient.setQueryData(["comments", variables.postId], (old: any) => {
        const oldArray = Array.isArray(old) ? old : [];
        return oldArray.map((c) => (c.isOptimistic ? data.comment : c));
      });
      
      // ⚡ FIX: Update posts query with real comment data
      queryClient.setQueryData(["posts"], (old: any) => {
        if (!old?.data?.posts) return old;
        return {
          ...old,
          data: {
            ...old.data,
            posts: old.data.posts.map((post: any) => 
              post._id === variables.postId 
                ? { 
                    ...post, 
                    comments: post.comments.map((c: any) => 
                      c.isOptimistic ? data.comment : c
                    )
                  }
                : post
            )
          }
        };
      });
    },
    onError: (err: any, variables, context) => {
      console.error("[COMMENT] Error creating comment:", err);
      console.error("[COMMENT] Error response:", err.response?.data);
      console.error("[COMMENT] Error status:", err.response?.status);
      if (context?.previous) {
        queryClient.setQueryData(["comments", context.postId], context.previous);
      }
      const errorMsg = err.response?.data?.error || "Không thể đăng bình luận. Thử lại.";
      Alert.alert("Lỗi", errorMsg);
    },
  });

  const createComment = (targetPostId: string) => {
    if (!commentText.trim()) {
      Alert.alert("Thiếu nội dung", "Vui lòng nhập bình luận trước khi gửi!");
      return;
    }

    createCommentMutation.mutate({ postId: targetPostId, content: commentText.trim() });
  };

  return {
    commentText,
    setCommentText,
    createComment,
    isCreatingComment: createCommentMutation.isPending,
    comments,
    isLoadingComments,
    refetchComments,
  };
};
