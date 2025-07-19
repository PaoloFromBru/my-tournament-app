"use client";
import Link from "next/link";

export default function NavButtons() {
  return (
    <div className="flex gap-2 mt-2">
      <Link
        href="/players"
        className="border bg-gray-200 px-2 py-0.5"
      >
        Players
      </Link>
      <Link
        href="/teams"
        className="border bg-gray-200 px-2 py-0.5"
      >
        Teams
      </Link>
      <Link
        href="/tournaments"
        className="border bg-gray-200 px-2 py-0.5"
      >
        Tournaments
      </Link>
    </div>
  );
}
