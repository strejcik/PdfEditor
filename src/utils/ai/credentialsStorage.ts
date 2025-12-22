/**
 * Encrypted Credentials Storage
 * Password-based encryption for API key storage using Web Crypto API
 *
 * Security:
 * - PBKDF2 for key derivation (100,000 iterations)
 * - AES-256-GCM for authenticated encryption
 * - Unique salt and IV per encryption
 */

import type { AICredentials } from '../../types/ai';

// ============================================================================
// Constants
// ============================================================================

const DB_NAME = 'PdfEditorDB';
const DB_VERSION = 8; // Increment to add credentials store
const STORE_CREDENTIALS = 'credentials';
const CREDENTIALS_KEY = 'ai_credentials';
const PBKDF2_ITERATIONS = 100000;

// ============================================================================
// Database Helpers
// ============================================================================

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      return reject(new Error('IndexedDB not supported'));
    }

    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e: any) => {
      const db = e.target.result;

      // Create all existing stores if needed
      if (!db.objectStoreNames.contains('textItems')) {
        db.createObjectStore('textItems', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('imageItems')) {
        db.createObjectStore('imageItems', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('pages')) {
        db.createObjectStore('pages', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('shapes')) {
        db.createObjectStore('shapes', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('formFields')) {
        db.createObjectStore('formFields', { keyPath: 'id' });
      }
      // Add credentials store
      if (!db.objectStoreNames.contains(STORE_CREDENTIALS)) {
        db.createObjectStore(STORE_CREDENTIALS, { keyPath: 'id' });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
  });
}

// ============================================================================
// Encryption Helpers
// ============================================================================

/**
 * Convert ArrayBuffer to Base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert Base64 string to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Derive encryption key from password using PBKDF2
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  // Import password as raw key material
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  // Derive AES-GCM key using PBKDF2
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    passwordKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt']
  );
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Save API key encrypted with password
 */
export async function saveApiKey(apiKey: string, password: string): Promise<void> {
  // Generate random salt and IV
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Derive encryption key from password
  const key = await deriveKey(password, salt);

  // Encrypt the API key
  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    new TextEncoder().encode(apiKey)
  );

  // Prepare credentials object
  const credentials: AICredentials = {
    encryptedKey: arrayBufferToBase64(encryptedBuffer),
    salt: arrayBufferToBase64(salt.buffer),
    iv: arrayBufferToBase64(iv.buffer),
  };

  // Store in IndexedDB
  const db = await openDB();
  try {
    const tx = db.transaction(STORE_CREDENTIALS, 'readwrite');
    const store = tx.objectStore(STORE_CREDENTIALS);
    store.put({ id: CREDENTIALS_KEY, data: credentials });
    await txDone(tx);
  } finally {
    db.close();
  }
}

/**
 * Load and decrypt API key with password
 * Returns null if credentials don't exist or decryption fails
 */
export async function loadApiKey(password: string): Promise<string | null> {
  let db: IDBDatabase;

  try {
    db = await openDB();
  } catch (e) {
    console.error('Failed to open database:', e);
    return null;
  }

  try {
    const tx = db.transaction(STORE_CREDENTIALS, 'readonly');
    const store = tx.objectStore(STORE_CREDENTIALS);

    const record: any = await new Promise((resolve, reject) => {
      const req = store.get(CREDENTIALS_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });

    await txDone(tx);

    if (!record || !record.data) {
      return null;
    }

    const credentials: AICredentials = record.data;

    // Reconstruct salt, IV, and encrypted data
    const salt = new Uint8Array(base64ToArrayBuffer(credentials.salt));
    const iv = new Uint8Array(base64ToArrayBuffer(credentials.iv));
    const encryptedData = base64ToArrayBuffer(credentials.encryptedKey);

    // Derive decryption key from password
    const key = await deriveKey(password, salt);

    // Decrypt
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      key,
      encryptedData
    );

    return new TextDecoder().decode(decryptedBuffer);
  } catch (e) {
    // Decryption failed (wrong password or corrupted data)
    console.error('Failed to decrypt API key:', e);
    return null;
  } finally {
    db.close();
  }
}

/**
 * Check if credentials exist (without decrypting)
 */
export async function hasApiKey(): Promise<boolean> {
  let db: IDBDatabase;

  try {
    db = await openDB();
  } catch (e) {
    return false;
  }

  try {
    const tx = db.transaction(STORE_CREDENTIALS, 'readonly');
    const store = tx.objectStore(STORE_CREDENTIALS);

    const record: any = await new Promise((resolve, reject) => {
      const req = store.get(CREDENTIALS_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });

    await txDone(tx);

    return !!(record && record.data);
  } catch (e) {
    return false;
  } finally {
    db.close();
  }
}

/**
 * Remove stored credentials
 */
export async function clearApiKey(): Promise<void> {
  let db: IDBDatabase;

  try {
    db = await openDB();
  } catch (e) {
    console.error('Failed to open database:', e);
    return;
  }

  try {
    const tx = db.transaction(STORE_CREDENTIALS, 'readwrite');
    const store = tx.objectStore(STORE_CREDENTIALS);
    store.delete(CREDENTIALS_KEY);
    await txDone(tx);
  } catch (e) {
    console.error('Failed to clear API key:', e);
  } finally {
    db.close();
  }
}
