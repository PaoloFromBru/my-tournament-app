import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { teams } = await req.json();
  const debug: string[] = [];
  if (!Array.isArray(teams)) {
    debug.push("Invalid teams payload");
    return NextResponse.json({ error: "invalid teams", debug }, { status: 400 });
  }

  const isPower = (n: number) => (n & (n - 1)) === 0 && n !== 0;
  if (isPower(teams.length)) {
    const matches = [] as { round: number; teamA: number; teamB: number }[];
    for (let i = 0; i < teams.length; i += 2) {
      if (teams[i + 1]) {
        matches.push({ round: 1, teamA: teams[i].id, teamB: teams[i + 1].id });
      }
    }
    debug.push("Number of teams is power of two - no AI needed");
    return NextResponse.json({ strategy: "knockout", matches, debug });
  }

  // Determine how many byes are needed to reach the next power of two
  const nextPower = 2 ** Math.ceil(Math.log2(teams.length));
  const byes = nextPower - teams.length;

  const matches: { round: number; teamA: number; teamB: number | null }[] = [];

  // Assign byes to the first teams in the list
  for (let i = 0; i < byes; i++) {
    const team = teams[i];
    matches.push({ round: 1, teamA: team.id, teamB: null });
  }

  // Pair the remaining teams
  for (let i = byes; i < teams.length; i += 2) {
    const a = teams[i];
    const b = teams[i + 1];
    matches.push({ round: 1, teamA: a.id, teamB: b ? b.id : null });
  }

  debug.push("Generated schedule locally");
  return NextResponse.json({ strategy: "knockout", matches, debug });
}
