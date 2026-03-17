import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NE Heat & Cool Savings",
  description: "A premium weather forecasting application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.className} antialiased bg-slate-50 text-slate-900 min-h-screen`}
      >
        <div className="w-full min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}
