import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { stripeReady, getStripe, priceIdForPlan } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// POST /api/stripe/checkout { plan } → crée une Checkout Session, renvoie l'URL Stripe.
export async function POST(req: NextRequest) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Non connecté" }, { status: 401 });
    if (!stripeReady()) {
      return NextResponse.json({ error: "Paiement indisponible pour le moment." }, { status: 503 });
    }

    const body = await req.json().catch(() => ({}));
    const plan = body.plan;
    if (plan !== "flip_mini" && plan !== "flip_plus" && plan !== "flip_ultra") {
      return NextResponse.json({ error: "Plan invalide" }, { status: 400 });
    }
    const price = priceIdForPlan(plan);
    if (!price) {
      return NextResponse.json({ error: "Tarif non configuré (Price ID manquant)." }, { status: 503 });
    }

    const store = getStore();
    const user = await store.getUser(userId);
    const sub = await store.getSubscription(userId);
    const origin = req.headers.get("origin") || "https://appflip.online";

    const stripe = await getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price, quantity: 1 }],
      client_reference_id: userId,
      metadata: { userId, plan },
      subscription_data: { metadata: { userId, plan } },
      customer: sub?.stripe_customer_id || undefined,
      customer_email: sub?.stripe_customer_id ? undefined : user?.email || undefined,
      allow_promotion_codes: true,
      success_url: `${origin}/settings?checkout=success`,
      cancel_url: `${origin}/settings?checkout=cancel`,
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[api/stripe/checkout] ERR:", msg);
    return NextResponse.json({ error: "Erreur serveur", detail: msg }, { status: 500 });
  }
}
