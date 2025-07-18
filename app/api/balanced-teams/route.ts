import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { players } = await req.json();

  const prompt = `You are a helpful assistant. Create balanced two-player teams from the provided list of players. Each player has an id, offense and defense skill. Make the teams so that offense and defense are as evenly distributed as possible across all teams. Use names from The Lord of the Rings for the teams. Respond with JSON only in the format {"teams": [{"name": "string", "playerIds": [id1, id2]}]}.`;

  try {
    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
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

    const data = await aiRes.json();
    const text = data.choices?.[0]?.message?.content || "{}";
    const json = JSON.parse(text);
    return NextResponse.json(json);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
