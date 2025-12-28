import React, { memo, useMemo } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Pressable,
  Dimensions,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { formatDate } from "@/utils/formatters";
import { decryptMessage } from "@/utils/encryption";
import { Message, User } from "@/types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const MAX_BUBBLE_WIDTH = SCREEN_WIDTH * 0.75;

interface MessageBubbleProps {
  message: Message;
  isFromCurrentUser: boolean;
  isLastSentMessage: boolean;
  otherUser: User;
  onImagePress?: (url: string) => void;
  onDocumentPress?: (url: string) => void;
  onVideoPress?: (url: string) => void;
  onLongPress?: (message: Message) => void;
}

export const MessageBubble = memo<MessageBubbleProps>(
  ({
    message,
    isFromCurrentUser,
    isLastSentMessage,
    otherUser,
    onImagePress,
    onDocumentPress,
    onVideoPress,
    onLongPress,
  }) => {
    // Decrypt message content
    const decryptedContent = useMemo(
      () => decryptMessage(message.content),
      [message.content]
    );

    // Check if message is a sticker
    const isSticker = message.messageType === "sticker" && message.sticker?.emoji;

    // Check seen indicator
    const showSeenIndicator = isLastSentMessage && message.isRead;

    // Check pending state
    const isPending = (message as any).pending;

    // Render sticker message
    if (isSticker) {
      return (
        <View
          className={`flex-row mb-3 ${isFromCurrentUser ? "justify-end" : ""}`}
        >
          {!isFromCurrentUser && (
            <Image
              source={{
                uri:
                  message.sender.profilePicture ||
                  "https://placehold.co/100x100?text=User",
              }}
              className="w-8 h-8 rounded-full mr-2"
            />
          )}
          <View className={`${isFromCurrentUser ? "items-end" : ""}`}>
            <Pressable
              onLongPress={() => onLongPress?.(message)}
              className="p-1"
            >
              <Text style={{ fontSize: 64 }}>{message.sticker?.emoji}</Text>
            </Pressable>
            <View className="flex-row items-center mt-1">
              <Text className="text-xs text-gray-400">
                {formatDate(message.createdAt)}
              </Text>
              {showSeenIndicator && (
                <View className="flex-row items-center ml-2">
                  <Image
                    source={{
                      uri:
                        otherUser?.profilePicture ||
                        "https://placehold.co/100x100?text=User",
                    }}
                    className="w-4 h-4 rounded-full"
                  />
                </View>
              )}
            </View>
          </View>
        </View>
      );
    }

    // Render attachment (image/video/file)
    const renderAttachment = () => {
      if (!message.attachment?.url) return null;

      const { type, url, fileName } = message.attachment;

      // IMAGE
      if (type === "image" || type?.startsWith?.("image")) {
        return (
          <TouchableOpacity
            onPress={() => onImagePress?.(url)}
            activeOpacity={0.9}
            className="mb-2 overflow-hidden rounded-xl"
          >
            <Image
              source={{ uri: url }}
              className="w-full rounded-xl"
              style={{ height: 180, maxWidth: MAX_BUBBLE_WIDTH - 24 }}
              resizeMode="cover"
            />
          </TouchableOpacity>
        );
      }

      // VIDEO
      if (type === "video") {
        return (
          <TouchableOpacity
            onPress={() => onVideoPress?.(url)}
            activeOpacity={0.9}
            className="mb-2 overflow-hidden rounded-xl bg-black/10 items-center justify-center"
            style={{ height: 180, maxWidth: MAX_BUBBLE_WIDTH - 24 }}
          >
            {(message.attachment as any)?.thumbnail ? (
              <Image
                source={{ uri: (message.attachment as any).thumbnail }}
                className="w-full h-full rounded-xl absolute"
                resizeMode="cover"
              />
            ) : null}
            <View
              className="w-14 h-14 rounded-full items-center justify-center"
              style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
            >
              <Ionicons name="play" size={28} color="white" />
            </View>
            <Text className="text-white text-xs mt-2 font-medium">
              🎬 Video
            </Text>
          </TouchableOpacity>
        );
      }

      // FILE/DOCUMENT
      return (
        <TouchableOpacity
          onPress={() => onDocumentPress?.(url)}
          className="flex-row items-center p-3 rounded-xl mb-2"
          style={{
            backgroundColor: isFromCurrentUser
              ? "rgba(255,255,255,0.2)"
              : "rgba(0,0,0,0.05)",
          }}
        >
          <View
            className="w-10 h-10 rounded-lg items-center justify-center mr-3"
            style={{
              backgroundColor: isFromCurrentUser
                ? "rgba(255,255,255,0.3)"
                : "#e5e7eb",
            }}
          >
            <Feather
              name="file-text"
              size={20}
              color={isFromCurrentUser ? "#fff" : "#3b82f6"}
            />
          </View>
          <View className="flex-1">
            <Text
              className={`text-sm font-medium ${
                isFromCurrentUser ? "text-white" : "text-gray-800"
              }`}
              numberOfLines={1}
            >
              {fileName || "Document"}
            </Text>
            <Text
              className={`text-xs ${
                isFromCurrentUser ? "text-white/70" : "text-gray-500"
              }`}
            >
              Nhấn để mở
            </Text>
          </View>
          <Feather
            name="download"
            size={18}
            color={isFromCurrentUser ? "#fff" : "#3b82f6"}
          />
        </TouchableOpacity>
      );
    };

    return (
      <View
        className={`flex-row mb-3 ${isFromCurrentUser ? "justify-end" : ""}`}
      >
        {/* Avatar for other user */}
        {!isFromCurrentUser && (
          <Image
            source={{
              uri:
                message.sender.profilePicture ||
                "https://placehold.co/100x100?text=User",
            }}
            className="w-8 h-8 rounded-full mr-2"
          />
        )}

        <View className={`flex-1 ${isFromCurrentUser ? "items-end" : ""}`}>
          <Pressable
            onLongPress={() => onLongPress?.(message)}
            style={{ maxWidth: MAX_BUBBLE_WIDTH }}
          >
            {/* Bubble with blue background for sent messages */}
            {isFromCurrentUser ? (
              <View
                className="rounded-2xl rounded-br-md px-4 py-3"
                style={{
                  backgroundColor: "#0084ff",
                  shadowColor: "#0084ff",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                }}
              >
                {renderAttachment()}
                {decryptedContent && decryptedContent !== "📷 Image" && (
                  <Text
                    className="text-white text-base"
                    style={{ lineHeight: 22 }}
                  >
                    {decryptedContent}
                  </Text>
                )}
              </View>
            ) : (
              <View
                className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3"
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 2,
                }}
              >
                {renderAttachment()}
                {decryptedContent && decryptedContent !== "📷 Image" && (
                  <Text
                    className="text-gray-900 text-base"
                    style={{ lineHeight: 22 }}
                  >
                    {decryptedContent}
                  </Text>
                )}
              </View>
            )}
          </Pressable>

          {/* Timestamp and seen indicator */}
          <View className="flex-row items-center mt-1.5 px-1">
            <Text className="text-xs text-gray-400">
              {formatDate(message.createdAt)}
            </Text>

            {/* Pending indicator */}
            {isPending && (
              <View className="ml-2">
                <Ionicons name="time-outline" size={12} color="#9ca3af" />
              </View>
            )}

            {/* Seen indicator */}
            {showSeenIndicator && !isPending && (
              <View className="flex-row items-center ml-2">
                <Image
                  source={{
                    uri:
                      otherUser?.profilePicture ||
                      "https://placehold.co/100x100?text=User",
                  }}
                  className="w-4 h-4 rounded-full"
                />
              </View>
            )}
          </View>
        </View>
      </View>
    );
  }
);

export default MessageBubble;
