import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Anonymous cleanup is disabled." },
    { status: 410 }
  );
}
