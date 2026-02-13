"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { shortenAddress } from "@/lib/utils";
import bs58 from "bs58";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Copy } from "lucide-react";

export function ConnectButton() {
  const { publicKey, signMessage, disconnect, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionWallet, setSessionWallet] = useState<string | null>(null);

  // Check if there's already a valid session
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) {
          setIsAuthenticated(true);
          setSessionWallet(data.walletAddress);
        }
      })
      .catch(() => {});
  }, []);

  const handleAuth = useCallback(async () => {
    if (!publicKey || !signMessage) return;
    setIsAuthenticating(true);

    try {
      const walletAddress = publicKey.toBase58();

      const nonceRes = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "nonce", walletAddress }),
      });
      const { nonce } = await nonceRes.json();

      const messageBytes = new TextEncoder().encode(nonce);
      const signatureBytes = await signMessage(messageBytes);
      const signature = bs58.encode(signatureBytes);

      const verifyRes = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify",
          walletAddress,
          signature,
          message: nonce,
        }),
      });

      if (verifyRes.ok) {
        setIsAuthenticated(true);
        setSessionWallet(walletAddress);
      }
    } catch (error) {
      console.error("Auth failed:", error);
    } finally {
      setIsAuthenticating(false);
    }
  }, [publicKey, signMessage]);

  const handleDisconnect = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setIsAuthenticated(false);
    setSessionWallet(null);
    disconnect();
  }, [disconnect]);

  if (!connected) {
    return (
      <Button
        onClick={() => setVisible(true)}
        variant="outline"
        size="sm"
        className="font-mono text-xs"
      >
        Connect
      </Button>
    );
  }

  const walletAddress = publicKey!.toBase58();
  const needsAuth = !isAuthenticated || sessionWallet !== walletAddress;

  return (
    <div className="flex items-center gap-2">
      {needsAuth && (
        <Button
          onClick={handleAuth}
          disabled={isAuthenticating}
          size="sm"
          className="font-mono text-xs"
        >
          {isAuthenticating ? "Signing..." : "Sign In"}
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="font-mono text-xs text-muted-foreground">
            {shortenAddress(walletAddress)}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => navigator.clipboard.writeText(walletAddress)}
          >
            <Copy className="mr-2 h-3.5 w-3.5" />
            Copy Address
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDisconnect}>
            <LogOut className="mr-2 h-3.5 w-3.5" />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
