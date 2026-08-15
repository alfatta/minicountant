/**
 * Password hashing and verification using PBKDF2-SHA256 (Web Crypto API).
 * Future-compatible: also surfaces a derived AES-GCM CryptoKey for future data
 * encryption without changing the public API.
 */

export interface DerivedSecrets {
  hash: string
  key: CryptoKey
}

const MIN_ITERATIONS = 100_000
const KEY_BITS = 256
const SALT_BYTES = 16

export class SecurityError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SecurityError'
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i] as number)
  }
  return btoa(binary)
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

export async function generateSalt(byteLength: number = SALT_BYTES): Promise<string> {
  if (byteLength <= 0) throw new SecurityError('salt length must be positive')
  const bytes = new Uint8Array(byteLength)
  crypto.getRandomValues(bytes)
  return bytesToBase64(bytes)
}

async function importPasswordKey(password: string): Promise<CryptoKey> {
  if (typeof password !== 'string' || password.length === 0) {
    throw new SecurityError('password must not be empty')
  }
  const enc = new TextEncoder().encode(password)
  return crypto.subtle.importKey(
    'raw',
    enc as unknown as BufferSource,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  )
}

export async function deriveSecrets(
  password: string,
  salt: string,
  iterations: number = MIN_ITERATIONS
): Promise<DerivedSecrets> {
  if (iterations < MIN_ITERATIONS) {
    throw new SecurityError(`iterations must be >= ${MIN_ITERATIONS}`)
  }
  const baseKey = await importPasswordKey(password)
  const saltBytes = base64ToBytes(salt)
  const saltBuf = saltBytes as unknown as BufferSource
  // Two parallel derivations: 256 bits as raw bits for verification hash,
  // and a 256-bit AES-GCM key for future encryption.
  const [bits, key] = await Promise.all([
    crypto.subtle.deriveBits(
      { name: 'PBKDF2', hash: 'SHA-256', salt: saltBuf, iterations },
      baseKey,
      KEY_BITS
    ),
    crypto.subtle.deriveKey(
      { name: 'PBKDF2', hash: 'SHA-256', salt: saltBuf, iterations },
      baseKey,
      { name: 'AES-GCM', length: KEY_BITS },
      false,
      ['encrypt', 'decrypt']
    )
  ])
  return { hash: bytesToBase64(new Uint8Array(bits)), key }
}

export async function hashPassword(
  password: string,
  salt: string,
  iterations?: number
): Promise<string> {
  const iters = iterations ?? MIN_ITERATIONS
  const { hash } = await deriveSecrets(password, salt, iters)
  return hash
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

export async function verifyPassword(
  password: string,
  salt: string,
  iterations: number,
  expectedHash: string
): Promise<boolean> {
  const actual = await hashPassword(password, salt, iterations)
  return constantTimeEqual(actual, expectedHash)
}
