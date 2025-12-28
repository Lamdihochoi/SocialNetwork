import { useState } from "react";
import { useAuth } from "@clerk/clerk-expo";
import * as ImagePicker from "expo-image-picker";
import { createApiClient } from "../utils/api";
import { Alert } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "./useCurrentUser";

export const useCreatePost = () => {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const { currentUser } = useCurrentUser();
  const [content, setContent] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const pickImageFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });
    if (!result.canceled) setSelectedImage(result.assets[0].uri);
  };

  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });
    if (!result.canceled) setSelectedImage(result.assets[0].uri);
  };

  const removeImage = () => setSelectedImage(null);

  const createPost = async () => {
    if (!content.trim() && !selectedImage) return;

    const postContent = content;
    const postImage = selectedImage;
    
    // ⚡ OPTIMISTIC: Clear input IMMEDIATELY for instant feedback
    setContent("");
    setSelectedImage(null);
    setIsCreating(true);

    // ⚡ OPTIMISTIC: Add post to feed IMMEDIATELY
    const optimisticPost = {
      _id: `temp_${Date.now()}`,
      content: postContent,
      image: postImage, // Local image URI - will show instantly
      user: {
        _id: currentUser?._id,
        username: currentUser?.username,
        firstName: currentUser?.firstName,
        lastName: currentUser?.lastName,
        profilePicture: currentUser?.profilePicture,
        clerkId: currentUser?.clerkId,
      },
      likes: [],
      comments: [],
      createdAt: new Date().toISOString(),
      isOptimistic: true,
    };

    // Add optimistic post to cache
    queryClient.setQueryData(["posts"], (old: any) => {
      if (!old) return old;
      const posts = old?.data ? old.data : (Array.isArray(old) ? old : []);
      const newPosts = [optimisticPost, ...posts];
      return old?.data ? { ...old, data: newPosts } : newPosts;
    });

    try {
      const api = createApiClient(getToken);
      api.defaults.timeout = 60000;
      
      const formData = new FormData();
      formData.append("content", postContent);

      if (postImage) {
        const fileName = postImage.split("/").pop()!;
        const fileType = fileName.split(".").pop() || "jpeg";
        formData.append("image", {
          uri: postImage,
          type: `image/${fileType}`,
          name: fileName,
        } as any);
      }

      const res = await api.post("/posts", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 60000,
      });

      // ⚡ Replace optimistic post with real one
      queryClient.setQueryData(["posts"], (old: any) => {
        if (!old) return old;
        const posts = old?.data ? old.data : (Array.isArray(old) ? old : []);
        const newPosts = posts.map((p: any) => 
          p.isOptimistic ? { ...res.data.post, user: optimisticPost.user } : p
        );
        return old?.data ? { ...old, data: newPosts } : newPosts;
      });

      return res.data.post;
    } catch (err: any) {
      console.error("Create post error:", err.response?.data || err.message);
      
      // ⚡ Remove optimistic post on error
      queryClient.setQueryData(["posts"], (old: any) => {
        if (!old) return old;
        const posts = old?.data ? old.data : (Array.isArray(old) ? old : []);
        const newPosts = posts.filter((p: any) => !p.isOptimistic);
        return old?.data ? { ...old, data: newPosts } : newPosts;
      });
      
      if (err.message === "Network Error") {
        Alert.alert(
          "Lỗi kết nối", 
          "Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng và thử lại."
        );
      } else if (err.response?.status === 429) {
        Alert.alert(
          "Quá nhiều yêu cầu",
          "Bạn đang gửi quá nhiều yêu cầu. Vui lòng đợi một chút rồi thử lại."
        );
      } else {
        Alert.alert(
          "Lỗi",
          err.response?.data?.error || "Không thể đăng bài viết. Vui lòng thử lại."
        );
      }
      
      throw err;
    } finally {
      setIsCreating(false);
    }
  };

  return {
    content,
    setContent,
    selectedImage,
    isCreating,
    pickImageFromGallery,
    takePhoto,
    removeImage,
    createPost,
  };
};
