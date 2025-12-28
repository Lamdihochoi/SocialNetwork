import { useLocalSearchParams, useRouter } from "expo-router";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  StatusBar,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/utils/api";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { usePosts } from "@/hooks/usePosts";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useComments } from "@/hooks/useComments";
import { formatDate } from "@/utils/formatters";

const PostDetailScreen = () => {
  const { id } = useLocalSearchParams();
  const postId = typeof id === "string" ? id : id?.[0];
  const router = useRouter();
  const api = useApiClient();
  const insets = useSafeAreaInsets();
  const { currentUser } = useCurrentUser();
  const { toggleLike, checkIsLiked } = usePosts();
  const { toggleBookmark, isBookmarked } = useBookmarks();
  
  // 🔥 Use shared useComments hook for consistency with CommentsModal
  const {
    commentText,
    setCommentText,
    createComment,
    isCreatingComment,
    comments,
    isLoadingComments,
  } = useComments(postId);

  // Fetch Post Details
  const {
    data: post,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["post", postId],
    queryFn: () => api.get(`/posts/${postId}`).then((res) => res.data.post),
    enabled: !!postId,
  });

  const handleSendComment = () => {
    if (!commentText.trim() || !postId) return;
    createComment(postId);
  };

  const isLiked = post ? checkIsLiked(post.likes || [], currentUser) : false;
  const bookmarked = post ? isBookmarked(post._id) : false;

  if (isLoading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="text-gray-400 mt-3">Đang tải bài viết...</Text>
      </View>
    );
  }

  if (error || !post) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center p-6">
        <View className="w-20 h-20 bg-gray-100 rounded-full items-center justify-center mb-4">
          <Feather name="file-text" size={36} color="#9ca3af" />
        </View>
        <Text className="text-gray-700 font-semibold text-lg mb-2">Không tìm thấy bài viết</Text>
        <Text className="text-gray-400 text-center mb-6">Bài viết có thể đã bị xóa hoặc không tồn tại</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="bg-blue-500 px-6 py-3 rounded-full"
        >
          <Text className="text-white font-bold">Quay lại</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View className="bg-white px-4 py-3 flex-row items-center border-b border-gray-100" style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
      }}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center mr-3"
        >
          <Feather name="arrow-left" size={20} color="#374151" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900 flex-1">Bài viết</Text>
        <TouchableOpacity className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center">
          <Feather name="more-horizontal" size={20} color="#374151" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <ScrollView 
          className="flex-1" 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
        >
          {/* Post Content Card */}
          <View className="bg-white mx-3 mt-3 rounded-2xl overflow-hidden" style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 8,
            elevation: 3,
          }}>
            {/* Author Info */}
            <View className="flex-row items-center p-4">
              <TouchableOpacity onPress={() => post.user?._id && router.push(`/user/${post.user._id}`)}>
                <Image
                  source={{ uri: post.user?.profilePicture || "https://placehold.co/100x100?text=User" }}
                  className="w-12 h-12 rounded-full"
                />
              </TouchableOpacity>
              <View className="flex-1 ml-3">
                <TouchableOpacity onPress={() => post.user?._id && router.push(`/user/${post.user._id}`)}>
                  <Text className="font-bold text-gray-900 text-base">
                    {post.user?.firstName || "Unknown"} {post.user?.lastName || "User"}
                  </Text>
                  <Text className="text-gray-500 text-sm">@{post.user?.username || "user"}</Text>
                </TouchableOpacity>
              </View>
              <Text className="text-gray-400 text-xs">{formatDate(post.createdAt)}</Text>
            </View>

            {/* Post Content */}
            <View className="px-4 pb-3">
              <Text className="text-gray-900 text-[16px] leading-6">{post.content}</Text>
            </View>

            {/* Post Image */}
            {post.image && (
              <Image
                source={{ uri: post.image }}
                className="w-full h-72"
                resizeMode="cover"
              />
            )}

            {/* Stats */}
            <View className="flex-row items-center px-4 py-3 border-t border-gray-100">
              <View className="flex-row items-center mr-6">
                <Ionicons name="heart" size={16} color="#ef4444" />
                <Text className="text-gray-600 text-sm ml-1">{post.likes?.length || 0} lượt thích</Text>
              </View>
              <View className="flex-row items-center">
                <Ionicons name="chatbubble" size={14} color="#6b7280" />
                <Text className="text-gray-600 text-sm ml-1">{post.comments?.length || 0} bình luận</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View className="flex-row items-center border-t border-gray-100 py-2 px-2">
              <TouchableOpacity 
                className="flex-1 flex-row items-center justify-center py-2"
                onPress={() => toggleLike(post._id)}
              >
                <Ionicons 
                  name={isLiked ? "heart" : "heart-outline"} 
                  size={22} 
                  color={isLiked ? "#ef4444" : "#6b7280"} 
                />
                <Text className={`ml-2 font-medium ${isLiked ? "text-red-500" : "text-gray-600"}`}>
                  Thích
                </Text>
              </TouchableOpacity>

              <View className="w-px h-6 bg-gray-200" />

              <TouchableOpacity className="flex-1 flex-row items-center justify-center py-2">
                <Ionicons name="chatbubble-outline" size={20} color="#6b7280" />
                <Text className="ml-2 text-gray-600 font-medium">Bình luận</Text>
              </TouchableOpacity>

              <View className="w-px h-6 bg-gray-200" />

              <TouchableOpacity 
                className="flex-1 flex-row items-center justify-center py-2"
                onPress={() => toggleBookmark(post._id)}
              >
                <Ionicons 
                  name={bookmarked ? "bookmark" : "bookmark-outline"} 
                  size={20} 
                  color={bookmarked ? "#3b82f6" : "#6b7280"} 
                />
                <Text className={`ml-2 font-medium ${bookmarked ? "text-blue-500" : "text-gray-600"}`}>
                  Lưu
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Comments Section */}
          <View className="bg-white mx-3 mt-3 rounded-2xl overflow-hidden" style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 6,
            elevation: 2,
          }}>
            <View className="flex-row items-center px-4 py-3 border-b border-gray-100">
              <Ionicons name="chatbubbles" size={20} color="#3b82f6" />
              <Text className="font-bold text-gray-900 text-base ml-2">
                Bình luận ({comments.length})
              </Text>
            </View>
            
            {/* Loading Comments */}
            {isLoadingComments && (
              <View className="p-6 items-center">
                <ActivityIndicator size="small" color="#3b82f6" />
              </View>
            )}
            
            {/* 🔥 Use comments from useComments hook for consistency */}
            {!isLoadingComments && comments.length > 0 ? (
              comments.map((comment: any, index: number) => (
                <View 
                  key={comment._id || `comment-${index}`} 
                  className={`px-4 py-3 flex-row ${index < comments.length - 1 ? "border-b border-gray-50" : ""}`}
                >
                  <Image
                    source={{ uri: comment.user?.profilePicture || "https://placehold.co/100x100?text=User" }}
                    className="w-10 h-10 rounded-full"
                  />
                  <View className="flex-1 ml-3">
                    <View className="bg-gray-100 rounded-2xl px-4 py-3">
                      <View className="flex-row items-center mb-1">
                        <Text className="font-bold text-gray-900 text-sm">
                          {comment.user?.firstName} {comment.user?.lastName}
                        </Text>
                        <Text className="text-gray-400 text-xs ml-2">
                          @{comment.user?.username}
                        </Text>
                      </View>
                      <Text className="text-gray-800 text-[15px]">{comment.content}</Text>
                    </View>
                    <View className="flex-row items-center mt-1.5 ml-2">
                      <Text className="text-gray-400 text-xs">{formatDate(comment.createdAt)}</Text>
                      <TouchableOpacity className="ml-4">
                        <Text className="text-gray-500 text-xs font-medium">Thích</Text>
                      </TouchableOpacity>
                      <TouchableOpacity className="ml-4">
                        <Text className="text-gray-500 text-xs font-medium">Trả lời</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))
            ) : !isLoadingComments && (
              <View className="p-8 items-center">
                <View className="w-16 h-16 bg-gray-100 rounded-full items-center justify-center mb-3">
                  <Ionicons name="chatbubble-outline" size={28} color="#9ca3af" />
                </View>
                <Text className="text-gray-500 font-medium">Chưa có bình luận nào</Text>
                <Text className="text-gray-400 text-sm mt-1">Hãy là người đầu tiên bình luận!</Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Comment Input */}
        <View 
          className="bg-white border-t border-gray-100 px-4 py-3 flex-row items-center"
          style={{ paddingBottom: insets.bottom + 12 }}
        >
          <Image
            source={{ uri: currentUser?.profilePicture || "https://placehold.co/100x100?text=User" }}
            className="w-10 h-10 rounded-full"
          />
          <View className="flex-1 bg-gray-100 rounded-full px-4 py-2.5 flex-row items-center ml-3">
            <TextInput
              placeholder="Viết bình luận..."
              placeholderTextColor="#9ca3af"
              className="flex-1 text-gray-900 text-[15px]"
              value={commentText}
              onChangeText={setCommentText}
              multiline
            />
          </View>
          {commentText.trim().length > 0 && (
            <TouchableOpacity 
              onPress={handleSendComment}
              disabled={isCreatingComment}
              className="ml-3 w-10 h-10 bg-blue-500 rounded-full items-center justify-center"
            >
              {isCreatingComment ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name="send" size={18} color="white" />
              )}
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default PostDetailScreen;
