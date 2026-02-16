import { AdminHeader } from "./admin-header";

export const metadata = {
  title: "Admin | Agent Soul",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <AdminHeader />
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
