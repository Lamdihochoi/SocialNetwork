import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

function UserProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const router = useRouter();
  const api = useApiClient();
  const queryClient = useQueryClient();
  const { currentUser } = useCurrentUser();

  // 🧩 Lấy dữ liệu profile
  const {
    data: user,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["userProfile", username],
    queryFn: async () => {
      const res = await api.get(`/users/profile/${username}`);
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

  const isFollowing = user.followers?.some(
    (f: any) => f._id === currentUser?._id
  );

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
              onPress={() =>
                router.push(
                  `/follows/following?userId=${user._id}&type=following`
                )
              }
            >
              <Text className="text-gray-900">
                <Text className="font-bold">{user.following?.length || 0}</Text>
                <Text className="text-gray-500"> Following</Text>
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() =>
                router.push(
                  `/follows/followers?userId=${user._id}&type=followers`
                )
              }
            >
              <Text className="text-gray-900">
                <Text className="font-bold">{user.followers?.length || 0}</Text>
                <Text className="text-gray-500"> Followers</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default UserProfileScreen;
