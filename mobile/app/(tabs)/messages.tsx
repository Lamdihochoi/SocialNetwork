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
  FlatList,
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
import * as MediaLibrary from "expo-media-library";
import ImageViewing from "react-native-image-viewing";
// Use legacy API for Expo SDK 54+ compatibility
import * as FileSystem from "expo-file-system/legacy";
// E2E Encryption - Per-message dynamic keys with middleware
import { 
  encryptMessage, 
  decryptMessage, 
  decryptMessageObject, 
  decryptMessageList, 
  decryptForList 
} from "@/utils/encryptionV2";
// 🎨 New components
import { StickerPicker } from "@/components/StickerPicker";
import { MessageBubble } from "@/components/MessageBubble";
import { Sticker } from "@/data/stickers";
import { useRouter } from "expo-router";

// Helper: Format last seen time
const formatLastSeen = (lastSeen: string | Date): string => {
  const now = new Date();
  const lastSeenDate = new Date(lastSeen);
  const diffMs = now.getTime() - lastSeenDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "vừa xong";
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays < 7) return `${diffDays} ngày trước`;
  return lastSeenDate.toLocaleDateString("vi-VN");
};

// Helper: Get file type icon and label
const getFileTypeInfo = (fileName: string, mimeType?: string): { icon: string; label: string; color: string } => {
  const ext = fileName?.split('.').pop()?.toLowerCase() || '';
  const type = mimeType?.toLowerCase() || '';
  
  // PDF
  if (ext === 'pdf' || type.includes('pdf')) {
    return { icon: 'file-text', label: 'PDF', color: '#E53E3E' };
  }
  
  // Word
  if (['doc', 'docx'].includes(ext) || type.includes('word') || type.includes('document')) {
    return { icon: 'file-text', label: 'Word', color: '#2B6CB0' };
  }
  
  // Excel
  if (['xls', 'xlsx'].includes(ext) || type.includes('excel') || type.includes('spreadsheet')) {
    return { icon: 'grid', label: 'Excel', color: '#38A169' };
  }
  
  // PowerPoint
  if (['ppt', 'pptx'].includes(ext) || type.includes('powerpoint') || type.includes('presentation')) {
    return { icon: 'monitor', label: 'PowerPoint', color: '#DD6B20' };
  }
  
  // Text
  if (['txt', 'log', 'csv'].includes(ext) || type.includes('text')) {
    return { icon: 'file-text', label: ext.toUpperCase(), color: '#718096' };
  }
  
  // Archive
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext) || type.includes('zip') || type.includes('archive')) {
    return { icon: 'archive', label: ext.toUpperCase(), color: '#805AD5' };
  }
  
  // Audio
  if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext) || type.includes('audio')) {
    return { icon: 'music', label: 'Audio', color: '#D53F8C' };
  }
  
  // Video
  if (['mp4', 'mov', 'avi', 'mkv'].includes(ext) || type.includes('video')) {
    return { icon: 'video', label: 'Video', color: '#319795' };
  }
  
  // Default
  return { icon: 'file', label: ext.toUpperCase() || 'File', color: '#4A5568' };
};
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
  const [isSharing, setIsSharing] = useState(false); // Tránh duplicate share requests
  const [isStickerPickerOpen, setIsStickerPickerOpen] = useState(false); // 🎨 Sticker picker
  // ✏️🗑️ Edit/Delete message state
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editMessageText, setEditMessageText] = useState("");
  const messagesEndRef = useRef<ScrollView>(null);
  const api = useApiClient();
  const queryClient = useQueryClient();
  const { currentUser } = useCurrentUser();
  const router = useRouter();  // 🔗 For profile navigation
  const { 
    joinConversation, 
    leaveConversation, 
    onReceiveMessage, 
    onMessagesRead,
    isConnected,
    isUserOnline,
    emitMarkRead,
    emitSendMessage,
    setOnNewMessageCallback,
  } = useSocket();

  // 🔐 E2E Encryption wrapper for sending messages
  // Uses imported encryptMessage from encryptionV2
  const encryptForSend = useCallback((text: string) => {
    if (!currentUser?._id || !selectedOtherUserId) return text;
    return encryptMessage(text, currentUser._id, selectedOtherUserId);
  }, [currentUser?._id, selectedOtherUserId]);

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
    refetch: refetchConversations,
  } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => messageApi.getConversations(api),
    select: (response) => response.data.conversations,
    // ⚡ INSTANT: Always fresh data
    staleTime: 0, // Luôn fetch mới
    gcTime: 1000 * 60 * 10, // Cache 10 phút
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: 10000, // Auto sync mỗi 10s
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
    queryFn: async () => {
      const response = await messageApi.getMessageHistory(api, selectedOtherUserId!);
      return {
        messages: response.data.messages || [],
        conversation: response.data.conversation || null,
      };
    },
    enabled: !!selectedOtherUserId && isChatOpen,
    // ⚡ INSTANT: Always get fresh messages
    staleTime: 0, // Luôn fetch mới khi mở chat
    gcTime: 1000 * 60 * 30, // Cache 30 phút
    refetchOnMount: 'always',
    placeholderData: (prev) => prev, // Hiển thị data cũ trong khi loading
  });

  // 🔐 Pre-decrypt messages using middleware + deduplicate
  const messages = useMemo(() => {
    const raw = messageHistoryData?.messages || [];
    
    // 1. Deduplicate
    const seen = new Set<string>();
    const unique = raw.filter((msg: any) => {
      if (seen.has(msg._id)) return false;
      seen.add(msg._id);
      return true;
    });
    
    // 2. Pre-decrypt all messages (if we have both user IDs)
    if (currentUser?._id && selectedOtherUserId) {
      return decryptMessageList(unique, currentUser._id, selectedOtherUserId);
    }
    
    return unique;
  }, [messageHistoryData?.messages, currentUser?._id, selectedOtherUserId]);
  
  const conversation = messageHistoryData?.conversation || null;

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
        attachment: file ? { 
          url: file.uri, 
          // Use simplified type like server does
          type: file.type.startsWith('image') ? 'image' : file.type.startsWith('video') ? 'video' : 'file',
          fileName: file.name 
        } : null,
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

    onSuccess: (response, { receiverId }) => {
      // 🔥 Replace temp message with real one from server
      const realMessage = response.data.message;
      queryClient.setQueryData(["messageHistory", receiverId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          messages: old.messages.map((msg: any) =>
            msg._id.startsWith("temp-") ? { ...realMessage, pending: false } : msg
          ),
        };
      });
      
      // ⚡ Update conversations list immediately (optimistic)
      queryClient.setQueryData(["conversations"], (old: any) => {
        if (!old || !Array.isArray(old)) return old;
        const updated = old.map((conv: any) => {
          if (conv.user._id === receiverId) {
            return {
              ...conv,
              lastMessage: realMessage.content,
              lastMessageAt: realMessage.createdAt,
              isRead: true,
            };
          }
          return conv;
        });
        // Sort to move this conversation to top
        return updated.sort((a: any, b: any) => 
          new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
        );
      });
      
      // Also refetch in background for server confirmation
      queryClient.invalidateQueries({ queryKey: ["conversations"], refetchType: 'none' });
    },

    // ⚡ NO onSettled - socket handles realtime sync, don't refetch
  });

  // ✏️ Edit Message Mutation
  const editMessageMutation = useMutation({
    mutationFn: async ({ messageId, content }: { messageId: string; content: string }) => {
      return messageApi.editMessage(api, messageId, content);
    },
    onMutate: async ({ messageId, content }) => {
      // Optimistically update the message
      queryClient.setQueryData(["messageHistory", selectedOtherUserId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          messages: old.messages.map((msg: any) =>
            msg._id === messageId ? { ...msg, content, isEdited: true } : msg
          ),
        };
      });
    },
    onSuccess: () => {
      setIsEditModalOpen(false);
      setSelectedMessage(null);
      setEditMessageText("");
    },
    onError: (err: any) => {
      Alert.alert("Lỗi", err.response?.data?.error || "Không thể chỉnh sửa tin nhắn");
      queryClient.invalidateQueries({ queryKey: ["messageHistory", selectedOtherUserId] });
    },
  });

  // 🗑️ Delete Message Mutation
  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      return messageApi.deleteMessage(api, messageId);
    },
    onMutate: async (messageId) => {
      // Optimistically update the message as deleted
      queryClient.setQueryData(["messageHistory", selectedOtherUserId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          messages: old.messages.map((msg: any) =>
            msg._id === messageId ? { ...msg, content: "Tin nhắn đã bị xóa", isDeleted: true } : msg
          ),
        };
      });
    },
    onSuccess: () => {
      setSelectedMessage(null);
    },
    onError: (err: any) => {
      Alert.alert("Lỗi", err.response?.data?.error || "Không thể xóa tin nhắn");
      queryClient.invalidateQueries({ queryKey: ["messageHistory", selectedOtherUserId] });
    },
  });

  // 🗑️ Delete Conversation Mutation (with optimistic update)
  const deleteConversationMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      return messageApi.deleteConversation(api, conversationId);
    },
    onSuccess: () => {
      // Immediately refetch conversations list
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      // Clear all message history caches
      queryClient.removeQueries({ queryKey: ["messageHistory"] });
      Alert.alert("✅ Thành công", "Cuộc trò chuyện đã được xóa!");
    },
    onError: (err: any) => {
      Alert.alert("Lỗi", err.response?.data?.error || "Không thể xóa cuộc trò chuyện");
    },
  });

  // 🧹 Clear Conversation Mutation
  const clearConversationMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      return messageApi.clearConversation(api, conversationId);
    },
    onSuccess: (response, conversationId) => {
      // Immediately refetch conversations list
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      
      // Find and invalidate specific message history
      const conv = conversations.find((c: any) => c._id === conversationId);
      if (conv?.user._id) {
        queryClient.invalidateQueries({ queryKey: ["messageHistory", conv.user._id] });
      }
      
      Alert.alert("✅ Thành công", `Đã xóa ${response.data.deletedCount} tin nhắn!`);
    },
    onError: (err: any) => {
      Alert.alert("Lỗi", err.response?.data?.error || "Không thể xóa tin nhắn");
    },
  });

  // 🔥 Long press handler for conversation actions
  const handleConversationLongPress = (conversation: any) => {
    Alert.alert(
      conversation.user.firstName + " " + conversation.user.lastName,
      "Chọn hành động:",
      [
        {
          text: "🧹 Xóa tin nhắn",
          onPress: () => {
            Alert.alert(
              "Xác nhận",
              "Xóa tất cả tin nhắn trong cuộc trò chuyện này?",
              [
                { text: "Hủy", style: "cancel" },
                { 
                  text: "Xóa tin nhắn", 
                  style: "destructive",
                  onPress: () => clearConversationMutation.mutate(conversation._id)
                },
              ]
            );
          },
        },
        {
          text: "🗑️ Xóa cuộc trò chuyện",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "⚠️ Xác nhận xóa",
              "Xóa hoàn toàn cuộc trò chuyện này? Không thể hoàn tác!",
              [
                { text: "Hủy", style: "cancel" },
                { 
                  text: "Xóa", 
                  style: "destructive",
                  onPress: () => deleteConversationMutation.mutate(conversation._id)
                },
              ]
            );
          },
        },
        { text: "Đóng", style: "cancel" },
      ]
    );
  };
  // 🔥 Long press handler for message actions
  const handleMessageLongPress = (message: Message) => {
    // Only allow actions on own messages
    if (message.sender._id !== currentUser?._id) return;
    if (message.isDeleted) return;
    
    setSelectedMessage(message);
    
    Alert.alert(
      "Tùy chọn tin nhắn",
      "Bạn muốn làm gì với tin nhắn này?",
      [
        {
          text: "✏️ Chỉnh sửa",
          onPress: () => {
            setEditMessageText(message.content); // Already decrypted in useMemo
            setIsEditModalOpen(true);
          },
        },
        {
          text: "🗑️ Xóa",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Xác nhận xóa",
              "Bạn có chắc muốn xóa tin nhắn này?",
              [
                { text: "Hủy", style: "cancel" },
                {
                  text: "Xóa",
                  style: "destructive",
                  onPress: () => deleteMessageMutation.mutate(message._id),
                },
              ]
            );
          },
        },
        { text: "Hủy", style: "cancel", onPress: () => setSelectedMessage(null) },
      ]
    );
  };

  // ✏️ Submit edited message
  const handleSubmitEdit = () => {
    if (!selectedMessage || !editMessageText.trim()) return;
    editMessageMutation.mutate({
      messageId: selectedMessage._id,
      content: editMessageText.trim(),
    });
  };

  // 🔔 GLOBAL: Listen for new messages to update conversations list (even when chat is closed)
  useEffect(() => {
    const handleGlobalMessage = (message: any) => {
      console.log("[GLOBAL] New message received:", message?._id);
      
      // Determine the other user in this conversation
      const otherUserId = message?.sender?._id === currentUser?._id 
        ? message?.receiver?._id 
        : message?.sender?._id;
      
      // 🔥 FIX: Skip own messages - optimistic update already added them
      const isOwnMessage = message?.sender?._id === currentUser?._id;
      
      // ⚡ INSTANT SYNC: Update conversations list immediately
      queryClient.setQueryData(["conversations"], (old: any) => {
        if (!old || !Array.isArray(old)) return old;
        const updatedConversations = old.map((conv: any) => {
          if (conv.user._id === otherUserId) {
            return {
              ...conv,
              lastMessage: message.content,
              lastMessageAt: message.createdAt,
              isRead: isOwnMessage ? true : false, // Unread if from other user
            };
          }
          return conv;
        });
        // Sort by lastMessageAt to move updated conversation to top
        return updatedConversations.sort((a: any, b: any) => 
          new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
        );
      });
      
      // 🔄 Also invalidate to get fresh data from server (background refresh)
      queryClient.invalidateQueries({ queryKey: ["conversations"], refetchType: 'none' });
      
      if (isOwnMessage) {
        console.log("[GLOBAL] Skipping own message - already optimistically added");
        return;
      }
      
      // If chat is closed, invalidate message history so it refetches when opened
      if (!isChatOpen && otherUserId) {
        queryClient.invalidateQueries({ queryKey: ["messageHistory", otherUserId], refetchType: 'none' });
      }
    };

    // Register the global callback
    setOnNewMessageCallback(handleGlobalMessage);

    return () => {
      setOnNewMessageCallback(null);
    };
  }, [isChatOpen, selectedOtherUserId, queryClient, setOnNewMessageCallback, currentUser?._id]);

  // Listen for new messages via socket
  useEffect(() => {
    if (!conversation?._id || !isChatOpen) return;

    joinConversation(conversation._id);

    // ✅ Mark messages as read when opening chat
    if (currentUser?._id) {
      emitMarkRead(conversation._id, currentUser._id);
    }

    const cleanup = onReceiveMessage((data: any) => {
      const incomingMessage = data.message || data;
      console.log("[SOCKET] Received message in chat:", incomingMessage?._id);
      
      // 🔥 FIX: Check if message belongs to current conversation
      // Message is relevant if:
      // 1. Same conversationId, OR
      // 2. Message is between current user and selected other user (either direction)
      const isRelevant = 
        data.conversationId === conversation._id ||
        (incomingMessage?.sender?._id === selectedOtherUserId && incomingMessage?.receiver?._id === currentUser?._id) ||
        (incomingMessage?.sender?._id === currentUser?._id && incomingMessage?.receiver?._id === selectedOtherUserId);
      
      // 🔥 FIX: Skip own messages - optimistic update already added them
      const isOwnMessage = incomingMessage?.sender?._id === currentUser?._id;
      
      if (isRelevant && !isOwnMessage) {
        // 🚀 Add message only if not already exists
        queryClient.setQueryData(
          ["messageHistory", selectedOtherUserId],
          (old: any) => {
            if (!old) return old;
            
            // 🔥 FIX: Check if message already exists (prevents duplicate from multiple socket rooms)
            const exists = old.messages?.some((m: any) => m._id === incomingMessage._id);
            if (exists) {
              console.log("[SOCKET] Skipping duplicate:", incomingMessage._id);
              return old;
            }
            
            // Add new message
            console.log("[SOCKET] Adding new message:", incomingMessage._id);
            return {
              ...old,
              messages: [...(old.messages || []), incomingMessage],
            };
          }
        );
        
        // Cập nhật conversations list
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
        
        // Mark new incoming messages as read immediately
        emitMarkRead(conversation._id, currentUser._id);
      }
    });

    // 👁️ Listen for message read events (when recipient reads our messages)
    const cleanupMessagesRead = onMessagesRead((data) => {
      if (data.conversationId === conversation._id) {
        console.log("[SEEN] Messages marked as read by:", data.readBy);
        
        // Update all messages from current user as read
        queryClient.setQueryData(
          ["messageHistory", selectedOtherUserId],
          (old: any) => {
            if (!old?.messages) return old;
            
            return {
              ...old,
              messages: old.messages.map((msg: any) => 
                msg.sender._id === currentUser?._id 
                  ? { ...msg, isRead: true }
                  : msg
              ),
            };
          }
        );
      }
    });

    return () => {
      leaveConversation(conversation._id);
      cleanup();
      cleanupMessagesRead();
    };
  }, [conversation?._id, isChatOpen, selectedOtherUserId, currentUser]);

  // ✅ HÀM MỞ CHAT: Dùng cho cả Conversations cũ và Friends mới (với prefetch)
  const openConversation = async (otherUserId: string) => {
    // ⚡ Prefetch messages BEFORE opening chat for instant display
    queryClient.prefetchQuery({
      queryKey: ["messageHistory", otherUserId],
      queryFn: async () => {
        const response = await messageApi.getMessageHistory(api, otherUserId);
        return {
          messages: response.data.messages || [],
          conversation: response.data.conversation || null,
        };
      },
      staleTime: 1000 * 3,
    });
    
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
    // ⚡ Immediately sync conversation list
    refetchConversations();
  };

  // 🚀 SOCKET-FIRST: Send message with instant UI update
  const sendMessage = useCallback(() => {
    if ((newMessage.trim() || selectedFile) && selectedOtherUserId) {
      const messageContent = newMessage.trim();
      const tempId = "temp-" + Date.now();
      
      // 🔐 ENCRYPT FIRST: Encrypt content before sending (E2E)
      const encryptedContent = messageContent ? encryptForSend(messageContent) : "";
      
      // 2️⃣ Clear input immediately
      setNewMessage("");
      setSelectedFile(null);
      
      // 3️⃣ SOCKET-FIRST: Send ENCRYPTED via socket for instant delivery (text only)
      if (isConnected && !selectedFile) {
        // 🔥 Only add optimistic for socket path - socket doesn't trigger onMutate
        const optimisticMessage = {
          _id: tempId,
          sender: currentUser,
          receiver: { _id: selectedOtherUserId },
          content: encryptedContent,
          attachment: null,
          createdAt: new Date().toISOString(),
          isRead: false,
          pending: true,
        };
        
        queryClient.setQueryData(["messageHistory", selectedOtherUserId], (old: any) => {
          const oldMessages = old?.messages || [];
          const newData = { ...old, messages: [...oldMessages, optimisticMessage] };
          console.log("[OPTIMISTIC] Added message, total:", newData.messages.length);
          return newData;
        });
        
        emitSendMessage({
          receiverId: selectedOtherUserId,
          content: encryptedContent,
          tempId,
        });
        console.log("[SEND] Via socket (E2E encrypted)");
      } else {
        // 4️⃣ FALLBACK: Use HTTP for files or when socket not connected
        // 🔥 mutation.onMutate handles optimistic update - don't add here
        sendMessageMutation.mutate({
          receiverId: selectedOtherUserId,
          content: encryptedContent,
          file: selectedFile || undefined,
        });
        console.log("[SEND] Via HTTP (E2E encrypted)");
      }
    }
  }, [newMessage, selectedFile, selectedOtherUserId, isConnected, currentUser, emitSendMessage, sendMessageMutation, queryClient, encryptForSend]);

  // 🚀 Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0 && messagesEndRef.current) {
      // Small delay to ensure render is complete
      setTimeout(() => {
        messagesEndRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

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

  // 🎬 VIDEO PICKER
  const pickVideo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 0.8,
        videoMaxDuration: 60, // Max 60 seconds
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const fileName = asset.uri.split("/").pop() || "video.mp4";
        setSelectedFile({
          uri: asset.uri,
          type: "video/mp4",
          name: fileName,
        });
      }
    } catch (error) {
      console.error("Error picking video:", error);
      Alert.alert("Lỗi", "Không thể chọn video. Vui lòng thử lại.");
    }
  };

  // 🎨 SEND STICKER
  const sendSticker = useCallback(
    (packId: string, sticker: Sticker) => {
      if (!selectedOtherUserId || !currentUser) return;

      // Send to server - mutation handles optimistic update
      const encryptedContent = encryptForSend(sticker.emoji);
      sendMessageMutation.mutate(
        {
          receiverId: selectedOtherUserId,
          content: encryptedContent,
        },
        {
          onSuccess: () => {
            setIsStickerPickerOpen(false);
          },
        }
      );
    },
    [selectedOtherUserId, currentUser, sendMessageMutation, encryptForSend]
  );

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

  // ✅ TẢI FILE (Ảnh hoặc Tài liệu)
  // Android: Sử dụng SAF để chọn thư mục lưu
  // iOS: Mở share sheet
  const handleDownload = async (
    url: string,
    fileName: string,
    isImage: boolean
  ) => {
    // Tránh duplicate requests
    if (isSharing) {
      return;
    }

    try {
      setIsSharing(true);
      
      // Download file to cache first
      const cacheUri = (FileSystem as any).cacheDirectory + fileName;
      const downloadResult = await FileSystem.downloadAsync(url, cacheUri);

      if (downloadResult.status !== 200) {
        Alert.alert("Lỗi", "Không thể tải file. Vui lòng thử lại.");
        return;
      }

      if (Platform.OS === 'android') {
        // 🤖 ANDROID: Sử dụng SAF để chọn thư mục lưu (cho cả ảnh và tài liệu)
        try {
          // Yêu cầu người dùng chọn thư mục
          const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
          
          if (permissions.granted) {
            // Đọc file từ cache
            const fileContent = await FileSystem.readAsStringAsync(downloadResult.uri, {
              encoding: FileSystem.EncodingType.Base64,
            });
            
            // Xác định MIME type
            const ext = fileName.split('.').pop()?.toLowerCase() || '';
            let mimeType = "application/octet-stream";
            
            // Images
            if (['jpg', 'jpeg'].includes(ext)) mimeType = "image/jpeg";
            else if (ext === 'png') mimeType = "image/png";
            else if (ext === 'gif') mimeType = "image/gif";
            else if (ext === 'webp') mimeType = "image/webp";
            // Documents
            else if (ext === 'pdf') mimeType = "application/pdf";
            else if (['doc', 'docx'].includes(ext)) mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            else if (['xls', 'xlsx'].includes(ext)) mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            else if (['ppt', 'pptx'].includes(ext)) mimeType = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
            else if (ext === 'txt') mimeType = "text/plain";
            else if (ext === 'zip') mimeType = "application/zip";
            // Video
            else if (['mp4', 'mov', 'avi'].includes(ext)) mimeType = "video/mp4";

            // Tạo file trong thư mục người dùng chọn
            const newFileUri = await FileSystem.StorageAccessFramework.createFileAsync(
              permissions.directoryUri,
              fileName,
              mimeType
            );

            // Ghi nội dung vào file
            await FileSystem.writeAsStringAsync(newFileUri, fileContent, {
              encoding: FileSystem.EncodingType.Base64,
            });

            Alert.alert("✅ Thành công", `${isImage ? '📷 Ảnh' : '📄 Tệp'} "${fileName}" đã được lưu!`);
          } else {
            Alert.alert("Thông báo", "Bạn cần chọn thư mục để lưu file.");
          }
        } catch (safError: any) {
          console.error("SAF error:", safError);
          Alert.alert("Lỗi", "Không thể lưu file. Vui lòng thử lại.");
        }
      } else {
        // 🍎 iOS: Mở share sheet
        const Sharing = await import("expo-sharing");
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(downloadResult.uri, {
            mimeType: isImage ? "image/jpeg" : "application/octet-stream",
            dialogTitle: isImage ? "Lưu ảnh" : `Lưu ${fileName}`,
            UTI: isImage ? 'public.image' : 'public.data',
          });
        }
      }
    } catch (error: any) {
      console.error("Download error:", error);
      Alert.alert("Lỗi", "Không thể tải file. Vui lòng thử lại.");
    } finally {
      setIsSharing(false);
    }
  };

  // ✅ CHỤP ẢNH BẰNG CAMERA
  const takePhoto = async () => {
    try {
      // Request camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Quyền truy cập", "Cần cấp quyền truy cập camera để chụp ảnh.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const fileName = `photo_${Date.now()}.jpg`;
        setSelectedFile({
          uri: asset.uri,
          type: "image/jpeg",
          name: fileName,
        });
      }
    } catch (error) {
      console.error("Camera error:", error);
      Alert.alert("Lỗi", "Không thể mở camera. Vui lòng thử lại.");
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
                    {/* 🟢 Chấm xanh chỉ hiện khi bạn bè ONLINE thật sự */}
                    {friend.clerkId && isUserOnline(friend.clerkId) && (
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
              onLongPress={() => handleConversationLongPress(conversation)}
              delayLongPress={500}
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
                {/* 🟢 Online indicator - Real-time status */}
                {conversation.user.clerkId && isUserOnline(conversation.user.clerkId) && (
                  <View className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
                )}
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
                  {conversation.lastMessage ? decryptForList(conversation.lastMessage, currentUser?._id, conversation.user._id) : "Bắt đầu trò chuyện"}
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
              
              {/* 🔗 Profile Navigation - Tap avatar or name to go to profile */}
              <TouchableOpacity 
                onPress={() => {
                  closeChatModal();
                  router.push(`/user/${otherUser._id}`);
                }}
                className="flex-row items-center flex-1"
                activeOpacity={0.7}
              >
                <View className="relative">
                  <Image
                    source={{
                      uri: otherUser.profilePicture || "https://placehold.co/100x100?text=User",
                    }}
                    className="w-11 h-11 rounded-full"
                  />
                  {/* 🟢 Real-time online indicator */}
                  {otherUser.clerkId && isUserOnline(otherUser.clerkId) && (
                    <View className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />
                  )}
                </View>
                
                <View className="flex-1 ml-3">
                  <Text className="font-bold text-gray-900 text-base">
                    {otherUser.firstName} {otherUser.lastName}
                  </Text>
                  {/* 🟢 Real-time online status text */}
                  {otherUser.clerkId && isUserOnline(otherUser.clerkId) ? (
                    <Text className="text-green-500 text-xs font-medium">Đang hoạt động</Text>
                  ) : otherUser.lastSeen ? (
                    <Text className="text-gray-400 text-xs">
                      Hoạt động {formatLastSeen(otherUser.lastSeen)}
                    </Text>
                  ) : (
                    <Text className="text-gray-400 text-xs">Không hoạt động</Text>
                  )}
                </View>
              </TouchableOpacity>
              
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
                    messages.map((message: Message, index: number) => {
                      const isFromCurrentUser =
                        message.sender._id === currentUser?._id;
                      
                      // Messages are pre-decrypted in useMemo, use content directly
                      const decryptedContent = message.content;
                      
                      // Check if this is the last message sent by current user and is read
                      // Find the index of the last message sent by current user
                      const lastSentIndex = messages.reduce((last: number, m: Message, i: number) => 
                        m.sender._id === currentUser?._id ? i : last, -1
                      );
                      const isLastSentMessage = isFromCurrentUser && index === lastSentIndex;
                      const showSeenIndicator = isLastSentMessage && message.isRead;

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
                            className={`${
                              isFromCurrentUser ? "items-end" : "items-start"
                            }`}
                          >
                            {/* 🔥 Long-press for edit/delete (only own messages) */}
                            <TouchableOpacity
                              onLongPress={() => handleMessageLongPress(message)}
                              delayLongPress={500}
                              activeOpacity={0.8}
                            >
                            <View
                              className={`rounded-2xl px-4 py-3 max-w-xs ${
                                isFromCurrentUser
                                  ? message.isDeleted ? "bg-gray-400" : "bg-blue-500"
                                  : message.isDeleted ? "bg-gray-200" : "bg-gray-100"
                              }`}
                            >
                              {/* Display attachment if present */}
                              {message.attachment?.url && (
                                <View className="mb-2">
                                  {(message.attachment.type === "image" || message.attachment.type?.startsWith("image/")) ? (
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
                                  ) : (() => {
                                    const fileInfo = getFileTypeInfo(
                                      message.attachment!.fileName || '',
                                      message.attachment!.type
                                    );
                                    return (
                                      <TouchableOpacity
                                        className="flex-row items-center p-3 rounded-xl bg-white border border-gray-200"
                                        style={{ minWidth: 200 }}
                                        onPress={() =>
                                          handleOpenDocument(message.attachment!.url)
                                        }
                                      >
                                        {/* File Type Icon */}
                                        <View 
                                          className="w-12 h-12 rounded-xl items-center justify-center mr-3"
                                          style={{ backgroundColor: fileInfo.color + '15' }}
                                        >
                                          <Feather
                                            name={fileInfo.icon as any}
                                            size={24}
                                            color={fileInfo.color}
                                          />
                                        </View>
                                        
                                        {/* File Info */}
                                        <View className="flex-1">
                                          <Text
                                            className="text-sm font-semibold text-gray-800"
                                            numberOfLines={1}
                                          >
                                            {message.attachment!.fileName || "Tệp đính kèm"}
                                          </Text>
                                          <Text
                                            className="text-xs text-gray-500"
                                          >
                                            {fileInfo.label}
                                          </Text>
                                        </View>
                                        
                                        {/* Download Button */}
                                        <TouchableOpacity
                                          onPress={() =>
                                            handleDownload(
                                              message.attachment!.url,
                                              message.attachment!.fileName || "document",
                                              false
                                            )
                                          }
                                          className="w-10 h-10 rounded-full bg-blue-50 items-center justify-center ml-2"
                                        >
                                          <Feather
                                            name="download"
                                            size={18}
                                            color="#3B82F6"
                                          />
                                        </TouchableOpacity>
                                      </TouchableOpacity>
                                    );
                                  })()}
                                </View>
                              )}
                              {message.content ? (
                            (() => {
                              // 🔗 Parse and render clickable links in message
                              const linkRegex = /\[([^\]]+)\]\(\/post\/([^)]+)\)/g;
                              const parts = [];
                              let lastIndex = 0;
                              let match;
                              
                              while ((match = linkRegex.exec(decryptedContent)) !== null) {
                                // Add text before link
                                if (match.index > lastIndex) {
                                  parts.push(
                                    <Text key={`text-${lastIndex}`} className={`${isFromCurrentUser ? "text-white" : "text-gray-900"} text-base`}>
                                      {decryptedContent.slice(lastIndex, match.index)}
                                    </Text>
                                  );
                                }
                                // Add clickable link
                                const linkText = match[1];
                                const postId = match[2];
                                parts.push(
                                  <TouchableOpacity 
                                    key={`link-${match.index}`}
                                    onPress={() => {
                                      closeChatModal();
                                      router.push(`/post/${postId}`);
                                    }}
                                  >
                                    <Text className={`${isFromCurrentUser ? "text-blue-200 underline" : "text-blue-500 underline"} text-base font-medium`}>
                                      {linkText}
                                    </Text>
                                  </TouchableOpacity>
                                );
                                lastIndex = match.index + match[0].length;
                              }
                              
                              // Add remaining text
                              if (lastIndex < decryptedContent.length) {
                                parts.push(
                                  <Text key={`text-end`} className={`${isFromCurrentUser ? "text-white" : "text-gray-900"} text-base`}>
                                    {decryptedContent.slice(lastIndex)}
                                  </Text>
                                );
                              }
                              
                              // If no links found, just render plain text
                              if (parts.length === 0) {
                                return (
                                  <Text className={`${isFromCurrentUser ? "text-white" : "text-gray-900"} text-base`}>
                                    {decryptedContent}
                                  </Text>
                                );
                              }
                              
                              return <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{parts}</View>;
                            })()
                          ) : null}
                            </View>
                            </TouchableOpacity>
                            <View className="flex-row items-center mt-1">
                              <Text className="text-xs text-gray-400">
                                {formatDate(message.createdAt)}
                              </Text>
                              {/* ✏️ Edited indicator */}
                              {message.isEdited && (
                                <Text className="text-xs text-gray-400 ml-1">(đã sửa)</Text>
                              )}
                              {/* 👁️ Seen indicator - shows for last sent message that was read */}
                              {showSeenIndicator && (
                                <View className="flex-row items-center ml-2">
                                  <Image
                                    source={{
                                      uri: otherUser?.profilePicture || "https://placehold.co/100x100?text=User",
                                    }}
                                    className="w-4 h-4 rounded-full"
                                  />
                                </View>
                              )}
                            </View>
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

            {/* Message Input - Messenger Style Enhanced */}
            <View className="flex-row items-end px-3 py-2 bg-white border-t border-gray-100">
              {/* Quick action buttons row */}
              <View className="flex-row items-center pb-2">
                {/* Camera */}
                <TouchableOpacity
                  onPress={takePhoto}
                  className="w-9 h-9 bg-blue-500 rounded-full items-center justify-center mr-1"
                  disabled={sendMessageMutation.isPending}
                >
                  <Ionicons name="camera" size={18} color="white" />
                </TouchableOpacity>
                {/* Image */}
                <TouchableOpacity
                  onPress={pickImage}
                  className="w-9 h-9 items-center justify-center"
                  disabled={sendMessageMutation.isPending}
                >
                  <Ionicons name="image" size={24} color="#0084ff" />
                </TouchableOpacity>
                {/* Video */}
                <TouchableOpacity
                  onPress={pickVideo}
                  className="w-9 h-9 items-center justify-center"
                  disabled={sendMessageMutation.isPending}
                >
                  <Ionicons name="videocam" size={24} color="#0084ff" />
                </TouchableOpacity>
                {/* 📎 Document (PDF, Word) */}
                <TouchableOpacity
                  onPress={pickDocument}
                  className="w-9 h-9 items-center justify-center"
                  disabled={sendMessageMutation.isPending}
                >
                  <Ionicons name="document-attach" size={22} color="#0084ff" />
                </TouchableOpacity>
                {/* Sticker */}
                <TouchableOpacity
                  onPress={() => setIsStickerPickerOpen(true)}
                  className="w-9 h-9 items-center justify-center"
                  disabled={sendMessageMutation.isPending}
                >
                  <Text style={{ fontSize: 22 }}>😊</Text>
                </TouchableOpacity>
              </View>

              {/* Text Input */}
              <View className="flex-1 flex-row items-end bg-gray-100 rounded-3xl px-4 py-2 mx-2">
                <TextInput
                  className="flex-1 text-base max-h-24 py-1"
                  placeholder="Aa"
                  placeholderTextColor="#9ca3af"
                  value={newMessage}
                  onChangeText={setNewMessage}
                  multiline
                />
              </View>

              {/* Send or Like button */}
              {(newMessage.trim() || selectedFile) ? (
                <TouchableOpacity
                  onPress={sendMessage}
                  disabled={sendMessageMutation.isPending}
                  className="w-10 h-10 bg-blue-500 rounded-full items-center justify-center mb-0.5"
                  style={{
                    shadowColor: "#0084ff",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                  }}
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

            {/* Connection Status */}
            {!isConnected && (
              <View className="px-4 py-2 bg-yellow-50">
                <Text className="text-yellow-800 text-xs text-center">
                  Mất kết nối. Đang kết nối lại...
                </Text>
              </View>
            )}

            {/* 🎨 Sticker Picker Modal */}
            <StickerPicker
              visible={isStickerPickerOpen}
              onClose={() => setIsStickerPickerOpen(false)}
              onSelectSticker={sendSticker}
            />
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

      {/* ✏️ Edit Message Modal */}
      <Modal
        visible={isEditModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setIsEditModalOpen(false);
          setSelectedMessage(null);
          setEditMessageText("");
        }}
      >
        <View className="flex-1 bg-black/50 justify-center px-4">
          <View className="bg-white rounded-2xl p-4">
            <Text className="text-lg font-bold text-gray-800 mb-3">
              ✏️ Chỉnh sửa tin nhắn
            </Text>
            <TextInput
              value={editMessageText}
              onChangeText={setEditMessageText}
              multiline
              className="border border-gray-200 rounded-xl p-3 text-gray-800 min-h-[100px]"
              placeholder="Nhập nội dung mới..."
              placeholderTextColor="#9ca3af"
              autoFocus
            />
            <View className="flex-row justify-end mt-4 gap-2">
              <TouchableOpacity
                onPress={() => {
                  setIsEditModalOpen(false);
                  setSelectedMessage(null);
                  setEditMessageText("");
                }}
                className="px-4 py-2 rounded-full bg-gray-100"
              >
                <Text className="text-gray-600 font-medium">Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSubmitEdit}
                disabled={!editMessageText.trim() || editMessageMutation.isPending}
                className={`px-4 py-2 rounded-full ${editMessageText.trim() ? "bg-blue-500" : "bg-gray-200"}`}
              >
                <Text className={`font-medium ${editMessageText.trim() ? "text-white" : "text-gray-400"}`}>
                  {editMessageMutation.isPending ? "Đang lưu..." : "Lưu"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default MessagesScreen;

