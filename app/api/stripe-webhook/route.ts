import { NextRequest, NextResponse } from "next/server";
import { headers as getHeaders } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { createHmac, timingSafeEqual } from "crypto";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

function verifySignature(body: string, sigHeader: string, secret: string) {
  const sig: Record<string, string> = {};
  for (const part of sigHeader.split(",")) {
    const [k, v] = part.split("=");
    sig[k] = v;
  }
  const timestamp = sig["t"];
  const signature = sig["v1"];
  if (!timestamp || !signature) throw new Error("Invalid signature header");

  const payload = `${timestamp}.${body}`;
  const digest = createHmac("sha256", secret).update(payload).digest("hex");

  if (!timingSafeEqual(Buffer.from(digest), Buffer.from(signature))) {
    throw new Error("Signature mismatch");
  }
}

export async function POST(req: NextRequest) {
  if (!webhookSecret) {
    return NextResponse.json({ error: "Missing webhook secret" }, { status: 500 });
  }
  const signature = (await getHeaders()).get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const body = await req.text();

  try {
    verifySignature(body, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(body);

  if (event.type === "checkout.session.completed") {
    const email = event.data?.object?.customer_details?.email;
    if (email && supabaseUrl && serviceRoleKey) {
      const supabase = createClient(supabaseUrl, serviceRoleKey);
      const { data: user } = await supabase.auth.admin.getUserByEmail(email);
      const userId = user?.id;
      if (userId) {
        await supabase
          .from("user_profiles")
          .update({
            paying_status: "donated",
            donation_date: new Date().toISOString(),
          })
          .eq("user_id", userId);
      }
    }
  }

  return NextResponse.json({ received: true });
}
