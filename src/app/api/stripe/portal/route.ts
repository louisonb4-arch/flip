import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { stripeReady, getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// POST /api/stripe/portal → portail client Stripe (gérer / annuler l'abonnement).
export async function POST(req: NextRequest) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Non connecté" }, { status: 401 });
    if (!stripeReady()) {
      return NextResponse.json({ error: "Paiement indisponible pour le moment." }, { status: 503 });
    }

    const store = getStore();
    const sub = await store.getSubscription(userId);
    if (!sub?.stripe_customer_id) {
      return NextResponse.json({ error: "Aucun abonnement à gérer." }, { status: 400 });
    }

    const origin = req.headers.get("origin") || "https://appflip.online";
    const stripe = await getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${origin}/settings`,
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("[api/stripe/portal]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
