import { useCurrentUser } from "@/hooks/useCurrentUser";
import { usePosts } from "@/hooks/usePosts";
import { useFollow } from "@/hooks/useFollow";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useSocketContext } from "@/context/SocketContext";
import { Post } from "@/types";
import { View, Text, ActivityIndicator, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import PostCard from "./PostCard";
import { useState, useCallback, memo } from "react";
import CommentsModal from "./CommentsModal";
import SharePostModal from "./SharePostModal";
import { useRouter } from "expo-router";

const PostsList = ({ username }: { username?: string }) => {
  const { currentUser } = useCurrentUser();
  const router = useRouter();
  const { isUserOnline } = useSocketContext(); // ⚡ Get online status checker
  const {
    posts,
    isLoading,
    error,
    refetch,
    toggleLike,
    deletePost,
    checkIsLiked,
    onUserFollowToggle,
  } = usePosts(username);
  const { toggleFollow, isFollowing } = useFollow(); // ⚡ Get isFollowing for sync
  const { toggleBookmark, isBookmarked } = useBookmarks();
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [sharePost, setSharePost] = useState<Post | null>(null);

  const selectedPost = selectedPostId
    ? posts.find((p: Post) => p._id === selectedPostId)
    : null;

  // ⚡ PERFORMANCE: Memoize handlers
  const handleFollow = useCallback(async (userId: string) => {
    await toggleFollow(userId);
    await onUserFollowToggle();
    refetch();
  }, [toggleFollow, onUserFollowToggle, refetch]);

  const handleProfilePress = useCallback((userId: string) => {
    router.push(`/user/${userId}`);
  }, [router]);

  const handleShare = useCallback((post: Post) => {
    setSharePost(post);
  }, []);

  const handleComment = useCallback((post: Post) => {
    setSelectedPostId(post._id);
  }, []);

  const handlePress = useCallback((post: Post) => {
    router.push(`/post/${post._id}`);
  }, [router]);

  const closeComments = useCallback(() => {
    setSelectedPostId(null);
  }, []);

  const closeShare = useCallback(() => {
    setSharePost(null);
  }, []);

  if (isLoading) {
    return (
      <View className="p-12 items-center">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="text-gray-400 mt-4">Đang tải bài viết...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="p-12 items-center">
        <View className="w-16 h-16 bg-red-100 rounded-full items-center justify-center mb-4">
          <Feather name="alert-circle" size={32} color="#ef4444" />
        </View>
        <Text className="text-gray-700 font-medium mb-2">Không thể tải bài viết</Text>
        <TouchableOpacity
          className="bg-blue-500 px-6 py-2 rounded-full"
          onPress={() => refetch()}
        >
          <Text className="text-white font-semibold">Thử lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (posts.length === 0) {
    return (
      <View className="p-12 items-center">
        <View className="w-16 h-16 bg-gray-100 rounded-full items-center justify-center mb-4">
          <Feather name="edit-3" size={28} color="#9ca3af" />
        </View>
         <Text className="text-gray-700 font-medium">Chưa có bài viết nào</Text>
        <Text className="text-gray-400 text-sm mt-1">Hãy là người đầu tiên đăng bài!</Text>
      </View>
    );
  }

  // 🔥 Deduplicate posts to prevent duplicate key error
  const uniquePosts = posts.filter(
    (post: Post, index: number, self: Post[]) =>
      index === self.findIndex((p) => p._id === post._id)
  );

  return (
    <>
      {uniquePosts.map((post: Post, index: number) => (
        <PostCard
          key={`${post._id}-${index}`}
          post={post}
          onLike={toggleLike}
          onDelete={deletePost}
          onFollow={handleFollow}
          onBookmark={toggleBookmark}
          onComment={handleComment}
          onPress={handlePress}
          onProfilePress={handleProfilePress}
          onShare={handleShare}
          currentUser={currentUser}
          isLiked={checkIsLiked(post.likes, currentUser)}
          isBookmarked={isBookmarked(post._id)}
          isFollowing={isFollowing(post.user._id, currentUser?.following || [])}
          isOnline={isUserOnline(post?.user?.clerkId || "")}
        />
      ))}

      <CommentsModal
        selectedPost={selectedPost}
        onClose={closeComments}
      />

      <SharePostModal
        visible={sharePost !== null}
        post={sharePost}
        onClose={closeShare}
      />
    </>
  );
};

// ⚡ PERFORMANCE: Wrap with React.memo
export default memo(PostsList);


