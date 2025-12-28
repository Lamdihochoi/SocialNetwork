import crypto from "crypto";
import { ENV } from "./env.js";

// Algorithm: AES-256-CBC
const ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16; // AES block size

/**
 * Get encryption key from environment variable
 * Key must be exactly 32 characters for AES-256
 */
const getEncryptionKey = () => {
  const key = ENV.ENCRYPTION_KEY;
  if (!key) {
    throw new Error("ENCRYPTION_KEY is not set in environment variables");
  }
  if (key.length !== 32) {
    throw new Error("ENCRYPTION_KEY must be exactly 32 characters");
  }
  return key;
};

/**
 * Encrypt plain text using AES-256-CBC
 * @param {string} text - Plain text to encrypt
 * @returns {string} - Encrypted string in format: iv:encryptedData (both in hex)
 */
export const encrypt = (text) => {
  if (!text || typeof text !== "string") {
    return text; // Return as-is if invalid input
  }

  try {
    const key = getEncryptionKey();
    
    // Generate random IV for each encryption (ensures same text produces different output)
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(key, "utf-8"), iv);
    
    // Encrypt the text
    let encrypted = cipher.update(text, "utf-8", "hex");
    encrypted += cipher.final("hex");
    
    // Return IV + encrypted data (IV needed for decryption)
    // Format: iv:encryptedData
    return `${iv.toString("hex")}:${encrypted}`;
  } catch (error) {
    console.error("Encryption error:", error.message);
    throw new Error("Failed to encrypt data");
  }
};

/**
 * Decrypt encrypted text using AES-256-CBC
 * @param {string} encryptedText - Encrypted string in format: iv:encryptedData
 * @returns {string} - Decrypted plain text
 */
export const decrypt = (encryptedText) => {
  if (!encryptedText || typeof encryptedText !== "string") {
    return encryptedText; // Return as-is if invalid input
  }

  // Check if the text looks like it's encrypted (contains : separator)
  if (!encryptedText.includes(":")) {
    // This might be plain text from before encryption was implemented
    return encryptedText;
  }

  try {
    const key = getEncryptionKey();
    
    // Split IV and encrypted data
    const [ivHex, encryptedData] = encryptedText.split(":");
    
    if (!ivHex || !encryptedData) {
      // Invalid format, return as-is (might be plain text)
      return encryptedText;
    }

    // Convert IV from hex to buffer
    const iv = Buffer.from(ivHex, "hex");
    
    // Validate IV length
    if (iv.length !== IV_LENGTH) {
      return encryptedText; // Invalid IV, return as-is
    }
    
    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(key, "utf-8"), iv);
    
    // Decrypt the data
    let decrypted = decipher.update(encryptedData, "hex", "utf-8");
    decrypted += decipher.final("utf-8");
    
    return decrypted;
  } catch (error) {
    // If decryption fails, the text might be plain text (legacy data)
    console.warn("Decryption failed, returning original text:", error.message);
    return encryptedText;
  }
};

/**
 * Check if a string appears to be encrypted
 * @param {string} text - Text to check
 * @returns {boolean}
 */
export const isEncrypted = (text) => {
  if (!text || typeof text !== "string") return false;
  
  // Check format: should be hex:hex with proper length
  const parts = text.split(":");
  if (parts.length !== 2) return false;
  
  const [ivHex] = parts;
  // IV should be 32 hex characters (16 bytes)
  return ivHex.length === 32 && /^[0-9a-f]+$/i.test(ivHex);
};
