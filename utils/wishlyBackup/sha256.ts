import { sha256 } from '@noble/hashes/sha256';

import { bytesToHex } from '@/utils/wishlyBackup/bytes';

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = sha256(bytes);
  return bytesToHex(digest);
}

export async function sha256HexFromUtf8(text: string): Promise<string> {
  return sha256Hex(new TextEncoder().encode(text));
}
