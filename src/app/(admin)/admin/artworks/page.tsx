import { getAdminArtworks } from "@/actions/admin";
import { ArtworksTable } from "./artworks-table";

export default async function AdminArtworksPage() {
  const artworks = await getAdminArtworks();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Artworks</h1>
      <ArtworksTable artworks={artworks} />
    </div>
  );
}
