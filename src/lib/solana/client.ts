import { Connection, clusterApiUrl } from "@solana/web3.js";

const network = (process.env.NEXT_PUBLIC_SOLANA_NETWORK || "devnet") as
  | "devnet"
  | "mainnet-beta"
  | "localhost";

const rpcUrl =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
  process.env.SOLANA_RPC_URL ||
  (network === "localhost" ? "http://127.0.0.1:8899" : clusterApiUrl(network));

export const connection = new Connection(rpcUrl, "confirmed");
export const solanaNetwork = network;
