import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/db/prisma";
import { Sidebar } from "@/components/layout/Sidebar";
import { getTheme } from "@/lib/themes";
import { Heart } from "lucide-react";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { theme: true },
  });
  const theme = getTheme(dbUser?.theme ?? "pink");

  return (
    <div className="min-h-screen flex">
      {Object.keys(theme.vars).length > 0 && (
        <style dangerouslySetInnerHTML={{
          __html: `:root{${Object.entries(theme.vars).map(([k,v])=>`${k}:${v}`).join(';')}}`
        }} />
      )}
      {/* Sidebar — hidden on mobile, shown on md+ */}
      <aside className="hidden md:flex flex-col w-52 shrink-0 border-r border-pink-100 bg-white">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-pink-100">
          <div className="flex items-center gap-2">
            <Heart size={14} className="text-pink-400 fill-pink-400" />
            <span className="font-semibold text-pink-900 text-sm">habit tracker</span>
          </div>
        </div>
        <Sidebar />
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0">{children}</main>

      {/* Bottom nav — mobile only */}
      <nav className="fixed bottom-0 inset-x-0 md:hidden bg-white border-t border-pink-100 flex">
        <Sidebar />
      </nav>
    </div>
  );
}
