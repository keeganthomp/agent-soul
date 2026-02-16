"use client";

import { useState, useTransition } from "react";
import { adminDeleteArtist, adminUpdateArtist } from "@/actions/admin";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";

type Artist = {
  id: string;
  walletAddress: string;
  displayName: string | null;
  bio: string | null;
  artStyle: string | null;
  avatar: string | null;
  totalArtworks: number;
  createdAt: Date;
};

export function ArtistsTable({ artists }: { artists: Artist[] }) {
  const [editArtist, setEditArtist] = useState<Artist | null>(null);
  const [deleteArtist, setDeleteArtist] = useState<Artist | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Wallet</TableHead>
            <TableHead>Artworks</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {artists.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                No artists found
              </TableCell>
            </TableRow>
          )}
          {artists.map((artist) => (
            <TableRow key={artist.id}>
              <TableCell className="font-medium">
                {artist.displayName || "Unnamed"}
                {artist.artStyle && (
                  <Badge variant="secondary" className="ml-2">
                    {artist.artStyle}
                  </Badge>
                )}
              </TableCell>
              <TableCell className="font-mono text-xs">
                {artist.walletAddress.slice(0, 4)}...
                {artist.walletAddress.slice(-4)}
              </TableCell>
              <TableCell>{artist.totalArtworks}</TableCell>
              <TableCell>
                {artist.createdAt.toLocaleDateString()}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditArtist(artist)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteArtist(artist)}
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
      <Dialog open={!!editArtist} onOpenChange={() => setEditArtist(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Artist</DialogTitle>
            <DialogDescription>
              Update artist profile information.
            </DialogDescription>
          </DialogHeader>
          {editArtist && (
            <form
              action={async (formData: FormData) => {
                await adminUpdateArtist(editArtist.id, {
                  displayName: formData.get("displayName") as string,
                  bio: formData.get("bio") as string,
                  artStyle: formData.get("artStyle") as string,
                  avatar: formData.get("avatar") as string,
                });
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  name="displayName"
                  defaultValue={editArtist.displayName ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Input
                  id="bio"
                  name="bio"
                  defaultValue={editArtist.bio ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="artStyle">Art Style</Label>
                <Input
                  id="artStyle"
                  name="artStyle"
                  defaultValue={editArtist.artStyle ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="avatar">Avatar URL</Label>
                <Input
                  id="avatar"
                  name="avatar"
                  defaultValue={editArtist.avatar ?? ""}
                />
              </div>
              <DialogFooter>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteArtist}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setDeleteArtist(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Artist</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <strong>{deleteArtist?.displayName || "this artist"}</strong> and
              cascade-delete their listings, comments, and activity. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isDeleting}
              onClick={(e) => {
                e.preventDefault();
                if (!deleteArtist) return;
                startDeleteTransition(async () => {
                  await adminDeleteArtist(deleteArtist.id);
                  setDeleteArtist(null);
                });
              }}
            >
              {isDeleting && <Loader2 className="size-4 animate-spin" />}
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
