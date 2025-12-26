import { Feather } from "@expo/vector-icons";
import {
  View,
  TextInput,
  ScrollView,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useApiClient, postApi, userApi } from "@/utils/api";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { usePosts } from "@/hooks/usePosts";
import { useFollow } from "@/hooks/useFollow";
import { Post, User } from "@/types";
import PostCard from "@/components/PostCard";
import CommentsModal from "@/components/CommentsModal";
import { useRouter } from "expo-router";

const SearchScreen = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const api = useApiClient();
  const router = useRouter();
  const { currentUser } = useCurrentUser();
  const { toggleLike, deletePost, checkIsLiked, onUserFollowToggle } = usePosts();
  const { toggleFollow } = useFollow();
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  const {
    data: searchResults,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["search", searchQuery],
    queryFn: () => postApi.searchPosts(api, searchQuery),
    enabled: searchQuery.trim().length > 0,
    select: (response) => response.data,
  });

  const searchType = searchResults?.type || "posts";
  const results = searchResults?.results || [];
  const selectedPost =
    searchType === "posts" && selectedPostId
      ? (results as Post[]).find((p: Post) => p._id === selectedPostId) || null
      : null;

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" />
      
      {/* Modern Header */}
      <View className="bg-white px-4 py-3" style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
      }}>
        <View className="flex-row items-center bg-gray-100 rounded-2xl px-4 py-3">
          <View className="w-8 h-8 bg-blue-500 rounded-full items-center justify-center mr-3">
            <Feather name="search" size={16} color="white" />
          </View>
          <TextInput
            placeholder="Tìm kiếm bài viết hoặc @người dùng"
            className="flex-1 text-base text-gray-800"
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Feather name="x" size={20} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingTop: 8 }}>
        {!searchQuery.trim() ? (
          <View className="items-center justify-center p-12">
            <View className="w-20 h-20 bg-blue-100 rounded-full items-center justify-center mb-4">
              <Feather name="search" size={36} color="#3b82f6" />
            </View>
            <Text className="text-xl font-bold text-gray-900 mb-2">
              Khám phá
            </Text>
            <Text className="text-gray-400 text-center mb-4">
              Tìm kiếm bài viết theo nội dung
            </Text>
            <View className="bg-gray-100 px-4 py-2 rounded-full">
              <Text className="text-gray-500 text-sm">
                Gõ @tên để tìm người (VD: @lamdinh)
              </Text>
            </View>
          </View>
        ) : isLoading ? (
          <View className="p-12 items-center">
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text className="text-gray-400 mt-4">Đang tìm kiếm...</Text>
          </View>
        ) : error ? (
          <View className="p-12 items-center">
            <View className="w-16 h-16 bg-red-100 rounded-full items-center justify-center mb-4">
              <Feather name="alert-circle" size={32} color="#ef4444" />
            </View>
            <Text className="text-gray-700 font-medium mb-2">Không thể tìm kiếm</Text>
            <TouchableOpacity 
              className="bg-blue-500 px-6 py-2 rounded-full"
              onPress={() => refetch()}
            >
              <Text className="text-white font-medium">Thử lại</Text>
            </TouchableOpacity>
          </View>
        ) : results.length === 0 ? (
          <View className="p-12 items-center">
            <View className="w-16 h-16 bg-gray-100 rounded-full items-center justify-center mb-4">
              <Feather name="inbox" size={32} color="#9ca3af" />
            </View>
            <Text className="text-gray-700 font-medium mb-1">
              {searchType === "users"
                ? "Không tìm thấy người dùng"
                : "Không tìm thấy bài viết"}
            </Text>
            <Text className="text-gray-400 text-sm">
              Thử tìm kiếm với từ khóa khác
            </Text>
          </View>
        ) : searchType === "users" ? (
          <View className="mx-3">
            {results.map((user: User) => {
              const isFollowing = user.isFollowing || false;
              return (
                <TouchableOpacity
                  key={user._id}
                  className="flex-row items-center p-4 bg-white rounded-2xl mb-2"
                  style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 8,
                    elevation: 2,
                  }}
                  onPress={() => router.push(`/user/${user._id}`)}
                >
                  <View className="relative">
                    <Image
                      source={{
                        uri: user.profilePicture || "https://placehold.co/100x100?text=User",
                      }}
                      className="w-14 h-14 rounded-full"
                    />
                    <View className="absolute bottom-0 right-0 w-4 h-4 bg-green-400 rounded-full border-2 border-white" />
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
                  {currentUser?._id !== user._id && (
                    <TouchableOpacity
                      onPress={async (e) => {
                        e.stopPropagation();
                        await toggleFollow(user._id);
                        refetch();
                      }}
                      className={`px-5 py-2 rounded-full ${
                        isFollowing ? "bg-gray-100" : "bg-blue-500"
                      }`}
                    >
                      <Text
                        className={`font-semibold text-sm ${
                          isFollowing ? "text-gray-700" : "text-white"
                        }`}
                      >
                        {isFollowing ? "Đang theo" : "Theo dõi"}
                      </Text>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <>
            {results.map((post: Post) => (
              <PostCard
                key={post._id}
                post={post}
                onLike={toggleLike}
                onDelete={deletePost}
                onComment={(post: Post) => setSelectedPostId(post._id)}
                currentUser={currentUser}
                isLiked={checkIsLiked(post.likes, currentUser)}
              />
            ))}
          </>
        )}
      </ScrollView>

      <CommentsModal
        selectedPost={selectedPost}
        onClose={() => setSelectedPostId(null)}
      />
    </SafeAreaView>
  );
};

export default SearchScreen;
