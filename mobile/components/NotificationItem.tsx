import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { Notification } from "../types";
import { useAuth } from "@clerk/clerk-expo";
import { useFollow } from "../hooks/useFollow";
import { useState } from "react";
import { useRouter } from "expo-router"; // ✅ Import router để chuyển trang

interface NotificationItemProps {
  notification: Notification;
  currentUser: any;
}

export const NotificationItem = ({
  notification,
  currentUser,
}: NotificationItemProps) => {
  const router = useRouter(); // ✅ Khởi tạo router
  const { toggleFollow } = useFollow();

  // Kiểm tra xem mình đã follow người này chưa
  const [isFollowing, setIsFollowing] = useState(
    currentUser?.following?.some(
      (id: any) =>
        (typeof id === "string" ? id : id._id) === notification.from._id
    ) || false
  );

  const handleFollowBack = async () => {
    await toggleFollow(notification.from._id);
    setIsFollowing(!isFollowing);
  };

  // 🚀 HÀM XỬ LÝ KHI ẤN VÀO THÔNG BÁO
  const handlePressNotification = () => {
    if (notification.type === "follow") {
      // ✅ Nếu là follow -> Đến trang cá nhân của họ
      // (Bạn nhớ kiểm tra file folder app/user/[id].tsx hay app/profile/[id].tsx để điền đúng nhé)
      router.push(`/user/${notification.from._id}`);
    } else if (notification.post) {
      // ✅ Nếu là like/comment -> Đến chi tiết bài viết
      router.push(`/post/${notification.post?._id}` as any);
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePressNotification} // 👈 Gắn sự kiện bấm vào toàn bộ dòng thông báo
      activeOpacity={0.7}
    >
      {/* Avatar người gửi */}
      <TouchableOpacity
        onPress={() => router.push(`/user/${notification.from._id}`)}
      >
        <Image
          source={{
            uri:
              notification.from.profilePicture || "https://i.pravatar.cc/150",
          }}
          style={styles.avatar}
        />
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.text}>
          <Text
            style={styles.username}
            onPress={() => router.push(`/user/${notification.from._id}`)}
          >
            {notification.from.username}
          </Text>
          <Text>
            {notification.type === "follow" && " đã bắt đầu theo dõi bạn."}
            {notification.type === "like" && " đã thích bài viết của bạn."}
            {notification.type === "comment" &&
              " đã bình luận về bài viết của bạn."}
          </Text>
        </Text>
        <Text style={styles.time}>
          {new Date(notification.createdAt).toLocaleDateString()}
        </Text>
      </View>

      {/* Nút Follow Back (Chỉ hiện khi loại là follow và chưa follow lại) */}
      {notification.type === "follow" ? (
        !isFollowing ? (
          <TouchableOpacity
            style={styles.followButton}
            onPress={(e) => {
              // Chặn sự kiện nổi bọt để không bị nhảy trang khi bấm nút follow
              e.stopPropagation();
              handleFollowBack();
            }}
          >
            <Text style={styles.followButtonText}>Follow lại</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.followingBadge}>
            <Text style={styles.followingText}>Bạn bè</Text>
          </View>
        )
      ) : (
        // Nếu là like/comment thì hiện ảnh bài viết nhỏ bên phải
        notification.post?.image && (
          <Image
            source={{ uri: notification.post.image }}
            style={styles.postImage}
          />
        )
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderColor: "#f0f0f0",
    backgroundColor: "white",
  },
  avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  content: { flex: 1, marginRight: 8 },
  text: { fontSize: 14, color: "#333", lineHeight: 20 },
  username: { fontWeight: "bold", color: "#000" },
  time: { fontSize: 12, color: "gray", marginTop: 4 },

  // Style nút Follow Back
  followButton: {
    backgroundColor: "#007bff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  followButtonText: { color: "white", fontWeight: "600", fontSize: 12 },

  followingBadge: {
    backgroundColor: "#e0e0e0",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  followingText: { color: "black", fontSize: 12, fontWeight: "500" },

  postImage: {
    width: 44,
    height: 44,
    borderRadius: 6,
    marginLeft: 4,
    backgroundColor: "#eee",
  },
});
