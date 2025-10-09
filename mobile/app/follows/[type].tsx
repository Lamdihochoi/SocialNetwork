import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { useApiClient, userApi } from "@/utils/api";
import { SafeAreaView } from "react-native-safe-area-context";

export default function FollowListScreen() {
  const { userId, type } = useLocalSearchParams<{
    userId: string;
    type: string;
  }>();
  const router = useRouter();
  const api = useApiClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["followList", userId, type],
    queryFn: () =>
      userApi.getFollowList(api, userId!, type as "followers" | "following"),
    enabled: !!userId && !!type,
    select: (res) => res.data.users,
  });

  if (isLoading)
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#1DA1F2" />
      </View>
    );

  if (error) {
    console.error("Follow list error:", error);
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <Text className="text-red-500">Failed to load follow list.</Text>
      </SafeAreaView>
    );
  }

  if (!data || data.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <Text className="text-gray-500 text-base">
          {type === "followers"
            ? "No followers yet."
            : "Not following anyone yet."}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
        <Text className="text-xl font-bold">
          {type === "followers" ? "Followers" : "Following"}
        </Text>
      </View>

      <FlatList
        data={data}
        keyExtractor={(item) => item._id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            className="flex-row items-center p-4 border-b border-gray-100"
            onPress={() =>
              router.push({
                pathname: "/user/[username]", // ✅ sửa path đúng
                params: { username: item.username },
              })
            }
          >
            <Image
              source={{
                uri: item.profilePicture || "https://placehold.co/100x100",
              }}
              className="w-12 h-12 rounded-full mr-3"
            />
            <View>
              <Text className="font-bold text-gray-900">
                {item.firstName} {item.lastName}
              </Text>
              <Text className="text-gray-500">@{item.username}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}
