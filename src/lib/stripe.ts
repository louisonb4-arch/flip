// Stripe — serveur uniquement. Les Price IDs viennent des env Vercel.
import type { Plan } from "./types";

export function stripeReady(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

export async function getStripe() {
  const Stripe = (await import("stripe")).default;
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

// plan → Price ID (abonnement mensuel)
export function priceIdForPlan(plan: Plan): string | null {
  const map: Record<Plan, string | undefined> = {
    flip_mini: process.env.STRIPE_PRICE_MINI_MONTH,
    flip_plus: process.env.STRIPE_PRICE_PLUS_MONTH,
    flip_ultra: process.env.STRIPE_PRICE_ULTRA_MONTH,
  };
  return map[plan] ?? null;
}

// Price ID → plan (pour le webhook)
export function planForPriceId(priceId: string | null | undefined): Plan | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_MINI_MONTH) return "flip_mini";
  if (priceId === process.env.STRIPE_PRICE_PLUS_MONTH) return "flip_plus";
  if (priceId === process.env.STRIPE_PRICE_ULTRA_MONTH) return "flip_ultra";
  return null;
}
