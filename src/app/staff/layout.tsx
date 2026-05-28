"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (pathname === "/staff/login") {
      const token = localStorage.getItem("token");
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          localStorage.removeItem("token");
          setLoading(false);
          return;
        }
        if (payload.role === "STAFF") {
          router.replace("/staff/energy");
          return;
        }
        if (payload.role === "ADMIN") {
          router.replace("/admin");
          return;
        }
        if (payload.role === "BUILDING") {
          router.replace("/building");
          return;
        }
        localStorage.removeItem("token");
      } catch {
        localStorage.removeItem("token");
      }
      setLoading(false);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/staff/login");
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        localStorage.removeItem("token");
        router.push("/staff/login");
        return;
      }
      if (payload.role === "BUILDING") {
        router.push("/building");
        return;
      }
      if (payload.role === "ADMIN") {
        router.push("/admin");
        return;
      }
      if (payload.role !== "STAFF") {
        localStorage.removeItem("token");
        router.push("/staff/login");
        return;
      }
      setUser(payload);
    } catch {
      localStorage.removeItem("token");
      router.push("/staff/login");
    } finally {
      setLoading(false);
    }
  }, [router, pathname]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/");
  };

  if (pathname === "/staff/login") {
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

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14 sm:h-16">
            <div className="flex items-center min-w-0">
              <Link href="/staff" className="shrink-0 flex items-center">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                  Heat-Cool Portal
                </h1>
              </Link>
              <div className="hidden lg:ml-6 lg:flex lg:items-center">
                <Link
                  href="/staff/energy"
                  className={`inline-flex items-center px-2.5 py-2 border-b-2 text-sm font-medium whitespace-nowrap ${
                    pathname === "/staff/energy"
                      ? "border-blue-500 text-gray-900"
                      : "border-transparent text-gray-700 hover:border-gray-300 hover:text-gray-900"
                  }`}
                >
                  <span className="mr-1">⚡</span>
                  Energy
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
              <div className="hidden lg:flex items-center gap-2">
                {user.email && (
                  <span className="text-sm text-gray-700 truncate max-w-[160px] xl:max-w-[200px]" title={user.email}>
                    {user.email}
                  </span>
                )}
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-800">
                  STAFF
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="px-2 sm:px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md cursor-pointer transition-colors whitespace-nowrap"
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
