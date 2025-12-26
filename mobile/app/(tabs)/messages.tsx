import { Feather, Ionicons } from "@expo/vector-icons";
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  View,
  Text,
  Alert,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Modal,
  ActivityIndicator,
  Linking,
  Platform,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient, messageApi, userApi } from "@/utils/api";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useSocket } from "@/hooks/useSocket";
import { Conversation, Message, User } from "@/types";
import { formatDate } from "@/utils/formatters";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import ImageViewing from "react-native-image-viewing";
// Use legacy API for Expo SDK 54+ compatibility
import * as FileSystem from "expo-file-system/legacy";
// E2E Encryption
import { encryptMessage, decryptMessage } from "@/utils/encryption";

const MessagesScreen = () => {
  const insets = useSafeAreaInsets();
  const [searchText, setSearchText] = useState("");
  const [selectedOtherUserId, setSelectedOtherUserId] = useState<string | null>(
    null
  );
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<{
    uri: string;
    type: string;
    name: string;
  } | null>(null);
  const [isNewMessageModalOpen, setIsNewMessageModalOpen] = useState(false);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [imageViewerIndex, setImageViewerIndex] = useState(0);
  const messagesEndRef = useRef<ScrollView>(null);
  const api = useApiClient();
  const queryClient = useQueryClient();
  const { currentUser } = useCurrentUser();
  const { joinConversation, leaveConversation, onReceiveMessage, isConnected } =
    useSocket();

  // Fetch mutual follows for horizontal scroll (Friends to Message)
  // ⚠️ Lưu ý: Trong code của bạn đang gọi `messageApi.getFriends(api)`,
  // tôi giả định đây là alias cho `userApi.getMutualFollows(api)`.
  const { data: friendsData, isLoading: isLoadingFriends } = useQuery({
    queryKey: ["friends"],
    queryFn: () => userApi.getMutualFollows(api),
    select: (response) => response.data.friends, // ✅ Chỉnh thành friends
  });

  const friends = friendsData || [];

  // Fetch mutual follows for "New Message" modal
  const {
    data: mutualFollowsData,
    isLoading: isLoadingMutualFollows,
    refetch: refetchMutualFollows,
  } = useQuery({
    queryKey: ["mutualFollows"],
    queryFn: () => userApi.getMutualFollows(api),
    select: (response) => response.data.friends, // ✅ Chỉnh thành friends
    enabled: isNewMessageModalOpen, // Only fetch when modal is open
  });

  const mutualFollows = mutualFollowsData || [];

  // Fetch conversations list
  const {
    data: conversationsData,
    isLoading: isLoadingConversations,
    error: conversationsError,
  } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => messageApi.getConversations(api),
    select: (response) => response.data.conversations,
  });

  const conversations = conversationsData || [];

  // Fetch message history when a conversation is selected
  const {
    data: messageHistoryData,
    isLoading: isLoadingMessages,
    error: messagesError,
    refetch: refetchMessages,
  } = useQuery({
    queryKey: ["messageHistory", selectedOtherUserId],
    queryFn: () => messageApi.getMessageHistory(api, selectedOtherUserId!),

    enabled: !!selectedOtherUserId && isChatOpen,

    select: (response) => ({
      messages: response.data.messages || [],
      conversation: response.data.conversation || null,
    }),
  });

  const { messages = [], conversation } = messageHistoryData || {};

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: ({
      receiverId,
      content,
      file,
    }: {
      receiverId: string;
      content: string;
      file?: { uri: string; type: string; name: string };
    }) => messageApi.sendMessage(api, receiverId, content, file),
    
    // 🚀 OPTIMISTIC UPDATE: Update UI immediately before server response
    onMutate: async ({ receiverId, content, file }) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ["messageHistory", receiverId] });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData(["messageHistory", receiverId]);

      // Create optimistic message
      const optimisticMessage = {
        _id: "temp-" + Date.now(),
        sender: currentUser,
        receiver: { _id: receiverId },
        content: content,
        attachment: file ? { url: file.uri, type: file.type, fileName: file.name } : null,
        createdAt: new Date().toISOString(),
        isRead: false,
        pending: true, // Marker to show "Sending..." state if needed
      };

      // Optimistically update to the new value
      queryClient.setQueryData(["messageHistory", receiverId], (old: any) => {
        const oldMessages = old?.messages || [];
        return {
          ...old,
          messages: [...oldMessages, optimisticMessage],
        };
      });

      // Clear input immediately for smooth experience
      setNewMessage("");
      setSelectedFile(null);

      // Return a context object with the snapshotted value
      return { previousData };
    },

    onError: (err, newTodo, context: any) => {
      // Rollback to the previous value on error
      if (context?.previousData) {
        queryClient.setQueryData(["messageHistory", selectedOtherUserId], context.previousData);
      }
      Alert.alert(
        "Lỗi gửi tin nhắn",
        (err as any).response?.data?.error || "Không thể gửi tin nhắn"
      );
    },

    onSettled: () => {
      // Always refetch after error or success to ensure data sync
      queryClient.invalidateQueries({
        queryKey: ["messageHistory", selectedOtherUserId],
      });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["friends"] });
    },
  });

  // Listen for new messages via socket
  useEffect(() => {
    if (!conversation?._id || !isChatOpen) return;

    joinConversation(conversation._id);

    const cleanup = onReceiveMessage((data: any) => {
      // Check if the incoming message is relevant to the currently open chat
      if (
        data.conversationId === conversation._id ||
        (data.message?.sender?._id === selectedOtherUserId &&
          data.message?.receiver?._id === currentUser?._id)
      ) {
        queryClient.invalidateQueries({
          queryKey: ["messageHistory", selectedOtherUserId],
        });
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
      }
    });

    return () => {
      leaveConversation(conversation._id);
      cleanup();
    };
  }, [conversation?._id, isChatOpen, selectedOtherUserId, currentUser]);

  // ✅ HÀM MỞ CHAT: Dùng cho cả Conversations cũ và Friends mới
  const openConversation = async (otherUserId: string) => {
    setSelectedOtherUserId(otherUserId);
    setIsChatOpen(true);
  };

  const closeChatModal = () => {
    if (conversation?._id) {
      leaveConversation(conversation._id);
    }
    setIsChatOpen(false);
    setSelectedOtherUserId(null);
    setNewMessage("");
    setSelectedFile(null);
    // Refresh conversation list để xem tin nhắn mới có isRead chưa
    queryClient.invalidateQueries({ queryKey: ["conversations"] });
  };

  // Send message with encryption
  const sendMessage = useCallback(() => {
    if ((newMessage.trim() || selectedFile) && selectedOtherUserId) {
      // Encrypt message content before sending
      const encryptedContent = newMessage.trim() 
        ? encryptMessage(newMessage.trim()) 
        : "";
      
      sendMessageMutation.mutate({
        receiverId: selectedOtherUserId,
        content: encryptedContent,
        file: selectedFile || undefined,
      });
    }
  }, [newMessage, selectedFile, selectedOtherUserId, sendMessageMutation]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const fileName = asset.uri.split("/").pop() || "image.jpg";
      const fileType = `image/${fileName.split(".").pop() || "jpg"}`;
      setSelectedFile({
        uri: asset.uri,
        type: fileType,
        name: fileName,
      });
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "image/*",
        ], // Thêm image/* cho tiện
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setSelectedFile({
          uri: asset.uri,
          type: asset.mimeType || "application/octet-stream",
          name: asset.name || "document.file",
        });
      }
    } catch (error) {
      console.error("Error picking document:", error);
      Alert.alert("Error", "Failed to pick document");
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
  };

  // ✅ BẮT ĐẦU CUỘC HỘI THOẠI MỚI TỪ MODAL
  const handleStartNewConversation = (friendId: string) => {
    if (!friendId) {
      Alert.alert("Error", "Invalid user selected");
      return;
    }
    setIsNewMessageModalOpen(false);
    // Ensure friendId is a string
    const userIdString =
      typeof friendId === "string" ? friendId : String(friendId);
    openConversation(userIdString);
  };

  // ✅ XEM ẢNH TOÀN MÀN HÌNH
  const handleViewImage = (imageUrl: string) => {
    // Tìm tất cả ảnh trong cuộc hội thoại
    const imageMessages = messages.filter(
      (msg: Message) =>
        msg.attachment?.url && msg.attachment.type.startsWith("image")
    );

    const imageUrls = imageMessages.map((msg: Message) => ({
      uri: msg.attachment!.url,
    }));

    // Tìm index của ảnh được click
    const currentIndex = imageUrls.findIndex(
      (img: { uri: string }) => img.uri === imageUrl
    );
    setImageViewerIndex(currentIndex >= 0 ? currentIndex : 0);
    setImageViewerVisible(true);
  };

  // ✅ TẢI FILE (Ảnh hoặc Tài liệu) - Expo Go compatible with Share sheet
  const handleDownload = async (
    url: string,
    fileName: string,
    isImage: boolean
  ) => {
    try {
      // Download file to cache
      const fileUri = (FileSystem as any).cacheDirectory + fileName;
      const downloadResult = await FileSystem.downloadAsync(url, fileUri);

      if (downloadResult.status === 200) {
        // Check if sharing is available
        const Sharing = await import("expo-sharing");
        const isAvailable = await Sharing.isAvailableAsync();
        
        if (isAvailable) {
          await Sharing.shareAsync(downloadResult.uri, {
            mimeType: isImage ? "image/jpeg" : "application/octet-stream",
            dialogTitle: isImage ? "Lưu ảnh" : "Lưu tài liệu",
          });
        } else {
          Alert.alert("Lỗi", "Không thể chia sẻ file trên thiết bị này.");
        }
      } else {
        throw new Error("Download failed");
      }
    } catch (error: any) {
      console.error("Download error:", error);
      Alert.alert("Lỗi", "Không thể tải file. Vui lòng thử lại.");
    }
  };

  // ✅ MỞ FILE TÀI LIỆU (PDF, Word, etc.)
  const handleOpenDocument = (url: string) => {
    Linking.openURL(url).catch((err) => {
      console.error("Failed to open URL:", err);
      Alert.alert("Lỗi", "Không thể mở tệp tin.");
    });
  };

  // Tìm user để hiển thị (Xử lý cả 2 trường hợp)
  const otherUser =
    (conversation as any)?.otherUser ||
    conversations.find((c: any) => c.user._id === selectedOtherUserId)?.user;

  // Filter conversations based on search
  const filteredConversations = conversations.filter((conv: Conversation) => {
    if (!searchText.trim()) return true;
    const searchLower = searchText.toLowerCase();

    const username = conv.user?.username?.toLowerCase() || "";
    const firstName = conv.user?.firstName?.toLowerCase() || "";
    const lastName = conv.user?.lastName?.toLowerCase() || "";

    return (
      username.includes(searchLower) ||
      firstName.includes(searchLower) ||
      lastName.includes(searchLower)
    );
  });

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      {/* MESSENGER-STYLE HEADER */}
      <View className="bg-white px-4 py-3" style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
      }}>
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <View className="w-10 h-10 bg-gradient-to-br rounded-xl items-center justify-center" 
              style={{ backgroundColor: "#0084ff" }}>
              <Ionicons name="chatbubbles" size={22} color="white" />
            </View>
            <Text className="text-xl font-bold text-gray-900 ml-3">Đoạn chat</Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              setIsNewMessageModalOpen(true);
              refetchMutualFollows();
            }}
            className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center"
          >
            <Ionicons name="create-outline" size={22} color="#0084ff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View className="px-4 py-2 bg-white">
        <View className="flex-row items-center bg-gray-100 rounded-2xl px-4 py-2.5">
          <Ionicons name="search" size={18} color="#9ca3af" />
          <TextInput
            placeholder="Tìm kiếm"
            className="flex-1 ml-2 text-base text-gray-800"
            placeholderTextColor="#9ca3af"
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText("")}>
              <Ionicons name="close-circle" size={18} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Friends List (Mutual Follows) - Cuộn ngang */}
      {!isLoadingFriends && friends.length > 0 && (
        <View className="border-b border-gray-100">
          <View className="px-4 py-2">
            <Text className="text-sm font-semibold text-gray-700">
              Bạn bè
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="px-4 py-2"
          >
            {friends.map((friend: any) => {
              const hasConversation = conversations.some(
                (conv: Conversation) => conv.user._id === friend._id
              );

              return (
                <TouchableOpacity
                  key={friend._id}
                  className="items-center mr-4"
                  onPress={() => openConversation(friend._id)}
                >
                  <View className="relative">
                    <Image
                      source={{
                        uri:
                          friend.profilePicture ||
                          "https://placehold.co/100x100?text=User",
                      }}
                      className="w-16 h-16 rounded-full"
                    />
                    {/* Dấu chấm xanh nhỏ nếu đã có conversation */}
                    {hasConversation && (
                      <View className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
                    )}
                  </View>
                  <Text
                    className="text-xs text-gray-700 mt-1 text-center"
                    numberOfLines={1}
                    style={{ maxWidth: 64 }}
                  >
                    {friend.firstName}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* CONVERSATIONS LIST */}
      {isLoadingConversations ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0084ff" />
          <Text className="text-gray-400 mt-3">Đang tải...</Text>
        </View>
      ) : filteredConversations.length === 0 ? (
        <View className="flex-1 items-center justify-center p-8">
          <View className="w-20 h-20 bg-blue-50 rounded-full items-center justify-center mb-4">
            <Ionicons name="chatbubbles-outline" size={40} color="#0084ff" />
          </View>
          <Text className="text-gray-700 font-semibold text-lg mb-1">Chưa có đoạn chat</Text>
          <Text className="text-gray-400 text-center">Bắt đầu cuộc trò chuyện mới với bạn bè</Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 100 + insets.bottom }}
        >
          {filteredConversations.map((conversation: Conversation) => (
            <TouchableOpacity
              key={conversation._id}
              className="mx-3 mb-2 bg-white rounded-2xl p-3 flex-row items-center"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04,
                shadowRadius: 6,
                elevation: 1,
              }}
              onPress={() => openConversation(conversation.user._id)}
              activeOpacity={0.7}
            >
              <View className="relative">
                <Image
                  source={{
                    uri:
                      conversation.user.profilePicture ||
                      "https://placehold.co/100x100?text=User",
                  }}
                  className="w-14 h-14 rounded-full"
                />
                <View className="absolute bottom-0 right-0 w-4 h-4 bg-green-400 rounded-full border-2 border-white" />
              </View>

              <View className="flex-1 ml-3">
                <View className="flex-row items-center justify-between mb-0.5">
                  <Text className="font-bold text-gray-900">
                    {conversation.user.firstName} {conversation.user.lastName}
                  </Text>
                  <Text className="text-gray-400 text-xs">
                    {formatDate(conversation.lastMessageAt)}
                  </Text>
                </View>
                <Text
                  className={`text-sm ${!conversation.isRead ? "font-semibold text-gray-900" : "text-gray-500"}`}
                  numberOfLines={1}
                >
                  {conversation.lastMessage || "Bắt đầu trò chuyện"}
                </Text>
              </View>
              
              {!conversation.isRead && (
                <View className="ml-2 w-3 h-3 bg-blue-500 rounded-full" />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Chat Modal (Màn hình chi tiết Chat) */}
      <Modal
        visible={isChatOpen}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        {isChatOpen && otherUser && (
          <SafeAreaView className="flex-1 bg-white">
            {/* Chat Header - Messenger Style */}
            <View className="flex-row items-center px-4 py-3 bg-white" style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 2,
            }}>
              <TouchableOpacity onPress={closeChatModal} className="mr-3">
                <Feather name="arrow-left" size={24} color="#0084ff" />
              </TouchableOpacity>
              
              <View className="relative">
                <Image
                  source={{
                    uri: otherUser.profilePicture || "https://placehold.co/100x100?text=User",
                  }}
                  className="w-11 h-11 rounded-full"
                />
                <View className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-white" />
              </View>
              
              <View className="flex-1 ml-3">
                <Text className="font-bold text-gray-900 text-base">
                  {otherUser.firstName} {otherUser.lastName}
                </Text>
                <Text className="text-green-500 text-xs font-medium">Đang hoạt động</Text>
              </View>
              
              {/* Call Buttons */}
              <TouchableOpacity 
                className="w-10 h-10 bg-blue-50 rounded-full items-center justify-center mr-2"
                onPress={() => Alert.alert("Cuộc gọi", "Tính năng gọi điện đang phát triển")}
              >
                <Ionicons name="call" size={20} color="#0084ff" />
              </TouchableOpacity>
              <TouchableOpacity 
                className="w-10 h-10 bg-blue-50 rounded-full items-center justify-center"
                onPress={() => Alert.alert("Video call", "Tính năng gọi video đang phát triển")}
              >
                <Ionicons name="videocam" size={20} color="#0084ff" />
              </TouchableOpacity>
            </View>

            {/* Chat Messages Area */}
            {isLoadingMessages ? (
              // ... Loading
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" color="#1DA1F2" />
                <Text className="text-gray-500 mt-2">Đang tải tin nhắn...</Text>
              </View>
            ) : messagesError ? (
              // ... Error (403 Forbidden - Not mutual follow)
              <View className="flex-1 items-center justify-center p-6">
                <Text className="text-red-500 text-center mb-4 font-semibold">
                  {/* Hiển thị lỗi từ Backend (ví dụ: "Two users must mutually follow each other") */}
                  {(messagesError as any)?.response?.data?.error ||
                    "Không thể tải tin nhắn."}
                </Text>
                <Text className="text-gray-500 text-center mb-4">
                  Nếu bạn vừa theo dõi, hãy đợi một chút và thử lại.
                </Text>
                <TouchableOpacity
                  onPress={() => refetchMessages()}
                  className="bg-blue-500 px-4 py-2 rounded-lg"
                >
                  <Text className="text-white font-semibold">
                    Thử lại / Làm mới
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView
                ref={messagesEndRef}
                className="flex-1 px-4 py-4"
                onContentSizeChange={() => {
                  messagesEndRef.current?.scrollToEnd({ animated: true });
                }}
              >
                <View className="mb-4">
                  {messages.length === 0 ? (
                    <Text className="text-center text-gray-400 text-sm mb-4">
                      Đây là sự khởi đầu cuộc trò chuyện của bạn với{" "}
                      {otherUser.firstName} {otherUser.lastName}
                    </Text>
                  ) : (
                    messages.map((message: Message) => {
                      const isFromCurrentUser =
                        message.sender._id === currentUser?._id;
                      
                      // Decrypt message content
                      // We can assume messages are encrypted if key features are active
                      // The decrypt function handles plain text fallback automatically
                      const decryptedContent = decryptMessage(message.content);

                      return (
                        <View
                          key={message._id}
                          className={`flex-row mb-3 ${
                            isFromCurrentUser ? "justify-end" : ""
                          }`}
                        >
                          {!isFromCurrentUser && (
                            <Image
                              source={{
                                uri:
                                  message.sender.profilePicture ||
                                  "https://placehold.co/100x100?text=User",
                              }}
                              className="size-8 rounded-full mr-2"
                            />
                          )}
                          <View
                            className={`flex-1 ${
                              isFromCurrentUser ? "items-end" : ""
                            }`}
                          >
                            <View
                              className={`rounded-2xl px-4 py-3 max-w-xs ${
                                isFromCurrentUser
                                  ? "bg-blue-500"
                                  : "bg-gray-100"
                              }`}
                            >
                              {/* Display attachment if present */}
                              {message.attachment?.url && (
                                <View className="mb-2">
                                  {message.attachment.type.startsWith(
                                    "image"
                                  ) ? (
                                    <TouchableOpacity
                                      onPress={() =>
                                        handleViewImage(message.attachment!.url)
                                      }
                                    >
                                      <Image
                                        source={{ uri: message.attachment!.url }}
                                        className="w-full h-48 rounded-lg mb-2"
                                        resizeMode="cover"
                                      />
                                    </TouchableOpacity>
                                  ) : (
                                    <TouchableOpacity
                                      className="flex-row items-center p-3 rounded-lg border-2 border-dashed border-gray-300"
                                      onPress={() =>
                                        handleOpenDocument(message.attachment!.url)
                                      }
                                    >
                                      <Feather
                                        name="file"
                                        size={20}
                                        color={
                                          isFromCurrentUser ? "white" : "#333"
                                        }
                                      />
                                      <Text
                                        className={`ml-2 flex-1 ${
                                          isFromCurrentUser
                                            ? "text-white"
                                            : "text-gray-900"
                                        }`}
                                        numberOfLines={1}
                                      >
                                        {message.attachment.fileName ||
                                          "Document"}
                                      </Text>
                                    </TouchableOpacity>
                                  )}
                                </View>
                              )}
                              {message.content ? (
                            <Text
                              className={`${
                                isFromCurrentUser
                                  ? "text-white"
                                  : "text-gray-900"
                              } text-base`}
                            >
                              {decryptedContent}
                            </Text>
                          ) : null}
                            </View>
                            <Text className="text-xs text-gray-400 mt-1">
                              {formatDate(message.createdAt)}
                            </Text>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              </ScrollView>
            )}

            {/* Selected File Preview */}
            {selectedFile && (
              <View className="px-4 py-2 border-t border-gray-100 bg-gray-50">
                {/* ... (Giữ nguyên logic Preview File) */}
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1">
                    <Feather
                      name={
                        selectedFile.type.startsWith("image/")
                          ? "image"
                          : "file"
                      }
                      size={20}
                      color="#657786"
                    />
                    <Text
                      className="ml-2 text-gray-700 flex-1"
                      numberOfLines={1}
                    >
                      {selectedFile.name}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={removeFile} className="ml-2">
                    <Feather name="x" size={20} color="#657786" />
                  </TouchableOpacity>
                </View>
                {selectedFile.type.startsWith("image/") && (
                  <Image
                    source={{ uri: selectedFile.uri }}
                    className="w-full h-32 rounded-lg mt-2"
                    resizeMode="cover"
                  />
                )}
              </View>
            )}

            {/* Message Input - Messenger Style */}
            <View className="flex-row items-end px-3 py-2 bg-white border-t border-gray-100">
              {/* Quick action buttons */}
              <View className="flex-row items-center pb-2">
                <TouchableOpacity
                  onPress={() => Alert.alert("Camera", "Mở camera...")}
                  className="w-9 h-9 bg-blue-500 rounded-full items-center justify-center mr-1"
                  disabled={sendMessageMutation.isPending}
                >
                  <Ionicons name="camera" size={18} color="white" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={pickImage}
                  className="w-9 h-9 items-center justify-center mr-1"
                  disabled={sendMessageMutation.isPending}
                >
                  <Ionicons name="image" size={24} color="#0084ff" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={pickDocument}
                  className="w-9 h-9 items-center justify-center"
                  disabled={sendMessageMutation.isPending}
                >
                  <Ionicons name="document-attach" size={22} color="#0084ff" />
                </TouchableOpacity>
              </View>

              {/* Text Input with emoji */}
              <View className="flex-1 flex-row items-end bg-gray-100 rounded-3xl px-3 py-2 mx-2">
                <TextInput
                  className="flex-1 text-base max-h-24 py-1"
                  placeholder="Aa"
                  placeholderTextColor="#9ca3af"
                  value={newMessage}
                  onChangeText={setNewMessage}
                  multiline
                />
                <TouchableOpacity 
                  className="ml-2 pb-1"
                  onPress={() => Alert.alert("Emoji", "Emoji picker sẽ mở ra...")}
                >
                  <Ionicons name="happy-outline" size={24} color="#0084ff" />
                </TouchableOpacity>
              </View>

              {/* Send or Like button */}
              {(newMessage.trim() || selectedFile) ? (
                <TouchableOpacity
                  onPress={sendMessage}
                  disabled={sendMessageMutation.isPending}
                  className="w-10 h-10 bg-blue-500 rounded-full items-center justify-center mb-0.5"
                >
                  {sendMessageMutation.isPending ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Ionicons name="send" size={18} color="white" />
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  className="w-10 h-10 items-center justify-center mb-0.5"
                  onPress={() => {
                    setNewMessage("👍");
                    setTimeout(() => sendMessage(), 100);
                  }}
                >
                  <Ionicons name="thumbs-up" size={26} color="#0084ff" />
                </TouchableOpacity>
              )}
            </View>
            {!isConnected && (
              <View className="px-4 py-2 bg-yellow-50">
                <Text className="text-yellow-800 text-xs text-center">
                  Mất kết nối. Đang kết nối lại...
                </Text>
              </View>
            )}
          </SafeAreaView>
        )}
      </Modal>

      {/* New Message Modal (Danh sách Mutual Follows) */}
      <Modal
        visible={isNewMessageModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsNewMessageModalOpen(false)}
      >
        <SafeAreaView className="flex-1 bg-white">
          {/* Modal Header */}
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
            <TouchableOpacity
              onPress={() => setIsNewMessageModalOpen(false)}
              className="mr-3"
            >
              <Feather name="arrow-left" size={24} color="#1DA1F2" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-gray-900">Tin nhắn mới</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Search Bar */}
          <View className="px-4 py-3 border-b border-gray-100">
            <View className="flex-row items-center bg-gray-100 rounded-full px-4 py-3">
              <Feather name="search" size={20} color="#657786" />
              <TextInput
                placeholder="Tìm bạn bè..."
                className="flex-1 ml-3 text-base"
                placeholderTextColor="#657786"
                value={searchText}
                onChangeText={setSearchText}
              />
            </View>
          </View>

          {/* Friends List */}
          {isLoadingMutualFollows ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#1DA1F2" />
              <Text className="text-gray-500 mt-2">Đang tải danh sách bạn bè...</Text>
            </View>
          ) : mutualFollows.length === 0 ? (
            <View className="flex-1 items-center justify-center">
              <Text className="text-gray-500">Không có bạn bè để nhắn tin</Text>
              <Text className="text-gray-400 text-sm mt-2">
                Theo dõi người dùng khác để bắt đầu nhắn tin
              </Text>
            </View>
          ) : (
            <ScrollView className="flex-1">
              {mutualFollows
                .filter((friend: User) => {
                  if (!friend || !friend._id) return false;
                  if (!searchText.trim()) return true;
                  const searchLower = searchText.toLowerCase();
                  const fullName =
                    `${friend.firstName} ${friend.lastName}`.toLowerCase();
                  return (
                    friend.username.toLowerCase().includes(searchLower) ||
                    fullName.includes(searchLower)
                  );
                })
                .map((friend: User) => {
                  const friendId = friend._id;
                  if (!friendId) return null;

                  const hasConversation = conversations.some(
                    (conv: Conversation) => {
                      const convUserId =
                        typeof conv.user._id === "string"
                          ? conv.user._id
                          : String(conv.user._id);
                      const friendIdStr =
                        typeof friendId === "string"
                          ? friendId
                          : String(friendId);
                      return convUserId === friendIdStr;
                    }
                  );

                  return (
                    <TouchableOpacity
                      key={friendId}
                      className="flex-row items-center p-4 border-b border-gray-50 active:bg-gray-50"
                      onPress={() =>
                        handleStartNewConversation(String(friendId))
                      }
                    >
                      <Image
                        source={{
                          uri:
                            friend.profilePicture ||
                            "https://placehold.co/100x100?text=User",
                        }}
                        className="size-12 rounded-full mr-3"
                      />
                      <View className="flex-1">
                        <Text className="font-semibold text-gray-900">
                          {friend.firstName} {friend.lastName}
                        </Text>
                        <Text className="text-gray-500 text-sm">
                          @{friend.username}
                        </Text>
                      </View>
                      {hasConversation && (
                        <View className="w-2 h-2 bg-blue-500 rounded-full mr-2" />
                      )}
                      <Feather name="chevron-right" size={20} color="#657786" />
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* FAB Button for New Message */}
      {!isChatOpen && (
        <TouchableOpacity
          onPress={() => {
            setIsNewMessageModalOpen(true);
            refetchMutualFollows();
          }}
          className="absolute bottom-6 right-6 w-14 h-14 bg-blue-500 rounded-full items-center justify-center shadow-lg"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
          }}
        >
          <Feather name="edit" size={24} color="white" />
        </TouchableOpacity>
      )}

      {/* Image Viewer Modal */}
      {(() => {
        const imageMessages = messages.filter(
          (msg: Message) =>
            msg.attachment?.url && msg.attachment.type.startsWith("image")
        );
        const imageUrls = imageMessages.map((msg: Message) => ({
          uri: msg.attachment!.url,
        }));

        return (
          <ImageViewing
            images={imageUrls as any}
            imageIndex={imageViewerIndex}
            visible={imageViewerVisible}
            onRequestClose={() => setImageViewerVisible(false)}
            onLongPress={(image: any) => {
              // Long press to download image
              const imageUrl = image.uri;
              const fileName = `image_${Date.now()}.jpg`;
              handleDownload(imageUrl, fileName, true);
            }}
            HeaderComponent={({ imageIndex }) => {
              const currentImage = imageMessages[imageIndex];
              return (
                <SafeAreaView className="bg-black bg-opacity-50">
                  <View className="flex-row items-center justify-between px-4 py-2">
                    <Text className="text-white">
                      {imageIndex + 1} / {imageUrls.length}
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        if (currentImage?.attachment?.url) {
                          handleDownload(
                            currentImage.attachment.url,
                            currentImage.attachment.fileName ||
                              `image_${Date.now()}.jpg`,
                            true
                          );
                        }
                      }}
                      className="p-2"
                    >
                      <Feather name="download" size={20} color="white" />
                    </TouchableOpacity>
                  </View>
                </SafeAreaView>
              );
            }}
          />
        );
      })()}
    </SafeAreaView>
  );
};

export default MessagesScreen;
