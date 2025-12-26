import { useApiClient } from "@/utils/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useCurrentUser } from "./useCurrentUser";
import { Alert } from "react-native";
import axios from "axios";

export const useProfile = () => {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    bio: "",
    location: "",
  });

  const { currentUser } = useCurrentUser();

  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: {
      firstName?: string;
      lastName?: string;
      bio?: string;
      location?: string;
      profilePicture?: string;
      bannerImage?: string;
    }) => {
      // If there are images, need to use FormData
      if (profileData.profilePicture || profileData.bannerImage) {
        const formDataObj = new FormData();
        
        // Add text fields
        if (profileData.firstName) formDataObj.append("firstName", profileData.firstName);
        if (profileData.lastName) formDataObj.append("lastName", profileData.lastName);
        if (profileData.bio) formDataObj.append("bio", profileData.bio);
        if (profileData.location) formDataObj.append("location", profileData.location);

        // Add profile picture
        if (profileData.profilePicture) {
          const uri = profileData.profilePicture;
          const filename = uri.split("/").pop() || "profile.jpg";
          const match = /\.(\w+)$/.exec(filename);
          const type = match ? `image/${match[1]}` : "image/jpeg";
          
          formDataObj.append("profilePicture", {
            uri,
            name: filename,
            type,
          } as any);
        }

        // Add banner image
        if (profileData.bannerImage) {
          const uri = profileData.bannerImage;
          const filename = uri.split("/").pop() || "banner.jpg";
          const match = /\.(\w+)$/.exec(filename);
          const type = match ? `image/${match[1]}` : "image/jpeg";
          
          formDataObj.append("bannerImage", {
            uri,
            name: filename,
            type,
          } as any);
        }

        return api.put("/users/profile", formDataObj, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        // Normal JSON update
        return api.put("/users/profile", profileData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
      setIsEditModalVisible(false);
      Alert.alert("Thành công", "Đã cập nhật hồ sơ!");
    },
    onError: (error: any) => {
      console.error("Profile update error:", error);
      Alert.alert(
        "Lỗi",
        error.response?.data?.error || "Không thể cập nhật hồ sơ"
      );
    },
  });

  const openEditModal = () => {
    if (currentUser) {
      setFormData({
        firstName: currentUser.firstName || "",
        lastName: currentUser.lastName || "",
        bio: currentUser.bio || "",
        location: currentUser.location || "",
      });
    }
    setIsEditModalVisible(true);
  };

  const updateFormField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Updated saveProfile to accept extra image data
  const saveProfile = (extraData?: { profilePicture?: string; bannerImage?: string }) => {
    updateProfileMutation.mutate({
      ...formData,
      ...extraData,
    });
  };

  return {
    isEditModalVisible,
    formData,
    openEditModal,
    closeEditModal: () => setIsEditModalVisible(false),
    saveProfile,
    updateFormField,
    isUpdating: updateProfileMutation.isPending,
    refetch: () => queryClient.invalidateQueries({ queryKey: ["authUser"] }),
  };
};
