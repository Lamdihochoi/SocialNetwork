import { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Image,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface EditProfileModalProps {
  isVisible: boolean;
  onClose: () => void;
  formData: {
    firstName: string;
    lastName: string;
    bio: string;
    location: string;
  };
  saveProfile: (extraData?: { profilePicture?: string; bannerImage?: string }) => void;
  updateFormField: (field: string, value: string) => void;
  isUpdating: boolean;
}

const EditProfileModal = ({
  formData,
  isUpdating,
  isVisible,
  onClose,
  saveProfile,
  updateFormField,
}: EditProfileModalProps) => {
  const { currentUser } = useCurrentUser();
  
  // Local state for picked images (preview)
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [bannerImage, setBannerImage] = useState<string | null>(null);

  // Pick profile picture
  const pickProfileImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Cần quyền truy cập", "Vui lòng cho phép truy cập thư viện ảnh");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setProfileImage(result.assets[0].uri);
    }
  };

  // Pick banner image
  const pickBannerImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Cần quyền truy cập", "Vui lòng cho phép truy cập thư viện ảnh");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setBannerImage(result.assets[0].uri);
    }
  };

  const handleSave = () => {
    // Pass picked images to save function
    const extraData: { profilePicture?: string; bannerImage?: string } = {};
    if (profileImage) extraData.profilePicture = profileImage;
    if (bannerImage) extraData.bannerImage = bannerImage;
    
    saveProfile(Object.keys(extraData).length > 0 ? extraData : undefined);
  };

  const handleClose = () => {
    setProfileImage(null);
    setBannerImage(null);
    onClose();
  };

  // Get current images
  const displayProfilePic = profileImage || currentUser?.profilePicture || "https://placehold.co/150x150?text=Avatar";
  const displayBannerPic = bannerImage || currentUser?.bannerImage || "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=400&fit=crop";

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
        <TouchableOpacity onPress={handleClose}>
          <Text className="text-blue-500 text-lg">Hủy</Text>
        </TouchableOpacity>

        <Text className="text-lg font-semibold">Chỉnh sửa hồ sơ</Text>

        <TouchableOpacity
          onPress={handleSave}
          disabled={isUpdating}
          className={`${isUpdating ? "opacity-50" : ""}`}
        >
          {isUpdating ? (
            <ActivityIndicator size="small" color="#1DA1F2" />
          ) : (
            <Text className="text-blue-500 text-lg font-semibold">Lưu</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1">
        {/* Banner Image */}
        <TouchableOpacity onPress={pickBannerImage} activeOpacity={0.8}>
          <Image
            source={{ uri: displayBannerPic }}
            className="w-full h-32"
            resizeMode="cover"
          />
          <View className="absolute inset-0 bg-black/30 items-center justify-center">
            <View className="bg-white/80 p-2 rounded-full">
              <Feather name="camera" size={24} color="#333" />
            </View>
            <Text className="text-white text-sm mt-1">Đổi ảnh bìa</Text>
          </View>
        </TouchableOpacity>

        {/* Profile Picture */}
        <View className="px-4 -mt-12 mb-4">
          <TouchableOpacity onPress={pickProfileImage} activeOpacity={0.8}>
            <View className="relative">
              <Image
                source={{ uri: displayProfilePic }}
                className="w-24 h-24 rounded-full border-4 border-white"
              />
              <View className="absolute inset-0 rounded-full bg-black/30 items-center justify-center">
                <Feather name="camera" size={20} color="white" />
              </View>
            </View>
            <Text className="text-blue-500 text-sm mt-1">Đổi ảnh đại diện</Text>
          </TouchableOpacity>
        </View>

        {/* Form Fields */}
        <View className="px-4 space-y-4">
          <View>
            <Text className="text-gray-500 text-sm mb-2">Tên</Text>
            <TextInput
              className="border border-gray-200 rounded-lg p-3 text-base"
              value={formData.firstName}
              onChangeText={(text) => updateFormField("firstName", text)}
              placeholder="Tên của bạn"
            />
          </View>

          <View>
            <Text className="text-gray-500 text-sm mb-2">Họ</Text>
            <TextInput
              className="border border-gray-200 rounded-lg px-3 py-3 text-base"
              value={formData.lastName}
              onChangeText={(text) => updateFormField("lastName", text)}
              placeholder="Họ của bạn"
            />
          </View>

          <View>
            <Text className="text-gray-500 text-sm mb-2">Tiểu sử</Text>
            <TextInput
              className="border border-gray-200 rounded-lg px-3 py-3 text-base"
              value={formData.bio}
              onChangeText={(text) => updateFormField("bio", text)}
              placeholder="Giới thiệu về bản thân"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <View>
            <Text className="text-gray-500 text-sm mb-2">Vị trí</Text>
            <TextInput
              className="border border-gray-200 rounded-lg px-3 py-3 text-base"
              value={formData.location}
              onChangeText={(text) => updateFormField("location", text)}
              placeholder="Bạn đang ở đâu?"
            />
          </View>
        </View>
      </ScrollView>
    </Modal>
  );
};

export default EditProfileModal;
