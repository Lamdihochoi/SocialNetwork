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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "@/utils/api";
import PostCard from "@/components/PostCard";
import { useState } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";

const PostDetailScreen = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const api = useApiClient();
  const queryClient = useQueryClient();
  const { user: currentUser } = useCurrentUser();
  const [commentContent, setCommentContent] = useState("");

  // Fetch Post Details
  const {
    data: post,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["post", id],
    queryFn: () => api.get(`/posts/${id}`).then((res) => res.data),
    enabled: !!id,
  });

  // Create Comment Mutation
  const createCommentMutation = useMutation({
    mutationFn: (content: string) =>
      api.post(`/posts/${id}/comments`, { content }),
    onSuccess: () => {
      setCommentContent("");
      queryClient.invalidateQueries({ queryKey: ["post", id] });
    },
  });

  const handleSendComment = () => {
    if (!commentContent.trim()) return;
    createCommentMutation.mutate(commentContent);
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#1DA1F2" />
      </View>
    );
  }

  if (error || !post) {
    return (
      <View className="flex-1 bg-white items-center justify-center p-4">
        <Text className="text-gray-500 mb-4">Không tìm thấy bài viết</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="bg-blue-500 px-4 py-2 rounded-full"
        >
          <Text className="text-white font-bold">Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
           <Feather name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text className="text-lg font-bold">Bài viết</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {/* Main Post */}
          <PostCard post={post} />

          {/* Comments Section */}
          <View className="border-t border-gray-100">
            <Text className="px-4 py-3 font-bold text-gray-900 text-lg">
              Bình luận
            </Text>
            
            {post.comments && post.comments.length > 0 ? (
              post.comments.map((comment: any) => (
                <View key={comment._id} className="px-4 py-3 border-b border-gray-50 flex-row">
                  <Image
                    source={{ uri: comment.user.profilePicture }}
                    className="w-8 h-8 rounded-full mr-3"
                  />
                  <View className="flex-1">
                    <View className="flex-row items-center mb-1">
                      <Text className="font-bold text-gray-900 mr-2">
                        {comment.user.firstName} {comment.user.lastName}
                      </Text>
                      <Text className="text-xs text-gray-500">
                        @{comment.user.username}
                      </Text>
                    </View>
                    <Text className="text-gray-800">{comment.content}</Text>
                  </View>
                </View>
              ))
            ) : (
              <View className="p-8 items-center">
                <Text className="text-gray-400">Chưa có bình luận nào</Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Comment Input */}
        <View className="px-4 py-3 border-t border-gray-100 flex-row items-center bg-white pb-6">
          <Image
             source={{ uri: currentUser?.profilePicture }}
             className="w-8 h-8 rounded-full mr-3"
          />
          <View className="flex-1 bg-gray-100 rounded-full px-4 py-2 flex-row items-center">
            <TextInput
              placeholder="Viết bình luận..."
              className="flex-1 text-gray-900"
              value={commentContent}
              onChangeText={setCommentContent}
              multiline
            />
          </View>
          {commentContent.trim().length > 0 && (
            <TouchableOpacity 
              onPress={handleSendComment}
              disabled={createCommentMutation.isPending}
              className="ml-3"
            >
              {createCommentMutation.isPending ? (
                 <ActivityIndicator size="small" color="#1DA1F2" />
              ) : (
                 <Feather name="send" size={24} color="#1DA1F2" />
              )}
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default PostDetailScreen;
