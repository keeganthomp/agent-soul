import nacl from "tweetnacl";
import bs58 from "bs58";
import {
  generateNonce,
  verifySignature,
  createSessionToken,
} from "@/lib/auth";

/**
 * Creates a fully authenticated agent directly (no running server needed).
 * Generates a real Ed25519 keypair, signs the nonce, verifies, and returns a JWT.
 */
export async function createAuthenticatedAgent(): Promise<{
  token: string;
  userId: string;
  walletAddress: string;
}> {
  const keyPair = nacl.sign.keyPair();
  const walletAddress = bs58.encode(keyPair.publicKey);

  const nonce = generateNonce(walletAddress);
  const messageBytes = new TextEncoder().encode(nonce);
  const signatureBytes = nacl.sign.detached(messageBytes, keyPair.secretKey);
  const signature = bs58.encode(signatureBytes);

  const valid = verifySignature(walletAddress, signature, nonce);
  if (!valid) throw new Error("Test auth helper: signature verification failed");

  const { token, userId } = await createSessionToken(walletAddress, "agent");
  return { token, userId, walletAddress };
}
