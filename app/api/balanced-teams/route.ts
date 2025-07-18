import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { players } = await req.json();

  const debug: string[] = [];
  const prompt = `You are a helpful assistant. Create balanced two-player teams from the provided list of players. Each player has an id, offense and defense skill. In each team one player will attack and the other will defend, so a team's offense is the higher offense value of its players and the defense is the higher defense value. Compose the pairs so that all teams have comparable offense and defense ratings and no team is an obvious favourite. Use names from The Lord of the Rings for the team names. Respond with JSON only in the format {"teams": [{"name": "string", "playerIds": [id1, id2]}]}.`;

  debug.push("Retrieving API key...");
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    debug.push("OPENAI_API_KEY not found");
    return NextResponse.json(
      { error: "Missing API key", debug },
      { status: 500 },
    );
  }
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
          { role: "user", content: JSON.stringify(players) },
        ],
        temperature: 0.7,
      }),
    });

    debug.push("OpenAI response received");

    if (!aiRes.ok) {
      debug.push(`OpenAI request failed: ${aiRes.status}`);
      const error = await aiRes.text();
      debug.push(error);
      return NextResponse.json({ error: "openai failed", debug }, { status: 500 });
    }

    const data = await aiRes.json();
    if (!data.choices || data.choices.length === 0) {
      debug.push("OpenAI returned no choices");
      return NextResponse.json({ error: "openai failed", debug }, { status: 500 });
    }
    const text = data.choices[0].message?.content || "{}";
    debug.push("Parsing response...");
    const json = JSON.parse(text);
    debug.push("Returning teams");
    return NextResponse.json({ ...json, debug });
  } catch (err: any) {
    console.error(err);
    debug.push(`Error: ${err?.message || "unknown"}`);
    return NextResponse.json({ error: "failed", debug }, { status: 500 });
  }
}
