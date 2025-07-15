import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import NavSelect from "../components/NavSelect";
import AuthButtons from "../components/AuthButtons";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "My Tournament App",
  description: "Manage your babyfoot tournaments",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <header className="p-4 flex items-center gap-4">
          <a href="/" className="flex items-center gap-2 text-xl font-bold">
            <img src="/babyfoot.svg" alt="Babyfoot" className="w-6 h-6" />
            My Tournament App
          </a>
          <NavSelect />
          <AuthButtons />
        </header>
        <main className="p-4">{children}</main>
      </body>
    </html>
  );
}
