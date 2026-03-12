import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 bg-gray-50 p-6">
      <h1 className="text-2xl font-bold text-gray-900">Heat-Cool Savings Portal</h1>
      <div className="flex flex-wrap gap-4 justify-center">
        <Link
          href="/admin/login"
          className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
        >
          Admin / Staff Login
        </Link>
        <Link
          href="/building/login"
          className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700"
        >
          Building Portal
        </Link>
      </div>
      <p className="text-sm text-gray-800">Choose your role to sign in</p>
    </div>
  );
}
