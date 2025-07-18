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

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    debug.push("OPENAI_API_KEY not found");
    return NextResponse.json({ error: "Missing API key", debug }, { status: 500 });
  }

  const prompt =
    'You are an expert tournament organiser. Given a list of teams with their ids and names, create a schedule that minimises the number of rounds needed to determine a winner. Respond only with JSON in the format {"strategy":"string","matches":[{"round":1,"teamA":id,"teamB":id}]}.';

  debug.push("Key retrieved, contacting OpenAI...");
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

    debug.push("OpenAI response received");
    if (!aiRes.ok) {
      debug.push(`OpenAI request failed: ${aiRes.status}`);
      const err = await aiRes.text();
      debug.push(err);
      return NextResponse.json({ error: err, debug }, { status: 500 });
    }

    const data = await aiRes.json();
    const text = data.choices?.[0]?.message?.content || "{}";
    let json;
    try {
      debug.push("Parsing response...");
      json = JSON.parse(text);
    } catch {
      debug.push("Failed to parse response");
      json = {};
    }
    debug.push("Returning schedule");
    return NextResponse.json({ ...json, debug });
  } catch (err: any) {
    console.error(err);
    debug.push(`Error: ${err?.message || 'unknown'}`);
    return NextResponse.json({ error: err?.message || 'failed', debug }, { status: 500 });
  }
}
