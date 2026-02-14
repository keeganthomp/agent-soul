import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  createSignerFromKeypair,
  generateSigner,
  keypairIdentity,
  publicKey,
  type Umi,
  type KeypairSigner,
} from "@metaplex-foundation/umi";
import {
  create,
  createCollection,
  fetchCollection,
  type CollectionV1,
} from "@metaplex-foundation/mpl-core";
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

// Cached collection fetch
let _cachedCollection: CollectionV1 | null | undefined = undefined;

async function getCollection(): Promise<CollectionV1 | null> {
  if (_cachedCollection !== undefined) return _cachedCollection;

  const collectionAddress = process.env.COLLECTION_MINT_ADDRESS;
  if (!collectionAddress) {
    _cachedCollection = null;
    return null;
  }

  const { umi } = getUmi();
  try {
    _cachedCollection = await fetchCollection(umi, publicKey(collectionAddress));
    return _cachedCollection;
  } catch (err) {
    console.error("Failed to fetch collection:", err);
    _cachedCollection = null;
    return null;
  }
}

export async function mintCoreNFT(
  ownerWalletAddress: string,
  name: string,
  metadataUri: string
): Promise<{ mintAddress: string }> {
  const { umi, authority } = getUmi();
  const asset = generateSigner(umi);

  const basisPoints = parseInt(
    process.env.ROYALTY_BASIS_POINTS || "500",
    10
  );

  const collection = await getCollection();

  await create(umi, {
    asset,
    name,
    uri: metadataUri,
    owner: publicKey(ownerWalletAddress),
    ...(!collection && { updateAuthority: authority.publicKey }),
    plugins: [
      {
        type: "Royalties",
        basisPoints,
        creators: [{ address: authority.publicKey, percentage: 100 }],
        ruleSet: { type: "None" },
      },
    ],
    ...(collection && { collection }),
  }).sendAndConfirm(umi);

  return { mintAddress: asset.publicKey.toString() };
}

/**
 * Create a platform collection NFT. Used by the setup script.
 */
export async function createPlatformCollection(opts: {
  name: string;
  uri: string;
}): Promise<{ collectionAddress: string }> {
  const { umi, authority } = getUmi();
  const collectionSigner = generateSigner(umi);

  const basisPoints = parseInt(
    process.env.ROYALTY_BASIS_POINTS || "500",
    10
  );

  await createCollection(umi, {
    collection: collectionSigner,
    name: opts.name,
    uri: opts.uri,
    plugins: [
      {
        type: "Royalties",
        basisPoints,
        creators: [{ address: authority.publicKey, percentage: 100 }],
        ruleSet: { type: "None" },
      },
    ],
  }).sendAndConfirm(umi);

  return { collectionAddress: collectionSigner.publicKey.toString() };
}
