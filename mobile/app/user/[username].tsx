import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useApiClient, userApi } from "@/utils/api";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import PostsList from "@/components/PostsList";
import FollowListModal from "@/components/FollowListModal";

function UserProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const router = useRouter();
  const api = useApiClient();
  const queryClient = useQueryClient();
  const { currentUser } = useCurrentUser();
  const [followModalVisible, setFollowModalVisible] = useState(false);
  const [followModalType, setFollowModalType] = useState<"followers" | "following">("followers");

  // 🧩 Detect if param is ID (24 char hex) or username
  const isId = username && username.length === 24 && /^[0-9a-fA-F]{24}$/.test(username);

  // 🧩 Lấy dữ liệu profile
  const {
    data: user,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["userProfile", username],
    queryFn: async () => {
      // Use ID endpoint if it's an ID, otherwise use username endpoint
      const res = isId
        ? await userApi.getUserById(api, username)
        : await api.get(`/users/profile/${username}`);
      return res.data.user;
    },
    enabled: !!username,
  });

  // 🧩 Follow / Unfollow
  const followMutation = useMutation({
    mutationFn: async (targetUserId: string) =>
      userApi.followUser(api, targetUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userProfile", username] });
      queryClient.invalidateQueries({ queryKey: ["authUser"] }); // ✅ Cập nhật luôn currentUser
    },
  });

  if (isLoading)
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#1DA1F2" />
      </View>
    );

  if (!user)
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-gray-600">User not found</Text>
      </View>
    );

  // Check if current user follows this user
  const isFollowing = user.followers?.some(
    (f: any) => {
      const followerId = typeof f === "string" ? f : f._id;
      return followerId === currentUser?._id;
    }
  );

  // Check if this user follows current user (for mutual follow check)
  const isFollowedBy = user.following?.some(
    (f: any) => {
      const followingId = typeof f === "string" ? f : f._id;
      return followingId === currentUser?._id;
    }
  );

  // Check if mutual follow (both follow each other)
  const isMutualFollow = isFollowing && isFollowedBy;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor="#1DA1F2"
          />
        }
      >
        <Image
          source={{
            uri:
              user.bannerImage ||
              "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=400&fit=crop",
          }}
          className="w-full h-48"
          resizeMode="cover"
        />

        <View className="px-4 -mt-16 mb-4">
          <View className="flex-row justify-between items-end">
            <Image
              source={{
                uri:
                  user.profilePicture ||
                  "https://placehold.co/100x100?text=User",
              }}
              className="w-32 h-32 rounded-full border-4 border-white"
            />

            {currentUser?._id !== user._id && (
              <TouchableOpacity
                onPress={() => followMutation.mutate(user._id)}
                className={`px-6 py-2 rounded-full ${
                  isFollowing ? "bg-gray-200" : "bg-[#1DA1F2]"
                }`}
              >
                <Text
                  className={`font-semibold ${
                    isFollowing ? "text-gray-900" : "text-white"
                  }`}
                >
                  {isFollowing ? "Following" : "Follow"}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View className="mt-3">
            <View className="flex-row items-center mb-1">
              <Text className="text-xl font-bold text-gray-900 mr-1">
                {user.firstName} {user.lastName}
              </Text>
              <Feather name="check-circle" size={18} color="#1DA1F2" />
            </View>
            <Text className="text-gray-500 mb-2">@{user.username}</Text>
            {user.bio ? (
              <Text className="text-gray-900 mb-3">{user.bio}</Text>
            ) : null}
          </View>

          <View className="flex-row mb-3">
            <TouchableOpacity
              className="mr-6"
              onPress={() => {
                setFollowModalType("following");
                setFollowModalVisible(true);
              }}
            >
              <Text className="text-gray-900">
                <Text className="font-bold">{user.following?.length || 0}</Text>
                <Text className="text-gray-500"> Following</Text>
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setFollowModalType("followers");
                setFollowModalVisible(true);
              }}
            >
              <Text className="text-gray-900">
                <Text className="font-bold">{user.followers?.length || 0}</Text>
                <Text className="text-gray-500"> Followers</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ✅ Feature 1: Hiển thị bài viết nếu là Mutual Follow */}
        {isMutualFollow && (
          <View className="mt-4">
            <PostsList username={user.username} />
          </View>
        )}

        {/* Hiển thị thông báo nếu chưa mutual follow */}
        {!isMutualFollow && currentUser?._id !== user._id && (
          <View className="px-4 py-8 items-center">
            <Text className="text-gray-500 text-center">
              Follow each other to see posts
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Followers/Following Modal */}
      {user?._id && (
        <FollowListModal
          visible={followModalVisible}
          onClose={() => setFollowModalVisible(false)}
          userId={user._id}
          type={followModalType}
          title={followModalType === "followers" ? "Followers" : "Following"}
        />
      )}
    </SafeAreaView>
  );
}

export default UserProfileScreen;
