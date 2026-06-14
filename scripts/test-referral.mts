// Test logique parrainage + accès (DevStore réel, 2 users distincts).
// Lancé avec env Supabase vidé → getStore() = DevStore.
import { promises as fs } from "node:fs";
import path from "node:path";

const dataDir = path.join(process.cwd(), ".data");
const file = path.join(dataDir, "dev-db.json");

const PARRAIN = "parrain-1";
const FILLEUL = "filleul-1";

// Seed : 2 users, un code pour le parrain.
await fs.mkdir(dataDir, { recursive: true });
await fs.writeFile(
  file,
  JSON.stringify({
    users: [
      { id: PARRAIN, email: "parrain@flip.app", plan: "flip_mini", created_at: "2026-06-10T00:00:00.000Z" },
      { id: FILLEUL, email: "filleul@flip.app", plan: "flip_mini", created_at: new Date().toISOString() },
    ],
    settings: [],
    platformProfiles: [],
    tracked: [],
    snapshots: [],
    changes: [],
    notifications: [],
    pushSubscriptions: [],
    referralCodes: [{ user_id: PARRAIN, code: "PARRAIN1" }],
    referrals: [],
    referralRewards: [],
    userBonusDays: [],
  }),
);

const { getStore } = await import("../src/lib/store.ts");
const { applyReferralCode, getReferralData } = await import("../src/lib/referrals.ts");
const { getAccessStatus, BASE_TRIAL_DAYS } = await import("../src/lib/access.ts");

const store = getStore();
let pass = 0,
  fail = 0;
const ok = (c: boolean, m: string) => (c ? (pass++, console.log("✅", m)) : (fail++, console.log("❌", m)));

// 1. Anti auto-parrainage
const self = await applyReferralCode("PARRAIN1", PARRAIN, store);
ok(!self.ok, `anti auto-parrainage rejeté (${self.error})`);

// 2. Code invalide
const bad = await applyReferralCode("NOPE9999", FILLEUL, store);
ok(!bad.ok, `code invalide rejeté (${bad.error})`);

// 3. Filleul applique le code du parrain
const applied = await applyReferralCode("PARRAIN1", FILLEUL, store);
ok(applied.ok, "filleul applique le code → ok");

// 4. Parrain : +1 parrainage
const parrainData = await getReferralData(PARRAIN, store, "http://x");
ok(parrainData.referral_count === 1, `parrain referral_count = ${parrainData.referral_count} (attendu 1)`);

// 5. Filleul : +3 jours bonus
const bonus = await store.getTotalBonusDays(FILLEUL);
ok(bonus === 3, `filleul bonus = ${bonus} jours (attendu 3)`);

// 6. Double application (refresh / double submit) → pas de double crédit
const again = await applyReferralCode("PARRAIN1", FILLEUL, store);
ok(!again.ok, `double application rejetée (${again.error})`);
const bonusAfter = await store.getTotalBonusDays(FILLEUL);
ok(bonusAfter === 3, `filleul bonus toujours = ${bonusAfter} (pas de double crédit)`);

// 7. Accès filleul = essai + 3 jours bonus
const access = await getAccessStatus(FILLEUL, store);
ok(access.bonusDays === 3, `access.bonusDays = ${access.bonusDays}`);
ok(access.hasAccess === true, `access.hasAccess = ${access.hasAccess}`);
ok(
  access.daysLeft >= BASE_TRIAL_DAYS + 3 - 1 && access.daysLeft <= BASE_TRIAL_DAYS + 3,
  `access.daysLeft = ${access.daysLeft} (~${BASE_TRIAL_DAYS + 3})`,
);

// 8. Parrain sous le 1er palier (3) → aucune récompense débloquée
ok(
  parrainData.rewards.every((r) => !r.unlocked),
  "parrain : aucun palier débloqué à 1 parrainage",
);

console.log(`\n${pass} pass, ${fail} fail`);
await fs.rm(file, { force: true });
process.exit(fail === 0 ? 0 : 1);
