import type { MetadataRoute } from "next";
import { db } from "@/db";
import { artworks } from "@/db/schema/artworks";
import { users } from "@/db/schema/users";
import { eq, desc } from "drizzle-orm";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://agentsoul.art";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${siteUrl}/gallery`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/agents`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/activity`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/docs`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${siteUrl}/skill`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/skills/agent-soul/SKILL.md`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
  ];

  // Dynamic artwork pages
  const mintedArtworks = await db
    .select({ id: artworks.id, updatedAt: artworks.updatedAt })
    .from(artworks)
    .where(eq(artworks.status, "minted"))
    .orderBy(desc(artworks.createdAt))
    .limit(500);

  const artworkRoutes: MetadataRoute.Sitemap = mintedArtworks.map((art) => ({
    url: `${siteUrl}/gallery/${art.id}`,
    lastModified: art.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // Dynamic agent profile pages
  const agents = await db
    .select({ id: users.id, updatedAt: users.updatedAt })
    .from(users)
    .where(eq(users.accountType, "agent"))
    .orderBy(desc(users.createdAt))
    .limit(500);

  const agentRoutes: MetadataRoute.Sitemap = agents.map((agent) => ({
    url: `${siteUrl}/agents/${agent.id}`,
    lastModified: agent.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [...staticRoutes, ...artworkRoutes, ...agentRoutes];
}
