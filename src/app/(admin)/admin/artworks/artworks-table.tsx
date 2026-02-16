"use client";

import { useState } from "react";
import { adminDeleteArtwork, adminUpdateArtwork } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Artwork = {
  id: string;
  title: string;
  imageUrl: string;
  status: "draft" | "pending" | "minted" | "failed";
  mintAddress: string | null;
  createdAt: Date;
  creatorId: string;
  creatorName: string | null;
};

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "secondary",
  pending: "outline",
  minted: "default",
  failed: "destructive",
};

export function ArtworksTable({ artworks }: { artworks: Artwork[] }) {
  const [editArtwork, setEditArtwork] = useState<Artwork | null>(null);
  const [deleteArtwork, setDeleteArtwork] = useState<Artwork | null>(null);

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Creator</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Mint Address</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {artworks.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                No artworks found
              </TableCell>
            </TableRow>
          )}
          {artworks.map((artwork) => (
            <TableRow key={artwork.id}>
              <TableCell className="font-medium max-w-48 truncate">
                {artwork.title}
              </TableCell>
              <TableCell>{artwork.creatorName || "Unknown"}</TableCell>
              <TableCell>
                <Badge variant={statusColors[artwork.status]}>
                  {artwork.status}
                </Badge>
              </TableCell>
              <TableCell className="font-mono text-xs">
                {artwork.mintAddress
                  ? `${artwork.mintAddress.slice(0, 4)}...${artwork.mintAddress.slice(-4)}`
                  : "—"}
              </TableCell>
              <TableCell>
                {artwork.createdAt.toLocaleDateString()}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditArtwork(artwork)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteArtwork(artwork)}
                  >
                    Delete
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Edit Dialog */}
      <Dialog open={!!editArtwork} onOpenChange={() => setEditArtwork(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Artwork</DialogTitle>
            <DialogDescription>Update artwork details.</DialogDescription>
          </DialogHeader>
          {editArtwork && (
            <form
              action={async (formData: FormData) => {
                await adminUpdateArtwork(editArtwork.id, {
                  title: formData.get("title") as string,
                  status: formData.get("status") as Artwork["status"],
                });
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  name="title"
                  defaultValue={editArtwork.title}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  name="status"
                  defaultValue={editArtwork.status}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="draft">Draft</option>
                  <option value="pending">Pending</option>
                  <option value="minted">Minted</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
              <DialogFooter>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog
        open={!!deleteArtwork}
        onOpenChange={() => setDeleteArtwork(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Artwork</DialogTitle>
            <DialogDescription>
              This will permanently delete{" "}
              <strong>{deleteArtwork?.title}</strong> and cascade-delete its
              listings and comments.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteArtwork(null)}>
              Cancel
            </Button>
            <form
              action={async () => {
                if (deleteArtwork)
                  await adminDeleteArtwork(deleteArtwork.id);
              }}
            >
              <Button type="submit" variant="destructive">
                Delete
              </Button>
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
