import { useCreatePost } from "@/hooks/useCreatePost";
import { useUser } from "@clerk/clerk-expo";
import { Feather } from "@expo/vector-icons";
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";

const PostComposer = () => {
  const {
    content,
    setContent,
    selectedImage,
    isCreating,
    pickImageFromGallery,
    takePhoto,
    removeImage,
    createPost,
  } = useCreatePost();

  const { user } = useUser();

  return (
    <View className="mx-3 my-2 bg-white rounded-2xl p-4" style={{
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 10,
      elevation: 2,
    }}>
      <View className="flex-row">
        <View className="relative">
          <Image
            source={{ uri: user?.imageUrl || "https://placehold.co/100x100?text=User" }}
            className="w-11 h-11 rounded-full"
            style={{ borderWidth: 2, borderColor: "#e0e7ff" }}
          />
        </View>
        <View className="flex-1 ml-3">
          <TextInput
            className="text-gray-800 text-base min-h-[44px]"
            placeholder="Bạn đang nghĩ gì?"
            placeholderTextColor="#9ca3af"
            multiline
            value={content}
            onChangeText={setContent}
            maxLength={280}
            style={{ paddingTop: 8 }}
          />
        </View>
      </View>

      {selectedImage && (
        <View className="mt-3 ml-14">
          <View className="relative">
            <Image
              source={{ uri: selectedImage }}
              className="w-full h-52 rounded-2xl"
              resizeMode="cover"
            />
            <TouchableOpacity
              className="absolute top-3 right-3 w-8 h-8 bg-black/60 rounded-full items-center justify-center"
              onPress={removeImage}
            >
              <Feather name="x" size={16} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View className="h-px bg-gray-100 my-3 ml-14" />

      <View className="flex-row justify-between items-center ml-14">
        <View className="flex-row">
          <TouchableOpacity 
            className="w-10 h-10 bg-blue-50 rounded-full items-center justify-center mr-2" 
            onPress={pickImageFromGallery}
          >
            <Feather name="image" size={18} color="#3b82f6" />
          </TouchableOpacity>
          <TouchableOpacity 
            className="w-10 h-10 bg-purple-50 rounded-full items-center justify-center mr-2" 
            onPress={takePhoto}
          >
            <Feather name="camera" size={18} color="#a855f7" />
          </TouchableOpacity>
          <TouchableOpacity className="w-10 h-10 bg-pink-50 rounded-full items-center justify-center">
            <Feather name="smile" size={18} color="#ec4899" />
          </TouchableOpacity>
        </View>

        <View className="flex-row items-center">
          {content.length > 0 && (
            <View className="mr-3">
              <Text
                className={`text-sm font-medium ${content.length > 260 ? "text-red-500" : "text-gray-400"}`}
              >
                {280 - content.length}
              </Text>
            </View>
          )}

          <TouchableOpacity
            className={`px-5 py-2.5 rounded-full ${
              content.trim() || selectedImage 
                ? "bg-gradient-to-r" 
                : "bg-gray-200"
            }`}
            style={{
              backgroundColor: content.trim() || selectedImage ? "#3b82f6" : "#e5e7eb",
            }}
            onPress={createPost}
            disabled={isCreating || !(content.trim() || selectedImage)}
          >
            {isCreating ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text
                className={`font-semibold ${
                  content.trim() || selectedImage
                    ? "text-white"
                    : "text-gray-400"
                }`}
              >
                Đăng
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default PostComposer;
