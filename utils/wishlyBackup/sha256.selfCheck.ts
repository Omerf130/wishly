/**
 * Run: npx tsx utils/wishlyBackup/sha256.selfCheck.ts
 */
import { sha256Hex, sha256HexFromUtf8 } from '@/utils/wishlyBackup/sha256';

/** NIST / independent reference digests (lowercase hex). */
const VECTORS = {
  empty: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  abc: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
  hebrewShalom: 'b7ac0398ef74193ab738b21df0912329303df10d868c2bac37a84a59d12c0e2f',
  bytes00ff: '06eb7d6a69ee19e5fbdf749018d3d2abfa04bcbd1365db312eb86dc7169389b8',
} as const;

function assertEqual(actual: string, expected: string, label: string): void {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

function assertHexFormat(hex: string, label: string): void {
  if (hex.length !== 64 || hex !== hex.toLowerCase() || !/^[0-9a-f]+$/.test(hex)) {
    throw new Error(`${label}: invalid sha256 hex output`);
  }
}

export async function runSha256VectorSelfCheck(): Promise<void> {
  assertEqual(await sha256Hex(new Uint8Array(0)), VECTORS.empty, 'empty bytes');
  assertEqual(await sha256HexFromUtf8(''), VECTORS.empty, 'empty utf8');
  assertEqual(await sha256HexFromUtf8('abc'), VECTORS.abc, 'abc utf8');
  assertEqual(await sha256HexFromUtf8('שלום'), VECTORS.hebrewShalom, 'hebrew utf8');
  assertEqual(await sha256Hex(new Uint8Array([0x00, 0xff])), VECTORS.bytes00ff, 'binary 0x00 0xff');

  for (const [label, hex] of Object.entries(VECTORS)) {
    assertHexFormat(hex, label);
  }
}

runSha256VectorSelfCheck()
  .then(() => {
    console.log('wishlyBackup sha256.selfCheck: all passed');
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
