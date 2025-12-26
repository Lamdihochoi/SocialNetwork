import { View, Text, Modal, TouchableOpacity, Image, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useApiClient, userApi } from "@/utils/api";
import { useRouter } from "expo-router";
import { useFollow } from "@/hooks/useFollow";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { User } from "@/types";

interface FollowListModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  type: "followers" | "following";
  title: string;
}

export default function FollowListModal({
  visible,
  onClose,
  userId,
  type,
  title,
}: FollowListModalProps) {
  const router = useRouter();
  const api = useApiClient();
  const { toggleFollow, loading: isFollowing } = useFollow();
  const { currentUser } = useCurrentUser();

  const {
    data: usersData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["followList", userId, type],
    queryFn: () => userApi.getFollowList(api, userId, type),
    select: (response) => response.data.users,
    enabled: visible && !!userId,
  });

  const users = usersData || [];

  const handleUserPress = (user: User) => {
    onClose();
    router.push(`/user/${user._id}`);
  };

  const handleFollow = async (targetUserId: string) => {
    await toggleFollow(targetUserId);
    refetch();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-gray-50">
        {/* Modern Header */}
        <View className="bg-white px-4 py-3 flex-row items-center" style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 2,
        }}>
          <TouchableOpacity 
            onPress={onClose} 
            className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center mr-3"
          >
            <Ionicons name="close" size={22} color="#6b7280" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-lg font-bold text-gray-900">{title}</Text>
            <Text className="text-gray-400 text-sm">{users.length} người</Text>
          </View>
        </View>

        {/* Content */}
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text className="text-gray-400 mt-3">Đang tải...</Text>
          </View>
        ) : error ? (
          <View className="flex-1 items-center justify-center p-8">
            <View className="w-16 h-16 bg-red-100 rounded-full items-center justify-center mb-4">
              <Ionicons name="alert-circle-outline" size={32} color="#ef4444" />
            </View>
            <Text className="text-gray-700 font-medium mb-1">Không thể tải danh sách</Text>
            <TouchableOpacity 
              className="mt-4 bg-blue-500 px-6 py-2 rounded-full"
              onPress={() => refetch()}
            >
              <Text className="text-white font-medium">Thử lại</Text>
            </TouchableOpacity>
          </View>
        ) : users.length === 0 ? (
          <View className="flex-1 items-center justify-center p-8">
            <View className="w-16 h-16 bg-gray-100 rounded-full items-center justify-center mb-4">
              <Ionicons name="people-outline" size={32} color="#9ca3af" />
            </View>
            <Text className="text-gray-700 font-medium">
              {type === "followers" ? "Chưa có người theo dõi" : "Chưa theo dõi ai"}
            </Text>
          </View>
        ) : (
          <ScrollView 
            className="flex-1" 
            contentContainerStyle={{ paddingTop: 8, paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
          >
            {users.map((user: User) => {
              const isCurrentUser = currentUser?._id === user._id;
              // Check if current user is following this user by looking at currentUser.following array
              const isUserFollowing = currentUser?.following?.some(
                (f: any) => (typeof f === "string" ? f : f._id) === user._id
              ) || false;
              
              return (
                <TouchableOpacity
                  key={user._id}
                  className="mx-3 mb-2 bg-white rounded-2xl p-4 flex-row items-center"
                  style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.04,
                    shadowRadius: 6,
                    elevation: 1,
                  }}
                  onPress={() => handleUserPress(user)}
                >
                  <View className="relative">
                    <Image
                      source={{
                        uri: user.profilePicture || "https://placehold.co/100x100?text=User",
                      }}
                      className="w-14 h-14 rounded-full"
                    />
                    <View className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white" />
                  </View>
                  
                  <View className="flex-1 ml-3">
                    <View className="flex-row items-center">
                      <Text className="font-bold text-gray-900">
                        {user.firstName} {user.lastName}
                      </Text>
                      <View className="ml-1 bg-blue-500 rounded-full p-0.5">
                        <Feather name="check" size={8} color="white" />
                      </View>
                    </View>
                    <Text className="text-gray-400 text-sm">
                      @{user.username}
                    </Text>
                  </View>

                  {!isCurrentUser && (
                    <TouchableOpacity
                      onPress={() => handleFollow(user._id)}
                      disabled={isFollowing}
                      className={`px-5 py-2 rounded-full ${
                        isUserFollowing ? "bg-gray-100 border border-gray-200" : "bg-blue-500"
                      }`}
                    >
                      <Text className={`font-semibold text-sm ${
                        isUserFollowing ? "text-gray-700" : "text-white"
                      }`}>
                        {isUserFollowing ? "Đang theo" : "Theo dõi"}
                      </Text>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}
