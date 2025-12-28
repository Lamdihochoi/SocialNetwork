/**
 * 🔐 E2E Encryption Utility - Per-Message Salt
 * 
 * Format: E2E|<salt>|<encrypted>
 * Key: SHA256(sortedUserIds + secret + salt)
 * 
 * Each message has unique key due to random salt
 * Salt is embedded in message for receiver to regenerate same key
 */

import "react-native-get-random-values";
import CryptoJS from "crypto-js";

// Base secret - should match any backend secret if needed
const BASE_SECRET = "SocialNetwork_E2E_v2_2024";

// Message format prefix
const E2E_PREFIX = "E2E|";

/**
 * Generate random salt (16 bytes = 32 hex chars)
 */
const generateSalt = (): string => {
  return CryptoJS.lib.WordArray.random(16).toString();
};

/**
 * Derive encryption key from user IDs + secret + salt
 * IDs are sorted to ensure same key regardless of sender/receiver
 */
const deriveKey = (userId1: string, userId2: string, salt: string): string => {
  const sortedIds = [userId1, userId2].sort().join(":");
  return CryptoJS.SHA256(sortedIds + BASE_SECRET + salt).toString();
};

/**
 * Encrypt plain text message
 * 
 * @param plainText - Message content to encrypt
 * @param myUserId - Current user's MongoDB _id
 * @param otherUserId - Other user's MongoDB _id
 * @returns Encrypted string: E2E|<salt>|<encrypted>
 */
export const encryptMessage = (
  plainText: string,
  myUserId: string,
  otherUserId: string
): string => {
  // Validate inputs
  if (!plainText || !myUserId || !otherUserId) {
    return plainText;
  }

  try {
    // Generate unique salt for this message
    const salt = generateSalt();
    
    // Derive key using both user IDs + salt
    const key = deriveKey(myUserId, otherUserId, salt);
    
    // Encrypt with AES
    const encrypted = CryptoJS.AES.encrypt(plainText, key).toString();
    
    // Return formatted: E2E|salt|encrypted
    return `${E2E_PREFIX}${salt}|${encrypted}`;
  } catch (error) {
    console.error("[E2E Encrypt] Error:", error);
    return plainText;
  }
};

/**
 * Decrypt encrypted message
 * 
 * @param cipherText - Encrypted message (E2E|salt|encrypted) or plain text
 * @param myUserId - Current user's MongoDB _id
 * @param otherUserId - Other user's MongoDB _id
 * @returns Decrypted plain text
 */
export const decryptMessage = (
  cipherText: string,
  myUserId: string,
  otherUserId: string
): string => {
  // Handle empty/null
  if (!cipherText) return cipherText;
  
  // Check if this is E2E encrypted
  if (!cipherText.startsWith(E2E_PREFIX)) {
    // Not E2E format - try legacy or return as-is
    return decryptLegacy(cipherText);
  }

  // Validate user IDs
  if (!myUserId || !otherUserId) {
    console.warn("[E2E Decrypt] Missing user IDs");
    return "🔒 Tin nhắn mã hóa";
  }

  try {
    // Parse format: E2E|salt|encrypted
    const withoutPrefix = cipherText.substring(E2E_PREFIX.length);
    const firstPipeIndex = withoutPrefix.indexOf("|");
    
    if (firstPipeIndex === -1) {
      console.warn("[E2E Decrypt] Invalid format - no salt separator");
      return cipherText;
    }
    
    const salt = withoutPrefix.substring(0, firstPipeIndex);
    const encrypted = withoutPrefix.substring(firstPipeIndex + 1);
    
    if (!salt || !encrypted) {
      console.warn("[E2E Decrypt] Missing salt or encrypted content");
      return cipherText;
    }
    
    // Derive same key using salt from message
    const key = deriveKey(myUserId, otherUserId, salt);
    
    // Decrypt with AES
    const bytes = CryptoJS.AES.decrypt(encrypted, key);
    
    // Wrap toString in try-catch to handle Malformed UTF-8 errors
    let decrypted = "";
    try {
      decrypted = bytes.toString(CryptoJS.enc.Utf8);
    } catch (utf8Error) {
      // Malformed UTF-8 - return original text
      return cipherText;
    }
    
    if (!decrypted) {
      console.warn("[E2E Decrypt] Decryption returned empty - key mismatch?");
      return cipherText;
    }
    
    return decrypted;
  } catch (error) {
    // Silent fallback - return original text
    return cipherText;
  }
};

/**
 * Decrypt legacy messages (old encryption formats)
 */
const decryptLegacy = (cipherText: string): string => {
  if (!cipherText) return cipherText;

  // Old static key format (U2Fsd... is CryptoJS signature)
  if (cipherText.startsWith("U2Fsd")) {
    try {
      const LEGACY_KEY = "SocialNetwork_E2E_SecretKey_256bit_v1";
      const bytes = CryptoJS.AES.decrypt(cipherText, LEGACY_KEY);
      
      // Wrap in try-catch to handle Malformed UTF-8 errors
      let decrypted = "";
      try {
        decrypted = bytes.toString(CryptoJS.enc.Utf8);
      } catch {
        return cipherText;
      }
      
      if (decrypted && decrypted.length > 0) {
        return decrypted;
      }
    } catch {
      // Failed to decrypt legacy, return as-is
    }
  }

  // Plain text or unknown format - return as-is
  return cipherText;
};

/**
 * 🔄 Middleware: Decrypt a single message object
 * Use this before displaying any message
 */
export const decryptMessageObject = (
  message: any,
  myUserId: string,
  otherUserId: string
): any => {
  if (!message || !message.content) return message;
  
  return {
    ...message,
    content: decryptMessage(message.content, myUserId, otherUserId),
    _isDecrypted: true, // Mark as decrypted to avoid double-decryption
  };
};

/**
 * 🔄 Middleware: Decrypt array of messages
 * Use this for message history from API
 */
export const decryptMessageList = (
  messages: any[],
  myUserId: string,
  otherUserId: string
): any[] => {
  if (!messages || !Array.isArray(messages)) return messages;
  
  return messages.map(msg => decryptMessageObject(msg, myUserId, otherUserId));
};

/**
 * Check if text is E2E encrypted
 */
export const isE2EEncrypted = (text: string): boolean => {
  return text?.startsWith(E2E_PREFIX) || false;
};

/**
 * Decrypt for conversation list preview
 * When we have both user IDs, decrypt properly
 * Otherwise show placeholder
 */
export const decryptForList = (
  content: string,
  myUserId?: string,
  otherUserId?: string
): string => {
  if (!content) return content;
  
  // If we have both IDs and it's E2E, decrypt
  if (myUserId && otherUserId && content.startsWith(E2E_PREFIX)) {
    return decryptMessage(content, myUserId, otherUserId);
  }
  
  // Legacy format
  if (content.startsWith("U2Fsd")) {
    return decryptLegacy(content);
  }
  
  // E2E but no IDs - show placeholder
  if (content.startsWith(E2E_PREFIX)) {
    return "🔒 Tin nhắn";
  }
  
  // Plain text
  return content;
};

// Export for backward compatibility
export {
  encryptMessage as encryptMessageDynamic,
  decryptMessage as decryptMessageDynamic,
  decryptLegacy as legacyDecrypt,
};
