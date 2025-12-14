import { Feather } from "@expo/vector-icons";
import {
  View,
  TextInput,
  ScrollView,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  Image,
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

  // Universal search using useQuery
  const {
    data: searchResults,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["search", searchQuery],
    queryFn: () => postApi.searchPosts(api, searchQuery),
    enabled: searchQuery.trim().length > 0, // Only search when there's a query
    select: (response) => response.data,
  });

  const searchType = searchResults?.type || "posts";
  const results = searchResults?.results || [];
  const selectedPost = selectedPostId
    ? (results as Post[]).find((p: Post) => p._id === selectedPostId)
    : null;

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* HEADER */}
      <View className="px-4 py-3 border-b border-gray-100">
        <View className="flex-row items-center bg-gray-100 rounded-full px-4 py-3">
          <Feather name="search" size={20} color="#657786" />
          <TextInput
            placeholder="Tìm Thông Tin"
            className="flex-1 ml-3 text-base"
            placeholderTextColor="#657786"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <ScrollView className="flex-1">
        {!searchQuery.trim() ? (
          <View className="p-4">
            <Text className="text-xl font-bold text-gray-900 mb-4">
              Tìm Kiếm Thông Tin
            </Text>
            <Text className="text-gray-500 mb-2">
              Nhập từ khóa để tìm kiếm bài viết
            </Text>
            <Text className="text-gray-500">
              Hoặc nhập @username để tìm kiếm người dùng
            </Text>
          </View>
        ) : isLoading ? (
          <View className="p-8 items-center">
            <ActivityIndicator size="large" color="#1DA1F2" />
            <Text className="text-gray-500 mt-2">Đang tìm kiếm...</Text>
          </View>
        ) : error ? (
          <View className="p-8 items-center">
            <Text className="text-gray-500 mb-4">Không thể tìm kiếm</Text>
            <Text className="text-gray-400 text-sm">
              Vui lòng thử lại sau
            </Text>
          </View>
        ) : results.length === 0 ? (
          <View className="p-8 items-center">
            <Text className="text-gray-500">
              {searchType === "users"
                ? "Không tìm thấy người dùng nào"
                : "Không tìm thấy bài viết nào"}
            </Text>
            <Text className="text-gray-400 text-sm mt-2">
              Thử tìm kiếm với từ khóa khác
            </Text>
          </View>
        ) : searchType === "users" ? (
          <>
            {results.map((user: User) => {
              const isFollowing = user.isFollowing || false;
              return (
                <TouchableOpacity
                  key={user._id}
                  className="flex-row items-center p-4 border-b border-gray-100"
                  onPress={() => router.push(`/user/${user._id}`)}
                >
                  <Image
                    source={{
                      uri:
                        user.profilePicture ||
                        "https://placehold.co/100x100?text=User",
                    }}
                    className="w-14 h-14 rounded-full mr-3"
                  />
                  <View className="flex-1">
                    <Text className="font-semibold text-gray-900">
                      {user.firstName} {user.lastName}
                    </Text>
                    <Text className="text-gray-500 text-sm">
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
                      className={`px-4 py-2 rounded-full ${
                        isFollowing ? "bg-gray-200" : "bg-blue-500"
                      }`}
                    >
                      <Text
                        className={`font-semibold text-sm ${
                          isFollowing ? "text-gray-900" : "text-white"
                        }`}
                      >
                        {isFollowing ? "Following" : "Follow"}
                      </Text>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              );
            })}
          </>
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
