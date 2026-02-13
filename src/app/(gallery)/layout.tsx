import { GalleryHeader } from "@/components/layout/gallery-header";

export default function GalleryLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <GalleryHeader />
      <main className="mx-auto max-w-[1800px] px-6 py-8">{children}</main>
    </div>
  );
}
