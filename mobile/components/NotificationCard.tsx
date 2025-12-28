import { Notification } from "@/types";
import { formatDate } from "@/utils/formatters";
import { Feather, Ionicons } from "@expo/vector-icons";
import { View, Text, Alert, Image, TouchableOpacity } from "react-native";
import { memo } from "react";

interface NotificationCardProps {
  notification: Notification;
  onDelete: (notificationId: string) => void;
  onPress: (notification: Notification) => void;
}

const NotificationCard = ({
  notification,
  onDelete,
  onPress,
}: NotificationCardProps) => {
  const getNotificationText = () => {
    const name = `${notification.from.firstName} ${notification.from.lastName}`;
    switch (notification.type) {
      case "like":
        return `đã thích bài viết của bạn`;
      case "comment":
        return `đã bình luận về bài viết của bạn`;
      case "follow":
        return `đã bắt đầu theo dõi bạn`;
      default:
        return "";
    }
  };

  const getNotificationIcon = () => {
    switch (notification.type) {
      case "like":
        return (
          <View className="w-7 h-7 bg-red-500 rounded-full items-center justify-center">
            <Ionicons name="heart" size={16} color="white" />
          </View>
        );
      case "comment":
        return (
          <View className="w-7 h-7 bg-blue-500 rounded-full items-center justify-center">
            <Ionicons name="chatbubble" size={14} color="white" />
          </View>
        );
      case "follow":
        return (
          <View className="w-7 h-7 bg-green-500 rounded-full items-center justify-center">
            <Ionicons name="person-add" size={14} color="white" />
          </View>
        );
      default:
        return (
          <View className="w-7 h-7 bg-gray-400 rounded-full items-center justify-center">
            <Ionicons name="notifications" size={14} color="white" />
          </View>
        );
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Xóa thông báo",
      "Bạn có chắc muốn xóa thông báo này?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: () => onDelete(notification._id),
        },
      ]
    );
  };

  return (
    <TouchableOpacity 
      activeOpacity={0.7}
      onPress={() => onPress(notification)}
      className={`${!notification.isRead ? "bg-blue-50" : "bg-white"}`}
    >
      <View className="flex-row p-4">
        {/* Avatar với icon loại thông báo */}
        <View className="relative mr-3">
          <Image
            source={{ 
              uri: notification.from.profilePicture || "https://placehold.co/100x100?text=User" 
            }}
            className="w-14 h-14 rounded-full"
          />
          {/* Icon loại thông báo */}
          <View className="absolute -bottom-1 -right-1">
            {getNotificationIcon()}
          </View>
        </View>

        {/* Nội dung thông báo */}
        <View className="flex-1">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-2">
              {/* Text chính */}
              <Text className="text-gray-900 text-[15px] leading-5 mb-1">
                <Text className="font-bold">
                  {notification.from.firstName} {notification.from.lastName}
                </Text>
                <Text className={!notification.isRead ? "font-medium" : ""}>
                  {" "}{getNotificationText()}
                </Text>
              </Text>

              {/* Thời gian */}
              <View className="flex-row items-center">
                <Text className="text-gray-400 text-xs">
                  {formatDate(notification.createdAt)}
                </Text>
                {!notification.isRead && (
                  <View className="w-2 h-2 bg-blue-500 rounded-full ml-2" />
                )}
              </View>
            </View>

            {/* Nút xóa */}
            <TouchableOpacity 
              className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center" 
              onPress={handleDelete}
            >
              <Feather name="x" size={14} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          {/* Preview bài viết nếu có */}
          {notification.post && (
            <View className="mt-2 bg-gray-50 rounded-xl p-3 border border-gray-100">
              <Text className="text-gray-600 text-sm" numberOfLines={2}>
                {notification.post.content}
              </Text>
              {notification.post.image && (
                <Image
                  source={{ uri: notification.post.image }}
                  className="w-full h-24 rounded-lg mt-2"
                  resizeMode="cover"
                />
              )}
            </View>
          )}

          {/* Preview bình luận nếu có */}
          {notification.comment && (
            <View className="mt-2 bg-blue-50 rounded-xl p-3 border border-blue-100">
              <View className="flex-row items-center mb-1">
                <Ionicons name="chatbubble" size={12} color="#3b82f6" />
                <Text className="text-blue-500 text-xs font-medium ml-1">Bình luận</Text>
              </View>
              <Text className="text-gray-700 text-sm italic" numberOfLines={2}>
                "{notification.comment.content}"
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ⚡ PERFORMANCE: Wrap with React.memo
export default memo(NotificationCard);
