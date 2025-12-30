import * as crypto from 'crypto';

/**
 * Encryption utility for securing sensitive data like chat messages.
 * Uses AES-256-GCM for authenticated encryption.
 */
export class EncryptionUtil {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly IV_LENGTH = 16; // 128 bits
  private static readonly AUTH_TAG_LENGTH = 16; // 128 bits
  private static readonly KEY_LENGTH = 32; // 256 bits

  /**
   * Get the encryption key from environment variable.
   * The key must be exactly 32 bytes (256 bits) for AES-256.
   */
  private static getKey(): Buffer {
    const key = process.env.CHAT_ENCRYPTION_KEY;
    if (!key) {
      throw new Error('CHAT_ENCRYPTION_KEY environment variable is not set');
    }

    // If the key is a hex string (64 chars = 32 bytes)
    if (key.length === 64 && /^[0-9a-fA-F]+$/.test(key)) {
      return Buffer.from(key, 'hex');
    }

    // Otherwise, derive a key from the string using SHA-256
    return crypto.createHash('sha256').update(key).digest();
  }

  /**
   * Encrypt a plaintext string.
   * Returns a base64-encoded string containing: IV + AuthTag + Ciphertext
   */
  static encrypt(plaintext: string): string {
    if (!plaintext) return plaintext;

    try {
      const key = this.getKey();
      const iv = crypto.randomBytes(this.IV_LENGTH);

      const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);

      let encrypted = cipher.update(plaintext, 'utf8');
      encrypted = Buffer.concat([encrypted, cipher.final()]);

      const authTag = cipher.getAuthTag();

      // Combine IV + AuthTag + Ciphertext
      const combined = Buffer.concat([iv, authTag, encrypted]);

      return combined.toString('base64');
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt message');
    }
  }

  /**
   * Decrypt a base64-encoded encrypted string.
   * Expects format: IV + AuthTag + Ciphertext
   */
  static decrypt(encryptedData: string): string {
    if (!encryptedData) return encryptedData;

    try {
      const key = this.getKey();
      const combined = Buffer.from(encryptedData, 'base64');

      // Extract IV, AuthTag, and Ciphertext
      const iv = combined.subarray(0, this.IV_LENGTH);
      const authTag = combined.subarray(this.IV_LENGTH, this.IV_LENGTH + this.AUTH_TAG_LENGTH);
      const encrypted = combined.subarray(this.IV_LENGTH + this.AUTH_TAG_LENGTH);

      const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      return decrypted.toString('utf8');
    } catch (error) {
      console.error('Decryption error:', error);
      // Return a placeholder if decryption fails (e.g., key changed)
      return '[Unable to decrypt message]';
    }
  }

  /**
   * Check if a string appears to be encrypted (base64 with correct structure).
   */
  static isEncrypted(data: string): boolean {
    if (!data) return false;

    try {
      const buffer = Buffer.from(data, 'base64');
      // Minimum length: IV (16) + AuthTag (16) + at least 1 byte of ciphertext
      return buffer.length >= this.IV_LENGTH + this.AUTH_TAG_LENGTH + 1;
    } catch {
      return false;
    }
  }

  /**
   * Generate a new random encryption key (for initial setup).
   * Returns a 64-character hex string.
   */
  static generateKey(): string {
    return crypto.randomBytes(this.KEY_LENGTH).toString('hex');
  }
}
