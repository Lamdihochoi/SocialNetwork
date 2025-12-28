import React, { useState, useCallback, memo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  Pressable,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { STICKER_PACKS, Sticker, StickerPack } from "@/data/stickers";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const STICKER_SIZE = (SCREEN_WIDTH - 48) / 5; // 5 stickers per row with padding

interface StickerPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelectSticker: (packId: string, sticker: Sticker) => void;
}

// Memoized sticker item for performance
const StickerItem = memo(
  ({
    sticker,
    packId,
    onSelect,
  }: {
    sticker: Sticker;
    packId: string;
    onSelect: (packId: string, sticker: Sticker) => void;
  }) => (
    <TouchableOpacity
      onPress={() => onSelect(packId, sticker)}
      activeOpacity={0.6}
      className="items-center justify-center m-1"
      style={{ width: STICKER_SIZE, height: STICKER_SIZE }}
    >
      <Text style={{ fontSize: 36 }}>{sticker.emoji}</Text>
    </TouchableOpacity>
  )
);

// Pack tab button
const PackTab = memo(
  ({
    pack,
    isSelected,
    onPress,
  }: {
    pack: StickerPack;
    isSelected: boolean;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      className={`px-4 py-3 rounded-xl mr-2 ${
        isSelected ? "bg-blue-500" : "bg-gray-100"
      }`}
    >
      <Text style={{ fontSize: 22 }}>{pack.icon}</Text>
    </TouchableOpacity>
  )
);

export const StickerPicker: React.FC<StickerPickerProps> = ({
  visible,
  onClose,
  onSelectSticker,
}) => {
  const [selectedPackId, setSelectedPackId] = useState(STICKER_PACKS[0].id);

  const selectedPack = STICKER_PACKS.find((p) => p.id === selectedPackId);

  const handleSelectSticker = useCallback(
    (packId: string, sticker: Sticker) => {
      onSelectSticker(packId, sticker);
      onClose();
    },
    [onSelectSticker, onClose]
  );

  const renderSticker = useCallback(
    ({ item }: { item: Sticker }) => (
      <StickerItem
        sticker={item}
        packId={selectedPackId}
        onSelect={handleSelectSticker}
      />
    ),
    [selectedPackId, handleSelectSticker]
  );

  const keyExtractor = useCallback((item: Sticker) => item.id, []);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 bg-black/30"
        onPress={onClose}
      >
        <View className="flex-1" />
        <Pressable onPress={(e) => e.stopPropagation()}>
          <View
            className="bg-white rounded-t-3xl"
            style={{
              height: 380,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.1,
              shadowRadius: 12,
              elevation: 10,
            }}
          >
            {/* Header */}
            <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
              <Text className="text-lg font-bold text-gray-900">
                {selectedPack?.name || "Stickers"}
              </Text>
              <TouchableOpacity
                onPress={onClose}
                className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
              >
                <Ionicons name="close" size={18} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {/* Pack Tabs - Horizontal Scroll */}
            <View className="py-2 border-b border-gray-50">
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={STICKER_PACKS}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingHorizontal: 12 }}
                renderItem={({ item }) => (
                  <PackTab
                    pack={item}
                    isSelected={item.id === selectedPackId}
                    onPress={() => setSelectedPackId(item.id)}
                  />
                )}
              />
            </View>

            {/* Stickers Grid */}
            <FlatList
              data={selectedPack?.stickers || []}
              keyExtractor={keyExtractor}
              numColumns={5}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ padding: 8 }}
              renderItem={renderSticker}
              initialNumToRender={20}
              maxToRenderPerBatch={20}
              windowSize={5}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default StickerPicker;
