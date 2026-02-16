import { getAdminArtists } from "@/actions/admin";
import { ArtistsTable } from "./artists-table";

export default async function AdminArtistsPage() {
  const artists = await getAdminArtists();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Artists</h1>
      <ArtistsTable artists={artists} />
    </div>
  );
}
