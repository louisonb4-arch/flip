import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStore } from "@/lib/store";
import { getStripe, planForPriceId } from "@/lib/stripe";
import type { Plan } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// POST /api/stripe/webhook — Stripe envoie les événements ici. Signature vérifiée.
export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook non configuré" }, { status: 503 });

  const sig = req.headers.get("stripe-signature");
  const raw = await req.text();
  const stripe = await getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig ?? "", secret);
  } catch (e) {
    console.warn("[stripe webhook] signature invalide:", (e as Error).message);
    return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
  }

  const store = getStore();
  try {
    if (event.type === "checkout.session.completed") {
      const s = event.data.object as Stripe.Checkout.Session;
      const userId = (s.metadata?.userId as string) || (s.client_reference_id as string) || "";
      const plan = (s.metadata?.plan as Plan) || null;
      if (userId) {
        await store.upsertSubscription(userId, {
          stripe_customer_id: typeof s.customer === "string" ? s.customer : undefined,
          stripe_subscription_id: typeof s.subscription === "string" ? s.subscription : undefined,
          status: "active",
          plan: plan ?? undefined,
        });
        if (plan) await store.setPlan(userId, plan);
        console.log(`[stripe] checkout completed user=${userId} plan=${plan}`);
      }
    } else if (event.type === "customer.subscription.updated") {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      const userId =
        (sub.metadata?.userId as string) ||
        (await store.getSubscriptionByCustomer(customerId))?.user_id ||
        "";
      const plan = planForPriceId(sub.items?.data?.[0]?.price?.id);
      if (userId) {
        await store.upsertSubscription(userId, {
          stripe_customer_id: customerId,
          stripe_subscription_id: sub.id,
          status: sub.status,
          plan: plan ?? undefined,
        });
        if (plan && (sub.status === "active" || sub.status === "trialing")) {
          await store.setPlan(userId, plan);
        }
        console.log(`[stripe] sub updated user=${userId} plan=${plan} status=${sub.status}`);
      }
    } else if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      const userId = (sub.metadata?.userId as string) || (await store.getSubscriptionByCustomer(customerId))?.user_id || "";
      if (userId) {
        await store.upsertSubscription(userId, { status: "canceled" });
        await store.setPlan(userId, "flip_mini");
        console.log(`[stripe] sub canceled user=${userId} → flip_mini`);
      }
    }
    return NextResponse.json({ received: true });
  } catch (e) {
    console.error("[stripe webhook handler]", e);
    return NextResponse.json({ error: "Erreur traitement" }, { status: 500 });
  }
}
