import { useCurrentUser } from "@/hooks/useCurrentUser";
import { usePosts } from "@/hooks/usePosts";
import { useFollow } from "@/hooks/useFollow";
import { useBookmarks } from "@/hooks/useBookmarks";
import { Post } from "@/types";
import { View, Text, ActivityIndicator, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import PostCard from "./PostCard";
import { useState } from "react";
import CommentsModal from "./CommentsModal";

const PostsList = ({ username }: { username?: string }) => {
  const { currentUser } = useCurrentUser();
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
  const { toggleFollow } = useFollow();
  const { toggleBookmark, isBookmarked } = useBookmarks();
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  const selectedPost = selectedPostId
    ? posts.find((p: Post) => p._id === selectedPostId)
    : null;

  // Handle follow with refetch
  const handleFollow = async (userId: string) => {
    await toggleFollow(userId);
    await onUserFollowToggle(); // Refresh posts to update isFollowing
    refetch();
  };

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

  return (
    <>
      {posts.map((post: Post) => (
        <PostCard
          key={post._id}
          post={post}
          onLike={toggleLike}
          onDelete={deletePost}
          onFollow={handleFollow}
          onBookmark={toggleBookmark}
          onComment={(post: Post) => setSelectedPostId(post._id)}
          currentUser={currentUser}
          isLiked={checkIsLiked(post.likes, currentUser)}
          isBookmarked={isBookmarked(post._id)}
        />
      ))}

      <CommentsModal
        selectedPost={selectedPost}
        onClose={() => setSelectedPostId(null)}
      />
    </>
  );
};

export default PostsList;
