import { GalleryHeader } from "@/components/layout/gallery-header";

export default function GalleryLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <GalleryHeader />
      <main className="mx-auto max-w-[1800px] px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
