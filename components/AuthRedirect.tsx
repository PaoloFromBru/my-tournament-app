"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";

export default function AuthRedirect({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isPublic =
    pathname === "/" ||
    pathname === "/create" ||
    pathname === "/demo" ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/reset" ||
    pathname.includes("/public");

  useEffect(() => {
    if (isPublic) return;
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace("/login");
      }
    });
  }, [isPublic, router]);

  return <>{children}</>;
}
