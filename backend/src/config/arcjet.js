import arcjet, { tokenBucket, shield, detectBot } from "@arcjet/node";
import { ENV } from "./env.js";

/**
 * Arcjet security configuration
 * - Shield: bảo vệ khỏi các tấn công phổ biến (XSS, SQLi, CSRF)
 * - detectBot: phát hiện bot, nhưng cho phép app React Native
 * - tokenBucket: giới hạn tốc độ truy cập API
 */

export const aj = arcjet({
  key: ENV.ARCJET_KEY,
  characteristics: ["ip.src"],
  timeout: 5000, 


  rules: [
    // Bảo vệ khỏi tấn công phổ biến
    shield({ mode: "LIVE" }),

    // Phát hiện bot (cho phép React Native, axios, okhttp)
    detectBot({
      mode: process.env.NODE_ENV === "production" ? "LIVE" : "DRY_RUN",
      allow: [
        "CATEGORY:SEARCH_ENGINE",
        "UA:ReactNative",
        "UA:axios",
        "UA:okhttp",
        "UA:SocialNetworkApp",
      ],
    }),

    // Rate limiting (Token Bucket)
    tokenBucket({
      mode: "LIVE",
      refillRate: 10, // 10 tokens mỗi 10 giây
      interval: 10,
      capacity: 15, // tối đa 15 request burst
    }),
  ],
});
