import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { teams } = await req.json();
  if (!Array.isArray(teams)) {
    return NextResponse.json({ error: "invalid teams" }, { status: 400 });
  }

  const isPower = (n: number) => (n & (n - 1)) === 0 && n !== 0;
  if (isPower(teams.length)) {
    const matches = [] as { round: number; teamA: number; teamB: number }[];
    for (let i = 0; i < teams.length; i += 2) {
      if (teams[i + 1]) {
        matches.push({ round: 1, teamA: teams[i].id, teamB: teams[i + 1].id });
      }
    }
    return NextResponse.json({ strategy: "knockout", matches });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing API key" }, { status: 500 });
  }

  const prompt =
    'You are an expert tournament organiser. Given a list of teams with their ids and names, create a schedule that minimises the number of rounds needed to determine a winner. Respond only with JSON in the format {"strategy":"string","matches":[{"round":1,"teamA":id,"teamB":id}]}.';

  try {
    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: JSON.stringify(teams) },
        ],
        temperature: 0.7,
      }),
    });

    if (!aiRes.ok) {
      const err = await aiRes.text();
      return NextResponse.json({ error: err }, { status: 500 });
    }

    const data = await aiRes.json();
    const text = data.choices?.[0]?.message?.content || "{}";
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = {};
    }
    return NextResponse.json(json);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'failed' }, { status: 500 });
  }
}
