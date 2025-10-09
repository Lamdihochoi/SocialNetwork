import { Post, User } from "@/types";
import { formatDate, formatNumber } from "@/utils/formatters";
import { AntDesign, Feather } from "@expo/vector-icons";
import { View, Text, Alert, Image, TouchableOpacity } from "react-native";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { usePosts } from "@/hooks/usePosts";

interface PostCardProps {
  post: Post;
  onLike: (postId: string) => void;
  onDelete: (postId: string) => void;
  onComment: (post: Post) => void;
  isLiked?: boolean;
  currentUser: User;
}

const PostCard = ({
  currentUser,
  onDelete,
  onLike,
  post,
  isLiked,
  onComment,
}: PostCardProps) => {
  const { toggleFollow, currentUser: updatedUser } = useCurrentUser();
  const { onUserFollowToggle } = usePosts(); // ✅ thêm để đồng bộ post
  if (!post?.user || !updatedUser) return null;

  const isOwnPost = post.user._id === updatedUser._id;
  const isFollowing = updatedUser.following?.includes(post.user._id);

  const handleFollow = async () => {
    try {
      await toggleFollow(post.user._id);
      await onUserFollowToggle(); // ✅ refresh toàn bộ bài post
    } catch (error: any) {
      console.error("Follow error:", error.response?.data || error.message);
    }
  };

  const handleDelete = () => {
    Alert.alert("Delete Post", "Are you sure you want to delete this post?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => onDelete(post._id),
      },
    ]);
  };

  return (
    <View className="border-b border-gray-100 bg-white">
      <View className="flex-row p-4">
        <Image
          source={{ uri: post.user.profilePicture || "" }}
          className="w-12 h-12 rounded-full mr-3"
        />

        <View className="flex-1">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-1">
            <View className="flex-row items-center flex-wrap">
              <Text className="font-bold text-gray-900 mr-1">
                {post.user.firstName} {post.user.lastName}
              </Text>
              <Text className="text-gray-500 ml-1">
                @{post.user.username} · {formatDate(post.createdAt)}
              </Text>
            </View>

            {/* 🟢 Follow Button */}
            {!isOwnPost && (
              <TouchableOpacity
                onPress={handleFollow}
                className={`px-3 py-1 rounded-full border ${
                  isFollowing
                    ? "border-gray-300 bg-gray-100"
                    : "border-blue-500"
                }`}
              >
                <Text
                  className={`text-sm font-semibold ${
                    isFollowing ? "text-gray-700" : "text-blue-500"
                  }`}
                >
                  {isFollowing ? "Following" : "Follow"}
                </Text>
              </TouchableOpacity>
            )}

            {isOwnPost && (
              <TouchableOpacity onPress={handleDelete}>
                <Feather name="trash" size={20} color="#657786" />
              </TouchableOpacity>
            )}
          </View>

          {/* Post content */}
          {post.content && (
            <Text className="text-gray-900 text-base leading-5 mb-3">
              {post.content}
            </Text>
          )}

          {post.image && (
            <Image
              source={{ uri: post.image }}
              className="w-full h-48 rounded-2xl mb-3"
              resizeMode="cover"
            />
          )}

          {/* Action buttons */}
          <View className="flex-row justify-between max-w-xs">
            <TouchableOpacity
              className="flex-row items-center"
              onPress={() => onComment(post)}
            >
              <Feather name="message-circle" size={18} color="#657786" />
              <Text className="text-gray-500 text-sm ml-2">
                {formatNumber(post.comments?.length || 0)}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity className="flex-row items-center">
              <Feather name="repeat" size={18} color="#657786" />
              <Text className="text-gray-500 text-sm ml-2">0</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center"
              onPress={() => onLike(post._id)}
            >
              {isLiked ? (
                <AntDesign name="heart" size={18} color="#E0245E" />
              ) : (
                <Feather name="heart" size={18} color="#657786" />
              )}

              <Text
                className={`text-sm ml-2 ${
                  isLiked ? "text-red-500" : "text-gray-500"
                }`}
              >
                {formatNumber(post.likes?.length || 0)}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity>
              <Feather name="share" size={18} color="#657786" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

export default PostCard;
