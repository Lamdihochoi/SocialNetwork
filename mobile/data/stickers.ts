/**
 * 🎨 Sticker Packs Data
 * Contains all sticker packs with their stickers
 */

export interface Sticker {
  id: string;
  emoji: string;
  name: string;
}

export interface StickerPack {
  id: string;
  name: string;
  icon: string;
  stickers: Sticker[];
}

// 📦 Sticker Packs
export const STICKER_PACKS: StickerPack[] = [
  {
    id: "reactions",
    name: "Reactions",
    icon: "😀",
    stickers: [
      { id: "r1", emoji: "😀", name: "smile" },
      { id: "r2", emoji: "😂", name: "laugh" },
      { id: "r3", emoji: "😍", name: "love_eyes" },
      { id: "r4", emoji: "🥰", name: "hearts" },
      { id: "r5", emoji: "😊", name: "blush" },
      { id: "r6", emoji: "😎", name: "cool" },
      { id: "r7", emoji: "🤩", name: "star_eyes" },
      { id: "r8", emoji: "😏", name: "smirk" },
      { id: "r9", emoji: "😭", name: "cry" },
      { id: "r10", emoji: "😱", name: "shock" },
      { id: "r11", emoji: "🤔", name: "think" },
      { id: "r12", emoji: "🙄", name: "eyeroll" },
      { id: "r13", emoji: "😴", name: "sleep" },
      { id: "r14", emoji: "🤗", name: "hug" },
      { id: "r15", emoji: "🤫", name: "shh" },
      { id: "r16", emoji: "🤯", name: "mind_blown" },
      { id: "r17", emoji: "😤", name: "angry" },
      { id: "r18", emoji: "😇", name: "angel" },
      { id: "r19", emoji: "🥳", name: "party" },
      { id: "r20", emoji: "🤣", name: "rofl" },
    ],
  },
  {
    id: "animals",
    name: "Cute Animals",
    icon: "🐱",
    stickers: [
      { id: "a1", emoji: "🐱", name: "cat" },
      { id: "a2", emoji: "🐶", name: "dog" },
      { id: "a3", emoji: "🐰", name: "bunny" },
      { id: "a4", emoji: "🐻", name: "bear" },
      { id: "a5", emoji: "🐼", name: "panda" },
      { id: "a6", emoji: "🦊", name: "fox" },
      { id: "a7", emoji: "🦁", name: "lion" },
      { id: "a8", emoji: "🐯", name: "tiger" },
      { id: "a9", emoji: "🐮", name: "cow" },
      { id: "a10", emoji: "🐷", name: "pig" },
      { id: "a11", emoji: "🐸", name: "frog" },
      { id: "a12", emoji: "🐵", name: "monkey" },
      { id: "a13", emoji: "🐥", name: "chick" },
      { id: "a14", emoji: "🦄", name: "unicorn" },
      { id: "a15", emoji: "🐧", name: "penguin" },
      { id: "a16", emoji: "🐨", name: "koala" },
      { id: "a17", emoji: "🦋", name: "butterfly" },
      { id: "a18", emoji: "🐢", name: "turtle" },
      { id: "a19", emoji: "🦀", name: "crab" },
      { id: "a20", emoji: "🐙", name: "octopus" },
    ],
  },
  {
    id: "love",
    name: "Love & Hearts",
    icon: "❤️",
    stickers: [
      { id: "l1", emoji: "❤️", name: "red_heart" },
      { id: "l2", emoji: "💕", name: "two_hearts" },
      { id: "l3", emoji: "💖", name: "sparkling_heart" },
      { id: "l4", emoji: "💗", name: "growing_heart" },
      { id: "l5", emoji: "💓", name: "beating_heart" },
      { id: "l6", emoji: "💘", name: "cupid" },
      { id: "l7", emoji: "💝", name: "gift_heart" },
      { id: "l8", emoji: "💞", name: "revolving_hearts" },
      { id: "l9", emoji: "🥺", name: "pleading" },
      { id: "l10", emoji: "🫶", name: "heart_hands" },
      { id: "l11", emoji: "💋", name: "kiss" },
      { id: "l12", emoji: "🌹", name: "rose" },
      { id: "l13", emoji: "💐", name: "bouquet" },
      { id: "l14", emoji: "✨", name: "sparkles" },
      { id: "l15", emoji: "⭐", name: "star" },
      { id: "l16", emoji: "🌟", name: "glowing_star" },
      { id: "l17", emoji: "💫", name: "dizzy" },
      { id: "l18", emoji: "🎀", name: "ribbon" },
      { id: "l19", emoji: "🩷", name: "pink_heart" },
      { id: "l20", emoji: "🩵", name: "light_blue_heart" },
    ],
  },
  {
    id: "gestures",
    name: "Gestures",
    icon: "👍",
    stickers: [
      { id: "g1", emoji: "👍", name: "thumbs_up" },
      { id: "g2", emoji: "👎", name: "thumbs_down" },
      { id: "g3", emoji: "👏", name: "clap" },
      { id: "g4", emoji: "🙏", name: "pray" },
      { id: "g5", emoji: "💪", name: "muscle" },
      { id: "g6", emoji: "✌️", name: "peace" },
      { id: "g7", emoji: "🤞", name: "fingers_crossed" },
      { id: "g8", emoji: "🤟", name: "love_you" },
      { id: "g9", emoji: "🤙", name: "call_me" },
      { id: "g10", emoji: "👋", name: "wave" },
      { id: "g11", emoji: "🤝", name: "handshake" },
      { id: "g12", emoji: "👊", name: "fist" },
      { id: "g13", emoji: "🫡", name: "salute" },
      { id: "g14", emoji: "🫰", name: "heart_fingers" },
      { id: "g15", emoji: "👌", name: "ok" },
      { id: "g16", emoji: "🤌", name: "pinched_fingers" },
      { id: "g17", emoji: "☝️", name: "point_up" },
      { id: "g18", emoji: "🙌", name: "raised_hands" },
      { id: "g19", emoji: "🫂", name: "people_hugging" },
      { id: "g20", emoji: "💅", name: "nail_polish" },
    ],
  },
  {
    id: "food",
    name: "Food & Drinks",
    icon: "🍕",
    stickers: [
      { id: "f1", emoji: "🍕", name: "pizza" },
      { id: "f2", emoji: "🍔", name: "burger" },
      { id: "f3", emoji: "🍟", name: "fries" },
      { id: "f4", emoji: "🍜", name: "noodles" },
      { id: "f5", emoji: "🍣", name: "sushi" },
      { id: "f6", emoji: "🍦", name: "ice_cream" },
      { id: "f7", emoji: "🧋", name: "boba" },
      { id: "f8", emoji: "☕", name: "coffee" },
      { id: "f9", emoji: "🍩", name: "donut" },
      { id: "f10", emoji: "🎂", name: "cake" },
      { id: "f11", emoji: "🍪", name: "cookie" },
      { id: "f12", emoji: "🍰", name: "shortcake" },
      { id: "f13", emoji: "🍿", name: "popcorn" },
      { id: "f14", emoji: "🥤", name: "soda" },
      { id: "f15", emoji: "🍻", name: "cheers" },
      { id: "f16", emoji: "🍷", name: "wine" },
      { id: "f17", emoji: "🥂", name: "champagne" },
      { id: "f18", emoji: "🍾", name: "bottle" },
      { id: "f19", emoji: "🧁", name: "cupcake" },
      { id: "f20", emoji: "🍡", name: "dango" },
    ],
  },
  {
    id: "activities",
    name: "Fun & Activities",
    icon: "🎉",
    stickers: [
      { id: "ac1", emoji: "🎉", name: "tada" },
      { id: "ac2", emoji: "🎊", name: "confetti" },
      { id: "ac3", emoji: "🎁", name: "gift" },
      { id: "ac4", emoji: "🎈", name: "balloon" },
      { id: "ac5", emoji: "🎮", name: "gaming" },
      { id: "ac6", emoji: "🎬", name: "movie" },
      { id: "ac7", emoji: "🎵", name: "music" },
      { id: "ac8", emoji: "🎤", name: "mic" },
      { id: "ac9", emoji: "🏆", name: "trophy" },
      { id: "ac10", emoji: "🥇", name: "gold_medal" },
      { id: "ac11", emoji: "⚽", name: "soccer" },
      { id: "ac12", emoji: "🏀", name: "basketball" },
      { id: "ac13", emoji: "🎯", name: "target" },
      { id: "ac14", emoji: "🔥", name: "fire" },
      { id: "ac15", emoji: "💯", name: "100" },
      { id: "ac16", emoji: "⚡", name: "lightning" },
      { id: "ac17", emoji: "💥", name: "boom" },
      { id: "ac18", emoji: "🚀", name: "rocket" },
      { id: "ac19", emoji: "🌈", name: "rainbow" },
      { id: "ac20", emoji: "☀️", name: "sun" },
    ],
  },
];

// Helper function to get sticker by ID
export const getStickerById = (packId: string, stickerId: string): Sticker | null => {
  const pack = STICKER_PACKS.find((p) => p.id === packId);
  if (!pack) return null;
  return pack.stickers.find((s) => s.id === stickerId) || null;
};

// Get all stickers flat list
export const getAllStickers = (): (Sticker & { packId: string })[] => {
  return STICKER_PACKS.flatMap((pack) =>
    pack.stickers.map((sticker) => ({ ...sticker, packId: pack.id }))
  );
};
