import { useComments } from "@/hooks/useComments";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Post, Comment } from "@/types";
import { formatDate } from "@/utils/formatters";
import { Ionicons, Feather } from "@expo/vector-icons";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface CommentsModalProps {
  selectedPost: Post | null;
  onClose: () => void;
}

const CommentsModal = ({ selectedPost, onClose }: CommentsModalProps) => {
  const { commentText, setCommentText, createComment, isCreatingComment, comments: hookComments, isLoadingComments: hookLoading } =
    useComments(selectedPost?._id);
  const { currentUser } = useCurrentUser();
  const insets = useSafeAreaInsets();

  // Use comments from hook directly (no duplicate query needed)
  const comments = hookComments || [];
  const isLoadingComments = hookLoading;

  const handleClose = () => {
    onClose();
    setCommentText("");
  };

  return (
    <Modal
      visible={!!selectedPost}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 bg-gray-50"
      >
        {/* Modern Header */}
        <View className="bg-white px-4 py-3 flex-row items-center justify-between" style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 2,
        }}>
          <TouchableOpacity 
            onPress={handleClose}
            className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center"
          >
            <Ionicons name="close" size={22} color="#6b7280" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-900">Bình luận</Text>
          <View className="w-10" />
        </View>

        {selectedPost && (
          <>
            <ScrollView 
              className="flex-1"
              contentContainerStyle={{ paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
            >
              {/* Original Post Card */}
              <View className="mx-3 mt-3 bg-white rounded-2xl p-4" style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 10,
                elevation: 2,
              }}>
                <View className="flex-row">
                  <View className="relative">
                    <Image
                      source={{ 
                        uri: selectedPost.user?.profilePicture || "https://placehold.co/100x100?text=User" 
                      }}
                      className="w-11 h-11 rounded-full"
                      style={{ borderWidth: 2, borderColor: "#e0e7ff" }}
                    />
                    <View className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white" />
                  </View>

                  <View className="flex-1 ml-3">
                    <View className="flex-row items-center mb-1">
                      <Text className="font-bold text-gray-900">
                        {selectedPost.user?.firstName} {selectedPost.user?.lastName}
                      </Text>
                      <View className="ml-1 bg-blue-500 rounded-full p-0.5">
                        <Feather name="check" size={8} color="white" />
                      </View>
                    </View>
                    <Text className="text-gray-400 text-xs mb-2">
                      @{selectedPost.user?.username} · {formatDate(selectedPost.createdAt)}
                    </Text>

                    {selectedPost.content && (
                      <Text className="text-gray-800 text-[15px] leading-6">
                        {selectedPost.content}
                      </Text>
                    )}
                  </View>
                </View>

                {selectedPost.image && (
                  <Image
                    source={{ uri: selectedPost.image }}
                    className="w-full h-48 rounded-xl mt-3"
                    resizeMode="cover"
                  />
                )}

                {/* Post Stats */}
                <View className="flex-row mt-3 pt-3 border-t border-gray-100">
                  <View className="flex-row items-center mr-6">
                    <Ionicons name="heart" size={16} color="#ef4444" />
                    <Text className="text-gray-500 text-sm ml-1">{selectedPost.likes?.length || 0}</Text>
                  </View>
                  <View className="flex-row items-center">
                    <Ionicons name="chatbubble-outline" size={16} color="#6b7280" />
                    <Text className="text-gray-500 text-sm ml-1">{comments.length}</Text>
                  </View>
                </View>
              </View>

              {/* Comments Section Header */}
              <View className="px-4 py-3 mt-2">
                <Text className="text-gray-500 text-sm font-medium">
                  {comments.length > 0 ? `${comments.length} bình luận` : "Chưa có bình luận"}
                </Text>
              </View>

              {/* Loading */}
              {isLoadingComments && (
                <View className="p-8 items-center">
                  <ActivityIndicator size="large" color="#3b82f6" />
                </View>
              )}

              {/* Comments List */}
              {comments.map((comment: Comment) => (
                <View
                  key={comment._id}
                  className="mx-3 mb-2 bg-white rounded-2xl p-4"
                  style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.04,
                    shadowRadius: 6,
                    elevation: 1,
                  }}
                >
                  <View className="flex-row">
                    <Image
                      source={{ 
                        uri: comment.user?.profilePicture || "https://placehold.co/100x100?text=User" 
                      }}
                      className="w-9 h-9 rounded-full"
                    />

                    <View className="flex-1 ml-3">
                      <View className="flex-row items-center mb-1">
                        <Text className="font-semibold text-gray-900 text-sm">
                          {comment.user?.firstName || ""} {comment.user?.lastName || ""}
                        </Text>
                        <Text className="text-gray-400 text-xs ml-2">
                          {formatDate(comment.createdAt)}
                        </Text>
                      </View>

                      <Text className="text-gray-700 text-[14px] leading-5">
                        {comment.content}
                      </Text>

                      {/* Comment Actions */}
                      <View className="flex-row mt-2">
                        <TouchableOpacity className="flex-row items-center mr-4">
                          <Ionicons name="heart-outline" size={14} color="#9ca3af" />
                          <Text className="text-gray-400 text-xs ml-1">Thích</Text>
                        </TouchableOpacity>
                        <TouchableOpacity className="flex-row items-center">
                          <Ionicons name="arrow-undo-outline" size={14} color="#9ca3af" />
                          <Text className="text-gray-400 text-xs ml-1">Trả lời</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              ))}

              {/* Empty State */}
              {!isLoadingComments && comments.length === 0 && (
                <View className="items-center py-12">
                  <View className="w-16 h-16 bg-gray-100 rounded-full items-center justify-center mb-3">
                    <Ionicons name="chatbubbles-outline" size={28} color="#9ca3af" />
                  </View>
                  <Text className="text-gray-500">Hãy là người đầu tiên bình luận!</Text>
                </View>
              )}
            </ScrollView>

            {/* Comment Input - Fixed at bottom */}
            <View 
              className="bg-white px-4 py-3 border-t border-gray-100"
              style={{ paddingBottom: Math.max(insets.bottom, 12) }}
            >
              <View className="flex-row items-end">
                <Image
                  source={{ 
                    uri: currentUser?.profilePicture || "https://placehold.co/100x100?text=User" 
                  }}
                  className="w-9 h-9 rounded-full mr-3"
                />

                <View className="flex-1 bg-gray-100 rounded-2xl px-4 py-2 flex-row items-end">
                  <TextInput
                    className="flex-1 text-base text-gray-800 max-h-24"
                    placeholder="Viết bình luận..."
                    placeholderTextColor="#9ca3af"
                    value={commentText}
                    onChangeText={setCommentText}
                    multiline
                  />
                </View>

                <TouchableOpacity
                  className={`ml-2 w-9 h-9 rounded-full items-center justify-center ${
                    commentText.trim() ? "bg-blue-500" : "bg-gray-200"
                  }`}
                  onPress={() => createComment(selectedPost._id)}
                  disabled={isCreatingComment || !commentText.trim()}
                >
                  {isCreatingComment ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Ionicons 
                      name="send" 
                      size={18} 
                      color={commentText.trim() ? "white" : "#9ca3af"} 
                    />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default CommentsModal;
