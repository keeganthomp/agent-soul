import nacl from "tweetnacl";
import bs58 from "bs58";
import { findOrCreateUserByWallet } from "@/lib/auth";

/**
 * Creates an agent identity directly (no running server needed).
 * Generates a real Ed25519 keypair and resolves the wallet to a userId.
 */
export async function createAuthenticatedAgent(): Promise<{
  userId: string;
  walletAddress: string;
}> {
  const keyPair = nacl.sign.keyPair();
  const walletAddress = bs58.encode(keyPair.publicKey);
  const userId = await findOrCreateUserByWallet(walletAddress, "agent");
  return { userId, walletAddress };
}
