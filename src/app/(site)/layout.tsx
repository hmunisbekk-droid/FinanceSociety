import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getCurrentUser } from "@/lib/auth";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <>
      <SiteHeader user={user ? { name: user.profile.full_name || user.email, role: user.profile.role } : null} />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}
