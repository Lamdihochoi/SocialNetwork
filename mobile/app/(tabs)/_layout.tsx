import { Redirect, Tabs } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { View, Text } from "react-native";
import { useUnreadContext } from "@/context/UnreadContext";

const TabsLayout = () => {
  const insets = useSafeAreaInsets();
  const { isSignedIn } = useAuth();
  const { user, isLoaded } = useUser();
  const { unreadMessages, unreadNotifications } = useUnreadContext();

  if (!isLoaded) return null;

  const onboardingComplete = user?.unsafeMetadata?.onboardingComplete === true;

  if (!isSignedIn) {
    return <Redirect href="/(auth)" />;
  }

  if (isSignedIn && !onboardingComplete) {
    return <Redirect href="/(auth)/complete-profile" />;
  }

  // Badge component
  const Badge = ({ count }: { count: number }) => {
    if (count === 0) return null;
    return (
      <View className="absolute -top-1 -right-2 bg-red-500 rounded-full min-w-[18px] h-[18px] items-center justify-center px-1">
        <Text className="text-white text-[10px] font-bold">
          {count > 99 ? "99+" : count}
        </Text>
      </View>
    );
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#3b82f6",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopWidth: 0,
          height: 70 + insets.bottom,
          paddingTop: 10,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 16,
          elevation: 15,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginTop: 4,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Trang chủ",
          tabBarIcon: ({ color, focused }) => (
            <View className={`items-center justify-center ${focused ? "scale-110" : ""}`}>
              <Ionicons 
                name={focused ? "home" : "home-outline"} 
                size={26} 
                color={color} 
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Khám phá",
          tabBarIcon: ({ color, focused }) => (
            <View className={`items-center justify-center ${focused ? "scale-110" : ""}`}>
              <Ionicons 
                name={focused ? "compass" : "compass-outline"} 
                size={26} 
                color={color} 
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Thông báo",
          tabBarIcon: ({ color, focused }) => (
            <View className={`items-center justify-center ${focused ? "scale-110" : ""}`}>
              <Ionicons 
                name={focused ? "notifications" : "notifications-outline"} 
                size={26} 
                color={color} 
              />
              <Badge count={unreadNotifications} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Tin nhắn",
          tabBarIcon: ({ color, focused }) => (
            <View className={`items-center justify-center ${focused ? "scale-110" : ""}`}>
              <Ionicons 
                name={focused ? "chatbubbles" : "chatbubbles-outline"} 
                size={26} 
                color={color} 
              />
              <Badge count={unreadMessages} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Tôi",
          tabBarIcon: ({ color, focused }) => (
            <View className={`items-center justify-center ${focused ? "scale-110" : ""}`}>
              <Ionicons 
                name={focused ? "person-circle" : "person-circle-outline"} 
                size={28} 
                color={color} 
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
};

export default TabsLayout;
