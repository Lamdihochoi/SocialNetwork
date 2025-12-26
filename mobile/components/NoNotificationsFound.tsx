import { Feather } from "@expo/vector-icons";
import { Text, View } from "react-native";

const NoNotificationsFound = () => {
  return (
    <View
      className="flex-1 items-center justify-center px-8"
      style={{ minHeight: 400 }}
    >
      <View className="items-center">
        <Feather name="bell" size={80} color="#E1E8ED" />
        <Text className="text-2xl font-semibold text-gray-500 mt-6 mb-3">
          Chưa có thông báo nào
        </Text>
        <Text className="text-gray-400 text-center text-base leading-6 max-w-xs">
          Khi mọi người thích, bình luận hoặc theo dõi bạn, bạn sẽ thấy ở đây.
        </Text>
      </View>
    </View>
  );
};
export default NoNotificationsFound;
