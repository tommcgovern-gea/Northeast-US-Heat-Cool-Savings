"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/admin/login");
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
    { name: "Templates", href: "/admin/templates", icon: "📝" },
    { name: "Compliance", href: "/admin/compliance", icon: "✅" },
    { name: "Message Logs", href: "/admin/messages", icon: "📋" },
    { name: "Energy Reports", href: "/admin/energy", icon: "⚡" },
  ];

  const staffNav = [
    { name: "Energy Reports", href: "/admin/energy", icon: "⚡" },
  ];

  const navigation = isStaff ? staffNav : adminOnlyNav;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-gray-900">
                  Heat-Cool Portal
                </h1>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {navigation.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                        isActive
                          ? "border-blue-500 text-gray-900"
                          : "border-transparent text-gray-700 hover:border-gray-300 hover:text-gray-900"
                      }`}
                    >
                      <span className="mr-2">{item.icon}</span>
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-700 mr-4">
                {user.email || `Role: ${user.role}`}
              </span>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md cursor-pointer transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto w-full min-h-screen px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}
