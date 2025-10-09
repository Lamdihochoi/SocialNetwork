import { useState } from "react";
import { useAuth } from "@clerk/clerk-expo";
import * as ImagePicker from "expo-image-picker";
import { createApiClient } from "../utils/api";

export const useCreatePost = () => {
  const { getToken } = useAuth();
  const [content, setContent] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const pickImageFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled) setSelectedImage(result.assets[0].uri);
  };

  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled) setSelectedImage(result.assets[0].uri);
  };

  const removeImage = () => setSelectedImage(null);

  const createPost = async () => {
    if (!content.trim() && !selectedImage) return;

    setIsCreating(true);
    try {
      const api = createApiClient(getToken); // ✅ sửa token chính xác
      const formData = new FormData();

      formData.append("content", content);

      if (selectedImage) {
        const fileName = selectedImage.split("/").pop()!;
        const fileType = fileName.split(".").pop();
        formData.append("image", {
          uri: selectedImage,
          type: `image/${fileType}`,
          name: fileName,
        } as any);
      }

      const res = await api.post("/posts", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // reset input sau khi post
      setContent("");
      setSelectedImage(null);
      return res.data.post; // ✅ trả về post mới
    } catch (err: any) {
      console.error("Create post error:", err.response?.data || err.message);
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
