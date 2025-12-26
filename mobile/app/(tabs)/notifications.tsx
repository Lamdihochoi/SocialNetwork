import NoNotificationsFound from "@/components/NoNotificationsFound";
import NotificationCard from "@/components/NotificationCard";
import { useNotifications } from "@/hooks/useNotifications";
import { Notification } from "@/types";
import { Feather } from "@expo/vector-icons";
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

  // Handle notification press
  const handleNotificationPress = (notification: Notification) => {
    // 1. Mark as read immediately
    if (!notification.isRead) {
      markAsRead(notification._id);
      // Optional: Optimistically update UI
      refreshCounts(); // Update badge count
    }

    // 2. Navigate based on type
    if (notification.post) {
      // Navigate to post detail
      router.push(`/post/${notification.post._id}`);
    } else if (notification.type === "follow") {
      // Navigate to user profile
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
          <TouchableOpacity className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center">
            <Feather name="filter" size={18} color="#6b7280" />
          </TouchableOpacity>
        </View>
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
        ) : notifications.length === 0 ? (
          <View className="items-center justify-center p-12">
            <View className="w-20 h-20 bg-gray-100 rounded-full items-center justify-center mb-4">
              <Feather name="bell-off" size={36} color="#9ca3af" />
            </View>
            <Text className="text-gray-700 font-semibold text-lg mb-1">Chưa có thông báo</Text>
            <Text className="text-gray-400 text-center">Khi có người tương tác với bạn, thông báo sẽ hiển thị ở đây</Text>
          </View>
        ) : (
          <View className="mx-3">
            {notifications.map((notification: Notification) => (
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
