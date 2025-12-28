import NotificationCard from "@/components/NotificationCard";
import { useNotifications } from "@/hooks/useNotifications";
import { Notification } from "@/types";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useState, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useUnreadContext } from "@/context/UnreadContext";
import { useRouter } from "expo-router";

// Filter types
type FilterType = "all" | "unread" | "like" | "comment" | "follow";

const FILTER_OPTIONS: { key: FilterType; label: string; icon: string }[] = [
  { key: "all", label: "Tất cả", icon: "apps" },
  { key: "unread", label: "Chưa đọc", icon: "mail-unread" },
  { key: "like", label: "Lượt thích", icon: "heart" },
  { key: "comment", label: "Bình luận", icon: "chatbubble" },
  { key: "follow", label: "Theo dõi", icon: "person-add" },
];

const NotificationsScreen = () => {
  const {
    notifications,
    isLoading,
    error,
    refetch,
    isRefetching,
    deleteNotification,
    markAsRead,
  } = useNotifications();

  const { unreadNotifications, refreshCounts } = useUnreadContext();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  // Filter state
  const [selectedFilter, setSelectedFilter] = useState<FilterType>("all");

  // Filtered notifications
  const filteredNotifications = useMemo(() => {
    if (!notifications) return [];
    
    switch (selectedFilter) {
      case "unread":
        return notifications.filter((n: Notification) => !n.isRead);
      case "like":
        return notifications.filter((n: Notification) => n.type === "like");
      case "comment":
        return notifications.filter((n: Notification) => n.type === "comment");
      case "follow":
        return notifications.filter((n: Notification) => n.type === "follow");
      default:
        return notifications;
    }
  }, [notifications, selectedFilter]);

  // Get count for each filter
  const getFilterCount = (filter: FilterType): number => {
    if (!notifications) return 0;
    
    switch (filter) {
      case "unread":
        return notifications.filter((n: Notification) => !n.isRead).length;
      case "like":
        return notifications.filter((n: Notification) => n.type === "like").length;
      case "comment":
        return notifications.filter((n: Notification) => n.type === "comment").length;
      case "follow":
        return notifications.filter((n: Notification) => n.type === "follow").length;
      default:
        return notifications.length;
    }
  };

  // Handle notification press
  const handleNotificationPress = (notification: Notification) => {
    // 1. Mark as read - optimistic update will sync across all hooks using same queryKey
    if (!notification.isRead) {
      markAsRead(notification._id);
    }

    // 2. Navigate based on type
    if (notification.post) {
      router.push(`/post/${notification.post._id}`);
    } else if (notification.type === "follow") {
      router.push(`/user/${notification.from._id}`);
    }
  };

  if (error) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center p-8">
        <View className="w-16 h-16 bg-red-100 rounded-full items-center justify-center mb-4">
          <Feather name="alert-circle" size={32} color="#ef4444" />
        </View>
        <Text className="text-gray-700 font-medium mb-2">Không thể tải thông báo</Text>
        <Text className="text-gray-400 text-sm text-center mb-4">Đã xảy ra lỗi khi tải dữ liệu</Text>
        <TouchableOpacity
          className="bg-blue-500 px-6 py-3 rounded-full"
          onPress={() => refetch()}
        >
          <Text className="text-white font-semibold">Thử lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <StatusBar barStyle="dark-content" />
      
      {/* Modern Header */}
      <View className="bg-white px-4 py-3" style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
      }}>
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <View className="w-10 h-10 bg-pink-500 rounded-xl items-center justify-center mr-3">
              <Feather name="bell" size={20} color="white" />
            </View>
            <Text className="text-xl font-bold text-gray-900">Thông báo</Text>
            {unreadNotifications > 0 && (
              <View className="ml-2 bg-red-500 px-2 py-0.5 rounded-full">
                <Text className="text-white text-xs font-bold">{unreadNotifications}</Text>
              </View>
            )}
          </View>
        </View>
        
        {/* Filter Pills */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          className="mt-3 -mx-1"
          contentContainerStyle={{ paddingHorizontal: 4 }}
        >
          {FILTER_OPTIONS.map((filter) => {
            const isSelected = selectedFilter === filter.key;
            const count = getFilterCount(filter.key);
            
            return (
              <TouchableOpacity
                key={filter.key}
                onPress={() => setSelectedFilter(filter.key)}
                className={`flex-row items-center px-3 py-2 rounded-full mr-2 ${
                  isSelected ? "bg-blue-500" : "bg-gray-100"
                }`}
              >
                <Ionicons 
                  name={filter.icon as any} 
                  size={16} 
                  color={isSelected ? "white" : "#6b7280"} 
                />
                <Text 
                  className={`ml-1.5 font-medium text-sm ${
                    isSelected ? "text-white" : "text-gray-600"
                  }`}
                >
                  {filter.label}
                </Text>
                {count > 0 && (
                  <View className={`ml-1.5 px-1.5 py-0.5 rounded-full ${
                    isSelected ? "bg-white/20" : "bg-gray-200"
                  }`}>
                    <Text className={`text-xs font-bold ${
                      isSelected ? "text-white" : "text-gray-500"
                    }`}>
                      {count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 100 + insets.bottom }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={"#3b82f6"}
            colors={["#3b82f6"]}
          />
        }
      >
        {isLoading ? (
          <View className="flex-1 items-center justify-center p-12">
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text className="text-gray-400 mt-4">Đang tải thông báo...</Text>
          </View>
        ) : filteredNotifications.length === 0 ? (
          <View className="items-center justify-center p-12">
            <View className="w-20 h-20 bg-gray-100 rounded-full items-center justify-center mb-4">
              <Feather name="bell-off" size={36} color="#9ca3af" />
            </View>
            <Text className="text-gray-700 font-semibold text-lg mb-1">
              {selectedFilter === "all" ? "Chưa có thông báo" : "Không có thông báo nào"}
            </Text>
            <Text className="text-gray-400 text-center">
              {selectedFilter === "all" 
                ? "Khi có người tương tác với bạn, thông báo sẽ hiển thị ở đây"
                : `Không có thông báo "${FILTER_OPTIONS.find(f => f.key === selectedFilter)?.label}" nào`}
            </Text>
            {selectedFilter !== "all" && (
              <TouchableOpacity 
                onPress={() => setSelectedFilter("all")}
                className="mt-4 px-4 py-2 bg-blue-100 rounded-full"
              >
                <Text className="text-blue-600 font-medium">Xem tất cả</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View className="mx-3">
            {filteredNotifications.map((notification: Notification) => (
              <View 
                key={notification._id} 
                className="bg-white rounded-2xl mb-2 overflow-hidden"
              >
                <NotificationCard
                  notification={notification}
                  onDelete={deleteNotification}
                  onPress={handleNotificationPress}
                />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default NotificationsScreen;
