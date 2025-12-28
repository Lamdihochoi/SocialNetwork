import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient, userApi, messageApi } from "@/utils/api";
import { Post } from "@/types";
import { useSocket } from "@/hooks/useSocket";

interface SharePostModalProps {
  visible: boolean;
  onClose: () => void;
  post: Post | null;
}

const SharePostModal = ({ visible, onClose, post }: SharePostModalProps) => {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const { emitSendMessage, isConnected } = useSocket();
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);

  // Fetch friends (mutual follows)
  const { data: friendsData, isLoading } = useQuery({
    queryKey: ["friends"],
    queryFn: () => userApi.getMutualFollows(api),
    select: (res) => res.data.friends || [],
    enabled: visible,
  });

  const friends = friendsData || [];

  // Toggle friend selection
  const toggleFriend = (friendId: string) => {
    setSelectedFriends((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId]
    );
  };

  // Share post to selected friends
  const handleShare = async () => {
    if (selectedFriends.length === 0 || !post) return;

    setIsSending(true);

    try {
      // Create share message content with special format for parsing
      const shareContent = `📤 Đã chia sẻ bài viết:\n\n"${post.content?.substring(0, 100) || ""}${post.content && post.content.length > 100 ? "..." : ""}"\n\n👤 ${post.user?.firstName} ${post.user?.lastName}\n🔗 [Xem bài viết](/post/${post._id})`;

      // Send to each selected friend via socket (instant) or HTTP (fallback)
      for (const friendId of selectedFriends) {
        const tempId = `temp-share-${Date.now()}-${friendId}`;
        
        if (isConnected) {
          emitSendMessage({
            receiverId: friendId,
            content: shareContent,
            tempId,
          });
        } else {
          // Fallback to HTTP
          await messageApi.sendMessage(api, friendId, shareContent);
        }
      }

      // Invalidate conversations to show new messages
      queryClient.invalidateQueries({ queryKey: ["conversations"] });

      // 🎉 Show success notification
      const friendCount = selectedFriends.length;
      Alert.alert(
        "✅ Chia sẻ thành công!",
        `Đã gửi bài viết tới ${friendCount} bạn bè.`,
        [{ text: "OK", style: "default" }]
      );

      // Reset and close
      setSelectedFriends([]);
      onClose();
    } catch (error) {
      console.error("Error sharing post:", error);
      Alert.alert("❌ Lỗi", "Không thể chia sẻ bài viết. Vui lòng thử lại.");
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    setSelectedFriends([]);
    onClose();
  };

  if (!post) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-3xl max-h-[80%]">
          {/* Header */}
          <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-100">
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color="#374151" />
            </TouchableOpacity>
            <Text className="text-lg font-bold text-gray-800">
              Chia sẻ bài viết
            </Text>
            <TouchableOpacity
              onPress={handleShare}
              disabled={selectedFriends.length === 0 || isSending}
              className={`px-4 py-2 rounded-full ${
                selectedFriends.length > 0 ? "bg-blue-500" : "bg-gray-200"
              }`}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text
                  className={`font-semibold ${
                    selectedFriends.length > 0 ? "text-white" : "text-gray-400"
                  }`}
                >
                  Gửi ({selectedFriends.length})
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Post Preview */}
          <View className="px-4 py-3 bg-gray-50 mx-4 mt-3 rounded-xl">
            <View className="flex-row items-center mb-2">
              <Image
                source={{
                  uri: post.user?.profilePicture || "https://placehold.co/40",
                }}
                className="w-8 h-8 rounded-full mr-2"
              />
              <Text className="font-medium text-gray-800">
                {post.user?.firstName} {post.user?.lastName}
              </Text>
            </View>
            <Text className="text-gray-600" numberOfLines={2}>
              {post.content}
            </Text>
            {post.image && (
              <Image
                source={{ uri: post.image }}
                className="w-full h-24 rounded-lg mt-2"
                resizeMode="cover"
              />
            )}
          </View>

          {/* Friends List */}
          <Text className="px-4 py-3 text-gray-500 font-medium">
            Chọn bạn bè để chia sẻ
          </Text>

          {isLoading ? (
            <View className="py-8 items-center">
              <ActivityIndicator size="large" color="#3b82f6" />
            </View>
          ) : friends.length === 0 ? (
            <View className="py-8 items-center">
              <Ionicons name="people-outline" size={48} color="#9ca3af" />
              <Text className="text-gray-400 mt-2">Chưa có bạn bè</Text>
            </View>
          ) : (
            <FlatList
              data={friends}
              keyExtractor={(item: any) => item._id}
              className="px-4"
              style={{ maxHeight: 300 }}
              renderItem={({ item }) => {
                const isSelected = selectedFriends.includes(item._id);
                return (
                  <TouchableOpacity
                    onPress={() => toggleFriend(item._id)}
                    className={`flex-row items-center py-3 px-3 rounded-xl mb-2 ${
                      isSelected ? "bg-blue-50 border border-blue-200" : "bg-gray-50"
                    }`}
                  >
                    <Image
                      source={{
                        uri: item.profilePicture || "https://placehold.co/40",
                      }}
                      className="w-12 h-12 rounded-full mr-3"
                    />
                    <View className="flex-1">
                      <Text className="font-medium text-gray-800">
                        {item.firstName} {item.lastName}
                      </Text>
                      <Text className="text-gray-500 text-sm">
                        @{item.username}
                      </Text>
                    </View>
                    <View
                      className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                        isSelected
                          ? "bg-blue-500 border-blue-500"
                          : "border-gray-300"
                      }`}
                    >
                      {isSelected && (
                        <Ionicons name="checkmark" size={14} color="white" />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          )}

          {/* Safe Area Bottom */}
          <View className="h-8" />
        </View>
      </View>
    </Modal>
  );
};

export default SharePostModal;
