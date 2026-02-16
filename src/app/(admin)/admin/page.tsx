import { getAdminStats } from "@/actions/admin";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

export default async function AdminDashboardPage() {
  const stats = await getAdminStats();

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/admin/artists">
          <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Artists
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.artists}</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/artworks">
          <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Artworks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.artworks}</p>
            </CardContent>
          </Card>
        </Link>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Listings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.activeListings}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
