import { View, Text, Modal, TouchableOpacity, Image, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useApiClient, userApi } from "@/utils/api";
import { useRouter } from "expo-router";
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

  const {
    data: usersData,
    isLoading,
    error,
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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-white">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
          <TouchableOpacity onPress={onClose} className="mr-3">
            <Feather name="arrow-left" size={24} color="#1DA1F2" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900">{title}</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Content */}
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#1DA1F2" />
            <Text className="text-gray-500 mt-2">Loading...</Text>
          </View>
        ) : error ? (
          <View className="flex-1 items-center justify-center">
            <Text className="text-gray-500">Failed to load {type}</Text>
          </View>
        ) : users.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <Text className="text-gray-500">No {type} yet</Text>
          </View>
        ) : (
          <ScrollView className="flex-1">
            {users.map((user: User) => (
              <TouchableOpacity
                key={user._id}
                className="flex-row items-center p-4 border-b border-gray-50 active:bg-gray-50"
                onPress={() => handleUserPress(user)}
              >
                <Image
                  source={{
                    uri:
                      user.profilePicture ||
                      "https://placehold.co/100x100?text=User",
                  }}
                  className="w-12 h-12 rounded-full mr-3"
                />
                <View className="flex-1">
                  <Text className="font-semibold text-gray-900">
                    {user.firstName} {user.lastName}
                  </Text>
                  <Text className="text-gray-500 text-sm">
                    @{user.username}
                  </Text>
                </View>
                <Feather name="chevron-right" size={20} color="#657786" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

