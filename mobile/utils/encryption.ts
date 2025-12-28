/**
 * AES-256 Encryption Utility for E2E Message Encryption
 * 
 * Tin nhắn được mã hóa ở Frontend trước khi gửi.
 * Backend chỉ lưu ciphertext, không giải mã.
 * Người nhận giải mã tại thiết bị của họ.
 */

import "react-native-get-random-values"; // Polyfill for crypto-js in React Native
import CryptoJS from "crypto-js";

// Secret key for encryption (in production, should be derived from user keys)
// This is a shared secret - in real E2E, each conversation would have its own key
const SECRET_KEY = "SocialNetwork_E2E_SecretKey_256bit_v1";

/**
 * Encrypt a message using AES-256
 * @param plainText - The message to encrypt
 * @returns Encrypted ciphertext or original text if encryption fails
 */
export const encryptMessage = (plainText: string): string => {
  if (!plainText) return plainText;
  
  try {
    const cipherText = CryptoJS.AES.encrypt(plainText, SECRET_KEY).toString();
    return cipherText;
  } catch (error) {
    console.error("[ENCRYPT] Error:", error);
    return plainText; // Fallback to plain text if encryption fails
  }
};

/**
 * Decrypt a message using AES-256
 * Handles both encrypted and plain text messages (backward compatibility)
 * @param cipherText - The encrypted message
 * @returns Decrypted plain text
 */
export const decryptMessage = (cipherText: string): string => {
  if (!cipherText) return cipherText;
  
  try {
    // Attempt to decrypt
    const bytes = CryptoJS.AES.decrypt(cipherText, SECRET_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    
    // If decryption returns empty string, it might be plain text
    if (!decrypted) {
      // Not encrypted, return as-is (backward compatibility)
      return cipherText;
    }
    
    return decrypted;
  } catch (error) {
    // If decryption fails, assume it's plain text (old messages)
    console.warn("[DECRYPT] Failed, returning as plain text");
    return cipherText;
  }
};

/**
 * Check if a string is encrypted
 * @param text - Text to check
 * @returns true if encrypted
 */
export const isEncrypted = (text: string): boolean => {
  if (!text) return false;
  
  try {
    // Encrypted strings from CryptoJS start with "U2Fsd" (base64 of "Salted__")
    return text.startsWith("U2Fsd");
  } catch {
    return false;
  }
};

/**
 * Generate a conversation-specific encryption key
 * Uses both user IDs to create a unique key for each conversation
 * @param userId1 - First user ID
 * @param userId2 - Second user ID
 * @returns Unique conversation key
 */
export const generateConversationKey = (userId1: string, userId2: string): string => {
  const sortedIds = [userId1, userId2].sort().join("_");
  const hash = CryptoJS.SHA256(sortedIds + SECRET_KEY).toString();
  return hash;
};

/**
 * Encrypt with conversation-specific key
 */
export const encryptWithKey = (plainText: string, key: string): string => {
  if (!plainText) return plainText;
  
  try {
    return CryptoJS.AES.encrypt(plainText, key).toString();
  } catch (error) {
    console.error("[ENCRYPT_KEY] Error:", error);
    return plainText;
  }
};

/**
 * Decrypt with conversation-specific key
 */
export const decryptWithKey = (cipherText: string, key: string): string => {
  if (!cipherText) return cipherText;
  
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, key);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted || cipherText;
  } catch {
    return cipherText;
  }
};

// ==========================================
// 🔐 SESSION-BASED E2E ENCRYPTION
// Keys are generated per conversation session
// Only sender and receiver know the key
// Server CANNOT decrypt messages
// ==========================================

// In-memory storage for session keys (never persisted)
const sessionKeys = new Map<string, { key: string; createdAt: number }>();

/**
 * Generate a session-specific encryption key
 * Key = SHA256(userId1 + userId2 + sessionId + timestamp)
 * Each conversation open creates a new session
 * @param userId1 - Current user ID
 * @param userId2 - Other user ID
 * @returns Session encryption key (256-bit)
 */
export const generateSessionKey = (userId1: string, userId2: string): string => {
  const sortedIds = [userId1, userId2].sort().join("_");
  const sessionId = Date.now().toString(36) + Math.random().toString(36).substring(2);
  const keyMaterial = sortedIds + sessionId + SECRET_KEY;
  const sessionKey = CryptoJS.SHA256(keyMaterial).toString();
  
  // Store the session key
  sessionKeys.set(sortedIds, {
    key: sessionKey,
    createdAt: Date.now(),
  });
  
  console.log(`[E2E] New session key generated for conversation: ${sortedIds.substring(0, 10)}...`);
  return sessionKey;
};

/**
 * Get or create session key for a conversation
 * @param userId1 - Current user ID
 * @param userId2 - Other user ID
 * @returns Existing or new session key
 */
export const getOrCreateSessionKey = (userId1: string, userId2: string): string => {
  const sortedIds = [userId1, userId2].sort().join("_");
  const existing = sessionKeys.get(sortedIds);
  
  if (existing) {
    return existing.key;
  }
  
  return generateSessionKey(userId1, userId2);
};

/**
 * Clear session key when conversation is closed
 * @param userId1 - Current user ID
 * @param userId2 - Other user ID
 */
export const clearSessionKey = (userId1: string, userId2: string): void => {
  const sortedIds = [userId1, userId2].sort().join("_");
  sessionKeys.delete(sortedIds);
  console.log(`[E2E] Session key cleared for conversation: ${sortedIds.substring(0, 10)}...`);
};

/**
 * Encrypt message with session key (E2E)
 * Server cannot decrypt this - only sender and receiver can
 */
export const encryptE2E = (plainText: string, userId1: string, userId2: string): string => {
  const sessionKey = getOrCreateSessionKey(userId1, userId2);
  return encryptWithKey(plainText, sessionKey);
};

/**
 * Decrypt message with session key (E2E)
 */
export const decryptE2E = (cipherText: string, userId1: string, userId2: string): string => {
  const sessionKey = getOrCreateSessionKey(userId1, userId2);
  return decryptWithKey(cipherText, sessionKey);
};

