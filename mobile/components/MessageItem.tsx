import React, { memo, useMemo } from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { Feather } from "@expo/vector-icons";
import { formatDate } from "@/utils/formatters";
import { Message } from "@/types";

interface MessageItemProps {
  message: Message;
  isFromCurrentUser: boolean;
  showSeenIndicator: boolean;
  otherUserProfilePicture?: string;
  onViewImage: (url: string) => void;
  onOpenDocument: (url: string) => void;
  onDownload: (url: string, fileName: string, isImage: boolean) => void;
  // ⚡ decryptedContent is pre-computed, not calculated during render
  decryptedContent: string;
}

/**
 * ⚡ OPTIMIZED MessageItem with React.memo
 * - Prevents re-render when props haven't changed
 * - Receives pre-decrypted content (no computation during render)
 * - Custom comparison function for shallow equality
 */
const MessageItem = memo(
  ({
    message,
    isFromCurrentUser,
    showSeenIndicator,
    otherUserProfilePicture,
    onViewImage,
    onOpenDocument,
    onDownload,
    decryptedContent,
  }: MessageItemProps) => {
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
            className="size-8 rounded-full mr-2"
          />
        )}
        <View className={`flex-1 ${isFromCurrentUser ? "items-end" : ""}`}>
          <View
            className={`rounded-2xl px-4 py-3 max-w-xs ${
              isFromCurrentUser ? "bg-blue-500" : "bg-gray-100"
            }`}
          >
            {/* Display attachment if present */}
            {message.attachment?.url && (
              <View className="mb-2">
                {message.attachment.type.startsWith("image") ? (
                  <TouchableOpacity
                    onPress={() => onViewImage(message.attachment!.url)}
                  >
                    <Image
                      source={{ uri: message.attachment!.url }}
                      className="w-full h-48 rounded-lg mb-2"
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    className="flex-row items-center p-3 rounded-lg border-2 border-dashed border-gray-300"
                    onPress={() => onOpenDocument(message.attachment!.url)}
                  >
                    <Feather
                      name="file"
                      size={20}
                      color={isFromCurrentUser ? "#fff" : "#1DA1F2"}
                    />
                    <Text
                      className={`ml-2 text-sm flex-1 ${
                        isFromCurrentUser ? "text-white" : "text-blue-500"
                      }`}
                      numberOfLines={1}
                    >
                      {message.attachment!.fileName || "Tệp đính kèm"}
                    </Text>
                    <TouchableOpacity
                      onPress={() =>
                        onDownload(
                          message.attachment!.url,
                          message.attachment!.fileName || "document",
                          false
                        )
                      }
                    >
                      <Feather
                        name="download"
                        size={18}
                        color={isFromCurrentUser ? "#fff" : "#1DA1F2"}
                      />
                    </TouchableOpacity>
                  </TouchableOpacity>
                )}
              </View>
            )}
            {decryptedContent ? (
              <Text
                className={`${
                  isFromCurrentUser ? "text-white" : "text-gray-900"
                } text-base`}
              >
                {decryptedContent}
              </Text>
            ) : null}
          </View>
          <View className="flex-row items-center mt-1">
            <Text className="text-xs text-gray-400">
              {formatDate(message.createdAt)}
            </Text>
            {/* 👁️ Seen indicator - shows for last sent message that was read */}
            {showSeenIndicator && (
              <View className="flex-row items-center ml-2">
                <Image
                  source={{
                    uri:
                      otherUserProfilePicture ||
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
  },
  // ⚡ Custom comparison - only re-render if these props change
  (prevProps, nextProps) => {
    return (
      prevProps.message._id === nextProps.message._id &&
      prevProps.message.isRead === nextProps.message.isRead &&
      prevProps.showSeenIndicator === nextProps.showSeenIndicator &&
      prevProps.decryptedContent === nextProps.decryptedContent
    );
  }
);

MessageItem.displayName = "MessageItem";

export default MessageItem;
