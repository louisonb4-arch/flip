import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { getSessionUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

const BOOL_KEYS = [
  "bio_enabled",
  "photo_enabled",
  "name_enabled",
  "link_enabled",
  "private_public_enabled",
  "followers_enabled",
  "posts_enabled",
  "push_enabled",
  "email_enabled",
] as const;

export async function GET() {
  try {
    const store = getStore();
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Non connecté" }, { status: 401 });
    const [settings, user] = await Promise.all([store.getSettings(userId), store.getUser(userId)]);
    return NextResponse.json({ settings, user });
  } catch (e) {
    console.error("[api/settings GET]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const store = getStore();
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Non connecté" }, { status: 401 });
    const body = await req.json().catch(() => ({}));

    // toggle plan (dev/demo — en prod : Stripe webhook)
    if (body.plan === "flip_mini" || body.plan === "flip_plus" || body.plan === "flip_ultra") {
      await store.setPlan(userId, body.plan);
    }

    const patch: Record<string, boolean> = {};
    for (const k of BOOL_KEYS) if (typeof body[k] === "boolean") patch[k] = body[k];
    const settings = Object.keys(patch).length
      ? await store.updateSettings(userId, patch)
      : await store.getSettings(userId);

    const user = await store.getUser(userId);
    return NextResponse.json({ settings, user });
  } catch (e) {
    console.error("[api/settings PATCH]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
