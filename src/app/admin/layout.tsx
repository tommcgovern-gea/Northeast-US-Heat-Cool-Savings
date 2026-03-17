"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      {open ? (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      )}
    </svg>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (pathname === "/admin/login") {
      setLoading(false);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/admin/login");
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        localStorage.removeItem("token");
        router.push("/admin/login");
        return;
      }
      if (payload.role === "BUILDING") {
        router.push("/building");
        return;
      }
      if (payload.role === "STAFF" && pathname === "/admin") {
        router.push("/admin/energy");
        return;
      }
      setUser(payload);
    } catch {
      localStorage.removeItem("token");
      router.push("/admin/login");
    } finally {
      setLoading(false);
    }
  }, [router, pathname]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/");
  };

  // Skip layout for login page
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const isAdmin = user.role === "ADMIN";
  const isStaff = user.role === "STAFF";

  const adminOnlyNav = [
    { name: "Dashboard", href: "/admin", icon: "📊" },
    { name: "Cities", href: "/admin/cities", icon: "🏙️" },
    { name: "Buildings", href: "/admin/buildings", icon: "🏢" },
    { name: "Recipients", href: "/admin/recipients", icon: "👥" },
    { name: "Staff Signup Details", short: "Staff", href: "/admin/staff", icon: "👤" },
    { name: "Templates", href: "/admin/templates", icon: "📝" },
    { name: "Compliance", href: "/admin/compliance", icon: "✅" },
    { name: "Message Logs", short: "Messages", href: "/admin/messages", icon: "📋" },
    { name: "Energy Reports", short: "Energy", href: "/admin/energy", icon: "⚡" },
  ];

  const staffNav = [
    { name: "Energy Reports", short: "Energy", href: "/admin/energy", icon: "⚡" },
  ];

  const navigation = isStaff ? staffNav : adminOnlyNav;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14 sm:h-16">
            <div className="flex items-center min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen((o) => !o)}
                className="lg:hidden p-2 -ml-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                aria-expanded={mobileMenuOpen}
                aria-label="Toggle menu"
              >
                <MenuIcon open={mobileMenuOpen} />
              </button>
              <Link href="/admin" className="shrink-0 flex items-center">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                  Heat-Cool Portal
                </h1>
              </Link>
              <div className="hidden lg:ml-6 lg:flex lg:items-center lg:gap-x-0.5">
                {navigation.map((item) => {
                  const isActive = pathname === item.href;
                  const label = "short" in item && item.short ? item.short : item.name;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={item.name}
                      className={`inline-flex items-center px-2.5 py-2 border-b-2 text-sm font-medium whitespace-nowrap ${
                        isActive
                          ? "border-blue-500 text-gray-900"
                          : "border-transparent text-gray-700 hover:border-gray-300 hover:text-gray-900"
                      }`}
                    >
                      <span className="mr-1">{item.icon}</span>
                      {label}
                    </Link>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
              <span className="hidden lg:inline text-sm text-gray-700 truncate max-w-[180px] xl:max-w-[220px]" title={user.email || undefined}>
                {user.email || `Role: ${user.role}`}
              </span>
              <button
                onClick={handleLogout}
                className="px-2 sm:px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md cursor-pointer transition-colors whitespace-nowrap"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 bg-white">
            <div className="px-4 pt-2 pb-4 space-y-1">
              <div className="px-3 py-2 text-xs font-medium text-gray-500 border-b border-gray-100 mb-2">
                {user.email || `Role: ${user.role}`}
              </div>
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                const label = "short" in item && item.short ? item.short : item.name;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={item.name}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
                      isActive
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <span className="mr-3">{item.icon}</span>
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      <main className="max-w-7xl mx-auto w-full min-h-screen px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}
