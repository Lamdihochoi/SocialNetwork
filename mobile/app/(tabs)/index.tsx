import { View, Text, ScrollView, RefreshControl, StatusBar } from "react-native";
import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useUserSync } from "@/hooks/useUserSync";
import PostComposer from "@/components/PostComposer";
import PostsList from "@/components/PostsList";
import { usePosts } from "@/hooks/usePosts";

const HomeScreen = () => {
  const [isRefetching, setIsRefetching] = useState(false);
  const { refetch } = usePosts();

  const handlePullToRefresh = async () => {
    setIsRefetching(true);
    await refetch();
    setIsRefetching(false);
  };

  useUserSync();

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />
      
      {/* Modern Header */}
      <View className="bg-white px-4 py-3" style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
      }}>
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center">
            <View className="w-10 h-10 bg-gradient-to-br rounded-xl items-center justify-center" 
              style={{ backgroundColor: "#3b82f6" }}>
              <Ionicons name="logo-twitter" size={22} color="white" />
            </View>
            <Text className="text-xl font-bold text-gray-900 ml-3">Bảng tin</Text>
          </View>
          
          <View className="flex-row items-center">
            <View className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center mr-2">
              <Feather name="search" size={20} color="#6b7280" />
            </View>
            <View className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center">
              <Feather name="bell" size={20} color="#6b7280" />
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1 bg-gray-50"
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handlePullToRefresh}
            tintColor={"#3b82f6"}
            colors={["#3b82f6"]}
          />
        }
      >
        <PostComposer />
        <PostsList />
      </ScrollView>
    </SafeAreaView>
  );
};

export default HomeScreen;
