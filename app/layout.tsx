import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import NavButtons from "../components/NavButtons";
import AuthButtons from "../components/AuthButtons";
import LoginOverlay from "../components/LoginOverlay";

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
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <LoginOverlay>
          <header className="p-4 flex flex-col">
            <div className="flex items-center gap-4">
              <a href="/" className="flex items-center gap-2 text-xl font-bold">
                <img src="/babyfoot.svg" alt="Babyfoot" className="w-6 h-6" />
                My Tournament App
              </a>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <AuthButtons />
            </div>
            <NavButtons />
          </header>
          <main className="p-4">{children}</main>
        </LoginOverlay>
      </body>
    </html>
  );
}
