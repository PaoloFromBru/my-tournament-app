"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavButtons() {
  const pathname = usePathname();
  const tabs = [
    { href: "/players", label: "Players" },
    { href: "/teams", label: "Teams" },
    { href: "/tournaments", label: "Tournaments" },
  ];

  return (
    <div className="flex gap-2 mt-4 border-b">
      {tabs.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-3 py-1 text-sm rounded-t-md ${active ? "bg-white border-x border-t border-gray-300" : "bg-gray-100 hover:bg-gray-200"}`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
