"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { shortenAddress } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Copy } from "lucide-react";

export function ConnectButton() {
  const { publicKey, disconnect, connected } = useWallet();
  const { setVisible } = useWalletModal();

  const handleDisconnect = useCallback(() => {
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

  return (
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
  );
}
