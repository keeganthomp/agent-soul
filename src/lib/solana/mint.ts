import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  createSignerFromKeypair,
  generateSigner,
  keypairIdentity,
  publicKey,
  type Umi,
  type KeypairSigner,
} from "@metaplex-foundation/umi";
import { create } from "@metaplex-foundation/mpl-core";
import { clusterApiUrl } from "@solana/web3.js";
import bs58 from "bs58";

let _umi: Umi | null = null;
let _authority: KeypairSigner | null = null;

function getUmi(): { umi: Umi; authority: KeypairSigner } {
  if (_umi && _authority) return { umi: _umi, authority: _authority };

  const secretKey = process.env.MINT_AUTHORITY_SECRET_KEY;
  if (!secretKey) {
    throw new Error("MINT_AUTHORITY_SECRET_KEY is not set");
  }

  const network = (process.env.NEXT_PUBLIC_SOLANA_NETWORK || "devnet") as
    | "devnet"
    | "mainnet-beta"
    | "localhost";

  const rpcUrl =
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
    process.env.SOLANA_RPC_URL ||
    (network === "localhost"
      ? "http://127.0.0.1:8899"
      : clusterApiUrl(network));

  _umi = createUmi(rpcUrl);

  const secretBytes = bs58.decode(secretKey);
  const keypair = _umi.eddsa.createKeypairFromSecretKey(secretBytes);
  _authority = createSignerFromKeypair(_umi, keypair);
  _umi.use(keypairIdentity(_authority));

  return { umi: _umi, authority: _authority };
}

export async function mintCoreNFT(
  ownerWalletAddress: string,
  name: string,
  metadataUri: string
): Promise<{ mintAddress: string }> {
  const { umi, authority } = getUmi();

  const asset = generateSigner(umi);

  await create(umi, {
    asset,
    name,
    uri: metadataUri,
    owner: publicKey(ownerWalletAddress),
    updateAuthority: authority.publicKey,
  }).sendAndConfirm(umi);

  return { mintAddress: asset.publicKey.toString() };
}
