import { Post, User } from "@/types";
import { formatDate, formatNumber } from "@/utils/formatters";
import { AntDesign, Feather, Ionicons } from "@expo/vector-icons";
import { View, Text, Alert, Image, TouchableOpacity, Modal } from "react-native";
import { useState } from "react";
// Use legacy API for downloadAsync (Expo SDK 54+)
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

interface PostCardProps {
  post: Post;
  onLike: (postId: string) => void;
  onDelete: (postId: string) => void;
  onComment: (post: Post) => void;
  onFollow?: (userId: string) => void;
  onBookmark?: (postId: string) => void;
  isLiked?: boolean;
  isBookmarked?: boolean;
  currentUser: User;
}

const PostCard = ({
  currentUser,
  onDelete,
  onLike,
  onFollow,
  onBookmark,
  post,
  isLiked,
  isBookmarked,
  onComment,
}: PostCardProps) => {
  const isOwnPost = post?.user?._id === currentUser?._id;
  // Check if current user is following this post's author
  const isFollowing = currentUser?.following?.some(
    (f: any) => (typeof f === "string" ? f : f._id) === post?.user?._id
  ) || false;
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleDelete = () => {
    Alert.alert("Xóa bài viết", "Bạn có chắc chắn muốn xóa bài viết này không?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: () => onDelete(post._id),
      },
    ]);
  };

  const handleFollow = () => {
    if (onFollow && post?.user?._id) {
      onFollow(post.user._id);
    }
  };

  // Save/share image using Share sheet (Expo Go compatible)
  const handleSaveImage = async () => {
    if (!post.image) return;

    try {
      setIsSaving(true);
      
      // Download image to cache
      const filename = `social_${Date.now()}.jpg`;
      const cacheDir = FileSystem.cacheDirectory || "";
      const fileUri = cacheDir + filename;
      
      const downloadResult = await FileSystem.downloadAsync(post.image, fileUri);
      
      if (downloadResult.status === 200) {
        // Open share sheet - user can save from here
        await Sharing.shareAsync(downloadResult.uri, {
          mimeType: "image/jpeg",
          dialogTitle: "Lưu ảnh",
        });
        setImageModalVisible(false);
      } else {
        throw new Error("Download failed");
      }
    } catch (error) {
      console.error("Save image error:", error);
      Alert.alert("Lỗi", "Không thể lưu ảnh. Vui lòng thử lại.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <View className="mx-3 my-2 bg-white rounded-2xl overflow-hidden" style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
      }}>
        {/* Header */}
        <View className="flex-row items-center p-4 pb-3">
          <View className="relative">
            <Image
              source={{ uri: post?.user?.profilePicture || "https://placehold.co/100x100?text=User" }}
              className="w-12 h-12 rounded-full"
              style={{ borderWidth: 2, borderColor: "#f0f0f0" }}
            />
            <View className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white" />
          </View>
          
          <View className="flex-1 ml-3">
            <View className="flex-row items-center">
              <Text className="font-bold text-gray-900 text-base">
                {post?.user?.firstName} {post?.user?.lastName}
              </Text>
              <View className="ml-1 bg-blue-500 rounded-full p-0.5">
                <Feather name="check" size={10} color="white" />
              </View>
            </View>
            <Text className="text-gray-400 text-sm">
              @{post?.user?.username} · {formatDate(post.createdAt)}
            </Text>
          </View>

          {/* Follow Button or Delete Button */}
          {isOwnPost ? (
            <TouchableOpacity 
              onPress={handleDelete}
              className="w-9 h-9 bg-gray-50 rounded-full items-center justify-center"
            >
              <Feather name="more-horizontal" size={18} color="#9ca3af" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              onPress={handleFollow}
              className={`px-4 py-1.5 rounded-full ${
                isFollowing ? "bg-gray-100 border border-gray-200" : "bg-blue-500"
              }`}
            >
              <Text className={`text-sm font-semibold ${
                isFollowing ? "text-gray-700" : "text-white"
              }`}>
                {isFollowing ? "Đang theo" : "Theo dõi"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Content */}
        {post.content && (
          <View className="px-4 pb-3">
            <Text className="text-gray-800 text-[15px] leading-6">
              {post.content}
            </Text>
          </View>
        )}

        {/* Image - Tap to view/save */}
        {post.image && (
          <TouchableOpacity 
            className="mx-4 mb-3"
            onPress={() => setImageModalVisible(true)}
            activeOpacity={0.9}
          >
            <Image
              source={{ uri: post.image }}
              className="w-full h-56 rounded-xl"
              resizeMode="cover"
            />
            <View className="absolute bottom-2 right-2 bg-black/50 px-2 py-1 rounded-full flex-row items-center">
              <Ionicons name="expand-outline" size={14} color="white" />
              <Text className="text-white text-xs ml-1">Xem</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Actions */}
        <View className="flex-row justify-around items-center py-3 mx-4 border-t border-gray-100">
          <TouchableOpacity
            className="flex-row items-center py-2 px-4"
            onPress={() => onComment(post)}
          >
            <View className="w-8 h-8 bg-blue-50 rounded-full items-center justify-center mr-2">
              <Ionicons name="chatbubble-outline" size={16} color="#3b82f6" />
            </View>
            <Text className="text-gray-600 text-sm font-medium">
              {formatNumber(post.comments?.length || 0)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity className="flex-row items-center py-2 px-4">
            <View className="w-8 h-8 bg-green-50 rounded-full items-center justify-center mr-2">
              <Ionicons name="repeat-outline" size={16} color="#22c55e" />
            </View>
            <Text className="text-gray-600 text-sm font-medium">0</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-row items-center py-2 px-4"
            onPress={() => onLike(post._id)}
          >
            <View className={`w-8 h-8 rounded-full items-center justify-center mr-2 ${
              isLiked ? "bg-red-100" : "bg-pink-50"
            }`}>
              <Ionicons 
                name={isLiked ? "heart" : "heart-outline"} 
                size={16} 
                color={isLiked ? "#ef4444" : "#ec4899"} 
              />
            </View>
            <Text className={`text-sm font-medium ${isLiked ? "text-red-500" : "text-gray-600"}`}>
              {formatNumber(post.likes?.length || 0)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            className="py-2 px-2"
            onPress={() => onBookmark?.(post._id)}
          >
            <View className={`w-8 h-8 rounded-full items-center justify-center ${
              isBookmarked ? "bg-amber-100" : "bg-amber-50"
            }`}>
              <Ionicons 
                name={isBookmarked ? "bookmark" : "bookmark-outline"} 
                size={16} 
                color={isBookmarked ? "#f59e0b" : "#d97706"} 
              />
            </View>
          </TouchableOpacity>

          <TouchableOpacity className="py-2 px-2">
            <View className="w-8 h-8 bg-purple-50 rounded-full items-center justify-center">
              <Ionicons name="share-social-outline" size={16} color="#a855f7" />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Image View Modal */}
      <Modal
        visible={imageModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setImageModalVisible(false)}
      >
        <View className="flex-1 bg-black/95 justify-center">
          {/* Close Button */}
          <TouchableOpacity
            className="absolute top-12 left-4 z-10 w-10 h-10 bg-white/10 rounded-full items-center justify-center"
            onPress={() => setImageModalVisible(false)}
          >
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>

          {/* Save Button */}
          <TouchableOpacity
            className="absolute top-12 right-4 z-10 flex-row items-center bg-white/10 px-4 py-2 rounded-full"
            onPress={handleSaveImage}
            disabled={isSaving}
          >
            <Ionicons name="download-outline" size={20} color="white" />
            <Text className="text-white ml-2 font-medium">
              {isSaving ? "Đang lưu..." : "Lưu ảnh"}
            </Text>
          </TouchableOpacity>

          {/* Full Image */}
          <Image
            source={{ uri: post.image }}
            className="w-full h-96"
            resizeMode="contain"
          />

          {/* Post Info */}
          <View className="absolute bottom-12 left-4 right-4">
            <View className="flex-row items-center mb-2">
              <Image
                source={{ uri: post?.user?.profilePicture || "https://placehold.co/100x100?text=User" }}
                className="w-8 h-8 rounded-full mr-2"
              />
              <Text className="text-white font-medium">
                {post?.user?.firstName} {post?.user?.lastName}
              </Text>
            </View>
            {post.content && (
              <Text className="text-white/80 text-sm" numberOfLines={2}>
                {post.content}
              </Text>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
};

export default PostCard;
