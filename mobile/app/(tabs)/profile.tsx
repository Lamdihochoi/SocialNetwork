import EditProfileModal from "@/components/EditProfileModal";
import PostsList from "@/components/PostsList";
import SettingsMenu from "@/components/SettingsMenu";
import FollowListModal from "@/components/FollowListModal";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { usePosts } from "@/hooks/usePosts";
import { useProfile } from "@/hooks/useProfile";
import { useBookmarks } from "@/hooks/useBookmarks";
import { Feather, Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  Image,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import PostCard from "@/components/PostCard";
import { useRouter } from "expo-router";

const ProfileScreens = () => {
  const { currentUser, isLoading } = useCurrentUser();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [followModalVisible, setFollowModalVisible] = useState(false);
  const [followModalType, setFollowModalType] = useState<"followers" | "following">("followers");
  const [activeTab, setActiveTab] = useState<"posts" | "saved" | "likes">("posts");

  const {
    posts: userPosts,
    refetch: refetchPosts,
    isLoading: isRefetching,
    toggleLike,
    deletePost,
    checkIsLiked,
  } = usePosts(currentUser?.username);

  const { bookmarks, isLoading: isLoadingBookmarks, toggleBookmark, isBookmarked } = useBookmarks();

  const {
    isEditModalVisible,
    openEditModal,
    closeEditModal,
    formData,
    saveProfile,
    updateFormField,
    isUpdating,
    refetch: refetchProfile,
  } = useProfile();

  if (isLoading || !currentUser) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
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
          <View>
            <Text className="text-xl font-bold text-gray-900">
              {currentUser?.firstName || "User"} {currentUser?.lastName || ""}
            </Text>
            <Text className="text-gray-400 text-sm">
              {userPosts?.length || 0} bài viết
            </Text>
          </View>
          <SettingsMenu />
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              refetchProfile();
              refetchPosts();
            }}
            tintColor="#3b82f6"
            colors={["#3b82f6"]}
          />
        }
      >
        {/* Banner Image */}
        <View className="relative">
          <Image
            source={{
              uri: currentUser?.bannerImage ||
                "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=400&fit=crop",
            }}
            className="w-full h-40"
            resizeMode="cover"
          />
          <View className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        </View>

        {/* Profile Card */}
        <View className="mx-3 -mt-16 bg-white rounded-3xl overflow-hidden" style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 20,
          elevation: 5,
        }}>
          {/* Profile Picture & Edit Button */}
          <View className="flex-row justify-between items-end px-5 -mt-12 pt-16">
            <View className="relative">
              <Image
                source={{ uri: currentUser?.profilePicture || "https://placehold.co/150x150?text=User" }}
                className="w-28 h-28 rounded-full"
                style={{ borderWidth: 4, borderColor: "white" }}
              />
              <View className="absolute bottom-2 right-0 w-7 h-7 bg-green-400 rounded-full border-3 border-white" 
                style={{ borderWidth: 3, borderColor: "white" }} />
            </View>
            <TouchableOpacity
              className="bg-gray-900 px-5 py-2.5 rounded-full mb-2"
              onPress={openEditModal}
            >
              <Text className="font-semibold text-white text-sm">Chỉnh sửa</Text>
            </TouchableOpacity>
          </View>

          {/* User Info */}
          <View className="px-5 py-4">
            <View className="flex-row items-center mb-1">
              <Text className="text-xl font-bold text-gray-900 mr-2">
                {currentUser?.firstName || "User"} {currentUser?.lastName || ""}
              </Text>
              <View className="bg-blue-500 rounded-full p-0.5">
                <Feather name="check" size={12} color="white" />
              </View>
            </View>
            <Text className="text-gray-400 text-sm mb-3">@{currentUser?.username}</Text>
            
            {currentUser?.bio && (
              <Text className="text-gray-700 text-[15px] leading-6 mb-4">{currentUser?.bio}</Text>
            )}

            {/* Meta Info */}
            <View className="flex-row flex-wrap mb-4">
              {currentUser?.location && (
                <View className="flex-row items-center mr-4 mb-2">
                  <View className="w-7 h-7 bg-pink-50 rounded-full items-center justify-center mr-2">
                    <Feather name="map-pin" size={14} color="#ec4899" />
                  </View>
                  <Text className="text-gray-500 text-sm">{currentUser?.location}</Text>
                </View>
              )}
              <View className="flex-row items-center mb-2">
                <View className="w-7 h-7 bg-blue-50 rounded-full items-center justify-center mr-2">
                  <Feather name="calendar" size={14} color="#3b82f6" />
                </View>
                <Text className="text-gray-500 text-sm">
                  Tham gia {currentUser?.createdAt ? format(new Date(currentUser.createdAt), "MM/yyyy") : ""}
                </Text>
              </View>
            </View>

            {/* Stats */}
            <View className="flex-row">
              <TouchableOpacity
                className="flex-row items-center mr-6 bg-gray-50 px-4 py-2 rounded-full"
                onPress={() => {
                  setFollowModalType("following");
                  setFollowModalVisible(true);
                }}
              >
                <Text className="font-bold text-gray-900 text-lg mr-1">
                  {currentUser.followingCount ?? currentUser.following?.length ?? 0}
                </Text>
                <Text className="text-gray-500 text-sm">Đang theo dõi</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-row items-center bg-gray-50 px-4 py-2 rounded-full"
                onPress={() => {
                  setFollowModalType("followers");
                  setFollowModalVisible(true);
                }}
              >
                <Text className="font-bold text-gray-900 text-lg mr-1">
                  {currentUser.followersCount ?? currentUser.followers?.length ?? 0}
                </Text>
                <Text className="text-gray-500 text-sm">Người theo dõi</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Tab for Posts */}
          <View className="flex-row border-b border-gray-100">
            <TouchableOpacity 
              className={`flex-1 py-3 items-center ${activeTab === "posts" ? "border-b-2 border-blue-500" : ""}`}
              onPress={() => setActiveTab("posts")}
            >
              <Text className={activeTab === "posts" ? "font-semibold text-blue-500" : "font-medium text-gray-400"}>
                Bài viết
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              className={`flex-1 py-3 items-center ${activeTab === "saved" ? "border-b-2 border-blue-500" : ""}`}
              onPress={() => setActiveTab("saved")}
            >
              <Text className={activeTab === "saved" ? "font-semibold text-blue-500" : "font-medium text-gray-400"}>
                Đã lưu
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              className={`flex-1 py-3 items-center ${activeTab === "likes" ? "border-b-2 border-blue-500" : ""}`}
              onPress={() => setActiveTab("likes")}
            >
              <Text className={activeTab === "likes" ? "font-semibold text-blue-500" : "font-medium text-gray-400"}>
                Thích
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Content */}
        <View className="mt-2">
          {activeTab === "posts" && (
            <PostsList username={currentUser?.username} />
          )}
          
          {activeTab === "saved" && (
            <>
              {isLoadingBookmarks ? (
                <View className="p-12 items-center">
                  <ActivityIndicator size="large" color="#3b82f6" />
                  <Text className="text-gray-400 mt-4">Đang tải bài viết đã lưu...</Text>
                </View>
              ) : bookmarks.length === 0 ? (
                <View className="p-12 items-center">
                  <View className="w-16 h-16 bg-amber-50 rounded-full items-center justify-center mb-4">
                    <Ionicons name="bookmark-outline" size={28} color="#f59e0b" />
                  </View>
                  <Text className="text-gray-700 font-medium">Chưa lưu bài viết nào</Text>
                  <Text className="text-gray-400 text-sm mt-1">Nhấn biểu tượng bookmark để lưu bài viết</Text>
                </View>
              ) : (
                bookmarks.map((post: any) => (
                  <PostCard
                    key={post._id}
                    post={post}
                    onLike={toggleLike}
                    onDelete={deletePost}
                    onBookmark={toggleBookmark}
                    onComment={() => {}}
                    onPress={(post: any) => router.push(`/post/${post._id}`)}
                    currentUser={currentUser}
                    isLiked={checkIsLiked(post.likes, currentUser)}
                    isBookmarked={true}
                  />
                ))
              )}
            </>
          )}

          {activeTab === "likes" && (
            <View className="p-12 items-center">
              <View className="w-16 h-16 bg-pink-50 rounded-full items-center justify-center mb-4">
                <Ionicons name="heart-outline" size={28} color="#ec4899" />
              </View>
              <Text className="text-gray-700 font-medium">Tính năng đang phát triển</Text>
              <Text className="text-gray-400 text-sm mt-1">Sắp ra mắt!</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <EditProfileModal
        isVisible={isEditModalVisible}
        onClose={closeEditModal}
        formData={formData}
        saveProfile={saveProfile}
        updateFormField={updateFormField}
        isUpdating={isUpdating}
      />

      {currentUser?._id && (
        <FollowListModal
          visible={followModalVisible}
          onClose={() => setFollowModalVisible(false)}
          userId={currentUser._id}
          type={followModalType}
          title={followModalType === "followers" ? "Người theo dõi" : "Đang theo dõi"}
        />
      )}
    </SafeAreaView>
  );
};

export default ProfileScreens;
