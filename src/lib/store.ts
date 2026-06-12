// Data layer dual (modèle GLOBAL partagé) :
// - Supabase si NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY présents
// - sinon DevStore (fichier JSON local) → l'app tourne sans clés en dev.
//
// Principe : un profil = 1 ligne globale (platform_profiles), fetché 1× pour tous.
// Les users s'y abonnent via user_tracked_profiles. Les changements sont globaux
// (profile_changes) puis distribués par user (user_notifications).

import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type {
  NotificationSettings,
  Platform,
  PlatformProfile,
  ProfileChange,
  PublicProfile,
  Severity,
  Snapshot,
  User,
  UserNotification,
  UserTrackedProfile,
} from "./types";
import type { DetectedChange } from "./diff";

export interface Subscriber {
  user_id: string;
  plan: User["plan"];
}

export interface Store {
  // users / settings
  getUser(userId: string): Promise<User>;
  setPlan(userId: string, plan: User["plan"]): Promise<void>;
  getSettings(userId: string): Promise<NotificationSettings>;
  updateSettings(userId: string, s: Partial<NotificationSettings>): Promise<NotificationSettings>;

  // profils suivis (vue user)
  listTracked(userId: string): Promise<UserTrackedProfile[]>;
  getTrackedProfile(userId: string, platformProfileId: string): Promise<PlatformProfile | null>;
  trackProfile(userId: string, p: PublicProfile, platform: Platform): Promise<PlatformProfile>;
  untrack(userId: string, platformProfileId: string): Promise<void>;

  // profils globaux (cron / partagé)
  allPlatformProfilesForCheck(): Promise<PlatformProfile[]>;
  subscribersOf(platformProfileId: string): Promise<Subscriber[]>;
  updatePlatformProfile(id: string, p: PublicProfile): Promise<void>;
  touchChecked(id: string): Promise<void>;

  // snapshots
  addSnapshot(platformProfileId: string, p: PublicProfile): Promise<Snapshot>;
  latestSnapshot(platformProfileId: string): Promise<Snapshot | null>;
  listSnapshots(platformProfileId: string, limit: number): Promise<Snapshot[]>;

  // changements globaux + distribution
  addChange(platformProfileId: string, c: DetectedChange): Promise<ProfileChange>;
  distribute(change: ProfileChange, userIds: string[]): Promise<void>;

  // notifications (feed user)
  listNotifications(
    userId: string,
    opts?: { platformProfileId?: string; type?: string; limit?: number },
  ): Promise<UserNotification[]>;
  unseenByProfile(userId: string): Promise<Record<string, number>>;
  markSeen(userId: string): Promise<void>;

  // digest
  pendingDigest(userId: string): Promise<UserNotification[]>;
  markDigested(userId: string): Promise<void>;

  // push subscriptions (web push)
  savePushSubscription(userId: string, subscription: PushSubscriptionJSON): Promise<void>;
  getPushSubscriptions(userId: string): Promise<PushSubscriptionJSON[]>;

  // referrals
  getReferralCode(userId: string): Promise<string | null>;
  createReferralCode(userId: string, code: string): Promise<string>;
  getReferrerByCode(code: string): Promise<string | null>;
  getReferralCount(userId: string): Promise<number>;
  addReferral(referrerId: string, referredId: string): Promise<{ ok: boolean; error?: string }>;
  getUnlockedRewards(userId: string): Promise<{ milestone: number; reward_days: number; unlocked_at: string; claimed_at: string | null }[]>;
  unlockMilestone(userId: string, milestone: number, rewardDays: number): Promise<void>;
  getTotalBonusDays(userId: string): Promise<number>;
}

// ---------------- DevStore (JSON local, multi-user supporté) ----------------

const DEV_USER: User = { id: "demo-user", email: "demo@flip.app", plan: "flip_mini" };

interface DevNotif {
  id: string;
  user_id: string;
  profile_change_id: string;
  platform_profile_id: string;
  seen: boolean;
  digested: boolean;
  created_at: string;
}

interface DevDb {
  users: User[];
  settings: NotificationSettings[];
  platformProfiles: PlatformProfile[];
  tracked: { id: string; user_id: string; platform_profile_id: string; created_at: string }[];
  snapshots: Snapshot[];
  changes: ProfileChange[];
  notifications: DevNotif[];
  pushSubscriptions: { user_id: string; subscription: PushSubscriptionJSON }[];
  referralCodes: { user_id: string; code: string }[];
  referrals: { referrer_user_id: string; referred_user_id: string }[];
  referralRewards: { user_id: string; milestone: number; reward_days: number; unlocked_at: string; claimed_at: string | null }[];
}

const DEFAULT_SETTINGS = (userId: string): NotificationSettings => ({
  user_id: userId,
  bio_enabled: true,
  photo_enabled: true,
  name_enabled: true,
  link_enabled: true,
  private_public_enabled: true,
  followers_enabled: true,
  posts_enabled: true,
  push_enabled: false,
  email_enabled: true,
});

class DevStore implements Store {
  private file = path.join(process.cwd(), ".data", "dev-db.json");
  private db: DevDb | null = null;

  private async load(): Promise<DevDb> {
    if (this.db) return this.db;
    try {
      this.db = JSON.parse(await fs.readFile(this.file, "utf8"));
    } catch {
      this.db = {
        users: [DEV_USER],
        settings: [DEFAULT_SETTINGS(DEV_USER.id)],
        platformProfiles: [],
        tracked: [],
        snapshots: [],
        changes: [],
        notifications: [],
        pushSubscriptions: [],
        referralCodes: [],
        referrals: [],
        referralRewards: [],
      };
    }
    return this.db!;
  }

  private async save() {
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    await fs.writeFile(this.file, JSON.stringify(this.db, null, 2));
  }

  async getUser(userId: string) {
    const db = await this.load();
    return db.users.find((u) => u.id === userId) ?? { id: userId, email: `${userId}@flip.app`, plan: "flip_mini" };
  }
  async setPlan(userId: string, plan: User["plan"]) {
    const db = await this.load();
    const u = db.users.find((x) => x.id === userId);
    if (u) u.plan = plan;
    else db.users.push({ id: userId, email: `${userId}@flip.app`, plan });
    await this.save();
  }
  async getSettings(userId: string) {
    const db = await this.load();
    return db.settings.find((s) => s.user_id === userId) ?? DEFAULT_SETTINGS(userId);
  }
  async updateSettings(userId: string, s: Partial<NotificationSettings>) {
    const db = await this.load();
    const i = db.settings.findIndex((x) => x.user_id === userId);
    const next = { ...(i >= 0 ? db.settings[i] : DEFAULT_SETTINGS(userId)), ...s, user_id: userId };
    if (i >= 0) db.settings[i] = next;
    else db.settings.push(next);
    await this.save();
    return next;
  }

  private platform(db: DevDb, id: string) {
    return db.platformProfiles.find((p) => p.id === id) ?? null;
  }

  async listTracked(userId: string): Promise<UserTrackedProfile[]> {
    const db = await this.load();
    return db.tracked
      .filter((t) => t.user_id === userId)
      .map((t) => {
        const profile = this.platform(db, t.platform_profile_id)!;
        return { ...t, profile };
      })
      .filter((t) => t.profile)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  async getTrackedProfile(userId: string, platformProfileId: string) {
    const db = await this.load();
    const link = db.tracked.find(
      (t) => t.user_id === userId && t.platform_profile_id === platformProfileId,
    );
    if (!link) return null;
    return this.platform(db, platformProfileId);
  }
  async trackProfile(userId: string, p: PublicProfile, platform: Platform): Promise<PlatformProfile> {
    const db = await this.load();
    // profil global existant ? sinon créer (et baseline snapshot)
    let pp = db.platformProfiles.find(
      (x) => x.platform === platform && x.username === p.username,
    );
    if (!pp) {
      pp = {
        ...p,
        id: randomUUID(),
        platform,
        last_checked_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };
      db.platformProfiles.push(pp);
      db.snapshots.push({
        ...p,
        id: randomUUID(),
        platform_profile_id: pp.id,
        created_at: new Date().toISOString(),
      });
    }
    if (!db.tracked.some((t) => t.user_id === userId && t.platform_profile_id === pp!.id)) {
      db.tracked.push({
        id: randomUUID(),
        user_id: userId,
        platform_profile_id: pp.id,
        created_at: new Date().toISOString(),
      });
    }
    await this.save();
    return pp;
  }
  async untrack(userId: string, platformProfileId: string) {
    const db = await this.load();
    db.tracked = db.tracked.filter(
      (t) => !(t.user_id === userId && t.platform_profile_id === platformProfileId),
    );
    db.notifications = db.notifications.filter(
      (n) => !(n.user_id === userId && n.platform_profile_id === platformProfileId),
    );
    // si plus aucun abonné → purge le profil global + ses données
    if (!db.tracked.some((t) => t.platform_profile_id === platformProfileId)) {
      db.platformProfiles = db.platformProfiles.filter((p) => p.id !== platformProfileId);
      db.snapshots = db.snapshots.filter((s) => s.platform_profile_id !== platformProfileId);
      db.changes = db.changes.filter((c) => c.platform_profile_id !== platformProfileId);
    }
    await this.save();
  }

  async allPlatformProfilesForCheck() {
    const db = await this.load();
    return [...db.platformProfiles];
  }
  async subscribersOf(platformProfileId: string): Promise<Subscriber[]> {
    const db = await this.load();
    const ids = [
      ...new Set(
        db.tracked.filter((t) => t.platform_profile_id === platformProfileId).map((t) => t.user_id),
      ),
    ];
    return ids.map((id) => ({ user_id: id, plan: (db.users.find((u) => u.id === id)?.plan ?? "flip_mini") }));
  }
  async updatePlatformProfile(id: string, p: PublicProfile) {
    const db = await this.load();
    const i = db.platformProfiles.findIndex((x) => x.id === id);
    if (i >= 0) db.platformProfiles[i] = { ...db.platformProfiles[i], ...p };
    await this.save();
  }
  async touchChecked(id: string) {
    const db = await this.load();
    const p = this.platform(db, id);
    if (p) p.last_checked_at = new Date().toISOString();
    await this.save();
  }

  async addSnapshot(platformProfileId: string, p: PublicProfile) {
    const db = await this.load();
    const snap: Snapshot = {
      ...p,
      id: randomUUID(),
      platform_profile_id: platformProfileId,
      created_at: new Date().toISOString(),
    };
    db.snapshots.push(snap);
    await this.save();
    return snap;
  }
  async latestSnapshot(platformProfileId: string) {
    const db = await this.load();
    return (
      db.snapshots
        .filter((s) => s.platform_profile_id === platformProfileId)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null
    );
  }
  async listSnapshots(platformProfileId: string, limit: number) {
    const db = await this.load();
    return db.snapshots
      .filter((s) => s.platform_profile_id === platformProfileId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, limit);
  }

  async addChange(platformProfileId: string, c: DetectedChange) {
    const db = await this.load();
    const change: ProfileChange = {
      id: randomUUID(),
      platform_profile_id: platformProfileId,
      change_type: c.change_type,
      severity: c.severity,
      old_value: c.old_value,
      new_value: c.new_value,
      created_at: new Date().toISOString(),
    };
    db.changes.push(change);
    await this.save();
    return change;
  }
  async distribute(change: ProfileChange, userIds: string[]) {
    const db = await this.load();
    for (const uid of userIds) {
      db.notifications.push({
        id: randomUUID(),
        user_id: uid,
        profile_change_id: change.id,
        platform_profile_id: change.platform_profile_id,
        seen: false,
        digested: false,
        created_at: change.created_at,
      });
    }
    await this.save();
  }

  private toNotif(db: DevDb, n: DevNotif): UserNotification {
    const change = db.changes.find((c) => c.id === n.profile_change_id)!;
    const pp = this.platform(db, n.platform_profile_id);
    return {
      id: n.id,
      user_id: n.user_id,
      platform_profile_id: n.platform_profile_id,
      change_type: change.change_type,
      severity: change.severity,
      old_value: change.old_value,
      new_value: change.new_value,
      seen: n.seen,
      created_at: n.created_at,
      username: pp?.username,
    };
  }

  async listNotifications(
    userId: string,
    opts?: { platformProfileId?: string; type?: string; limit?: number },
  ) {
    const db = await this.load();
    return db.notifications
      .filter(
        (n) =>
          n.user_id === userId &&
          (!opts?.platformProfileId || n.platform_profile_id === opts.platformProfileId),
      )
      .map((n) => this.toNotif(db, n))
      .filter((n) => !opts?.type || n.change_type === opts.type)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, opts?.limit ?? 100);
  }
  async unseenByProfile(userId: string) {
    const db = await this.load();
    const out: Record<string, number> = {};
    for (const n of db.notifications) {
      if (n.user_id === userId && !n.seen)
        out[n.platform_profile_id] = (out[n.platform_profile_id] ?? 0) + 1;
    }
    return out;
  }
  async markSeen(userId: string) {
    const db = await this.load();
    for (const n of db.notifications) if (n.user_id === userId) n.seen = true;
    await this.save();
  }

  async pendingDigest(userId: string) {
    const db = await this.load();
    return db.notifications
      .filter((n) => n.user_id === userId && !n.digested)
      .map((n) => this.toNotif(db, n))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  async markDigested(userId: string) {
    const db = await this.load();
    for (const n of db.notifications) if (n.user_id === userId) n.digested = true;
    await this.save();
  }

  async savePushSubscription(userId: string, subscription: PushSubscriptionJSON) {
    const db = await this.load();
    if (!db.pushSubscriptions) db.pushSubscriptions = [];
    const endpoint = subscription.endpoint;
    const existing = db.pushSubscriptions.findIndex(
      (s) => s.user_id === userId && s.subscription.endpoint === endpoint,
    );
    if (existing >= 0) db.pushSubscriptions[existing].subscription = subscription;
    else db.pushSubscriptions.push({ user_id: userId, subscription });
    await this.save();
  }
  async getPushSubscriptions(userId: string) {
    const db = await this.load();
    if (!db.pushSubscriptions) return [];
    return db.pushSubscriptions.filter((s) => s.user_id === userId).map((s) => s.subscription);
  }

  async getReferralCode(userId: string) {
    const db = await this.load();
    return db.referralCodes?.find((r) => r.user_id === userId)?.code ?? null;
  }
  async createReferralCode(userId: string, code: string) {
    const db = await this.load();
    if (!db.referralCodes) db.referralCodes = [];
    if (!db.referralCodes.find((r) => r.user_id === userId)) {
      db.referralCodes.push({ user_id: userId, code });
      await this.save();
    }
    return db.referralCodes.find((r) => r.user_id === userId)!.code;
  }
  async getReferrerByCode(code: string) {
    const db = await this.load();
    return db.referralCodes?.find((r) => r.code === code)?.user_id ?? null;
  }
  async getReferralCount(userId: string) {
    const db = await this.load();
    return (db.referrals ?? []).filter((r) => r.referrer_user_id === userId).length;
  }
  async addReferral(referrerId: string, referredId: string) {
    const db = await this.load();
    if (!db.referrals) db.referrals = [];
    if (db.referrals.find((r) => r.referred_user_id === referredId)) {
      return { ok: false, error: "Utilisateur déjà parrainé." };
    }
    db.referrals.push({ referrer_user_id: referrerId, referred_user_id: referredId });
    await this.save();
    return { ok: true };
  }
  async getUnlockedRewards(userId: string) {
    const db = await this.load();
    return (db.referralRewards ?? []).filter((r) => r.user_id === userId);
  }
  async unlockMilestone(userId: string, milestone: number, rewardDays: number) {
    const db = await this.load();
    if (!db.referralRewards) db.referralRewards = [];
    if (!db.referralRewards.find((r) => r.user_id === userId && r.milestone === milestone)) {
      db.referralRewards.push({
        user_id: userId,
        milestone,
        reward_days: rewardDays,
        unlocked_at: new Date().toISOString(),
        claimed_at: null,
      });
      await this.save();
    }
  }
  async getTotalBonusDays(userId: string) {
    const db = await this.load();
    return (db.referralRewards ?? [])
      .filter((r) => r.user_id === userId)
      .reduce((sum, r) => sum + r.reward_days, 0);
  }
}

// ---------------- SupabaseStore (production) ----------------

class SupabaseStore implements Store {
  private async client() {
    const { createClient } = await import("@supabase/supabase-js");
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );
  }

  async getUser(userId: string) {
    const sb = await this.client();
    const { data, error } = await sb.from("users").select("*").eq("id", userId).single();
    if (error) throw error;
    return data as User;
  }
  async setPlan(userId: string, plan: User["plan"]) {
    const sb = await this.client();
    const { error } = await sb.from("users").update({ plan }).eq("id", userId);
    if (error) throw error;
  }
  async getSettings(userId: string) {
    const sb = await this.client();
    const { data } = await sb.from("notification_settings").select("*").eq("user_id", userId).maybeSingle();
    return (data as NotificationSettings) ?? DEFAULT_SETTINGS(userId);
  }
  async updateSettings(userId: string, s: Partial<NotificationSettings>) {
    const sb = await this.client();
    const { data, error } = await sb
      .from("notification_settings")
      .upsert({ ...s, user_id: userId }, { onConflict: "user_id" })
      .select()
      .single();
    if (error) throw error;
    return data as NotificationSettings;
  }

  async listTracked(userId: string): Promise<UserTrackedProfile[]> {
    const sb = await this.client();
    const { data, error } = await sb
      .from("user_tracked_profiles")
      .select("*, platform_profiles(*)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r: Record<string, unknown>) => ({
      id: r.id as string,
      user_id: r.user_id as string,
      platform_profile_id: r.platform_profile_id as string,
      created_at: r.created_at as string,
      profile: r.platform_profiles as PlatformProfile,
    }));
  }
  async getTrackedProfile(userId: string, platformProfileId: string) {
    const sb = await this.client();
    const { data } = await sb
      .from("user_tracked_profiles")
      .select("platform_profiles(*)")
      .eq("user_id", userId)
      .eq("platform_profile_id", platformProfileId)
      .maybeSingle();
    return ((data?.platform_profiles as unknown) as PlatformProfile) ?? null;
  }
  async trackProfile(userId: string, p: PublicProfile, platform: Platform): Promise<PlatformProfile> {
    const sb = await this.client();
    const { raw_data: _raw, ...fields } = p;
    // upsert profil global
    let { data: pp } = await sb
      .from("platform_profiles")
      .select("*")
      .eq("platform", platform)
      .eq("username", p.username)
      .maybeSingle();
    if (!pp) {
      const ins = await sb
        .from("platform_profiles")
        .insert({ ...fields, platform, last_checked_at: new Date().toISOString() })
        .select()
        .single();
      if (ins.error) throw ins.error;
      pp = ins.data;
      await sb.from("profile_snapshots").insert({ ...fields, platform_profile_id: pp.id });
    }
    await sb
      .from("user_tracked_profiles")
      .upsert({ user_id: userId, platform_profile_id: pp.id }, { onConflict: "user_id,platform_profile_id" });
    return pp as PlatformProfile;
  }
  async untrack(userId: string, platformProfileId: string) {
    const sb = await this.client();
    await sb
      .from("user_tracked_profiles")
      .delete()
      .eq("user_id", userId)
      .eq("platform_profile_id", platformProfileId);
    // purge profil global si plus aucun abonné
    const { count } = await sb
      .from("user_tracked_profiles")
      .select("id", { count: "exact", head: true })
      .eq("platform_profile_id", platformProfileId);
    if ((count ?? 0) === 0) {
      await sb.from("platform_profiles").delete().eq("id", platformProfileId);
    }
  }

  async allPlatformProfilesForCheck() {
    const sb = await this.client();
    const { data } = await sb
      .from("platform_profiles")
      .select("*")
      .order("last_checked_at", { ascending: true, nullsFirst: true })
      .limit(500);
    return (data ?? []) as PlatformProfile[];
  }
  async subscribersOf(platformProfileId: string): Promise<Subscriber[]> {
    const sb = await this.client();
    const { data } = await sb
      .from("user_tracked_profiles")
      .select("user_id, users(plan)")
      .eq("platform_profile_id", platformProfileId);
    return (data ?? []).map((r: Record<string, unknown>) => ({
      user_id: r.user_id as string,
      plan: ((r.users as { plan?: User["plan"] } | null)?.plan ?? "flip_mini") as User["plan"],
    }));
  }
  async updatePlatformProfile(id: string, p: PublicProfile) {
    const sb = await this.client();
    const { raw_data: _raw, ...fields } = p;
    await sb.from("platform_profiles").update(fields).eq("id", id);
  }
  async touchChecked(id: string) {
    const sb = await this.client();
    await sb.from("platform_profiles").update({ last_checked_at: new Date().toISOString() }).eq("id", id);
  }

  async addSnapshot(platformProfileId: string, p: PublicProfile) {
    const sb = await this.client();
    const { data, error } = await sb
      .from("profile_snapshots")
      .insert({ ...p, platform_profile_id: platformProfileId })
      .select()
      .single();
    if (error) throw error;
    return data as Snapshot;
  }
  async latestSnapshot(platformProfileId: string) {
    const sb = await this.client();
    const { data } = await sb
      .from("profile_snapshots")
      .select("*")
      .eq("platform_profile_id", platformProfileId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data as Snapshot) ?? null;
  }
  async listSnapshots(platformProfileId: string, limit: number) {
    const sb = await this.client();
    const { data } = await sb
      .from("profile_snapshots")
      .select("*")
      .eq("platform_profile_id", platformProfileId)
      .order("created_at", { ascending: false })
      .limit(limit);
    return (data ?? []) as Snapshot[];
  }

  async addChange(platformProfileId: string, c: DetectedChange) {
    const sb = await this.client();
    const { data, error } = await sb
      .from("profile_changes")
      .insert({
        platform_profile_id: platformProfileId,
        change_type: c.change_type,
        severity: c.severity,
        old_value: c.old_value,
        new_value: c.new_value,
      })
      .select()
      .single();
    if (error) throw error;
    return data as ProfileChange;
  }
  async distribute(change: ProfileChange, userIds: string[]) {
    if (userIds.length === 0) return;
    const sb = await this.client();
    await sb.from("user_notifications").insert(
      userIds.map((uid) => ({
        user_id: uid,
        profile_change_id: change.id,
        platform_profile_id: change.platform_profile_id,
      })),
    );
  }

  async listNotifications(
    userId: string,
    opts?: { platformProfileId?: string; type?: string; limit?: number },
  ) {
    const sb = await this.client();
    let q = sb
      .from("user_notifications")
      .select("*, profile_changes!inner(change_type, severity, old_value, new_value), platform_profiles(username)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(opts?.limit ?? 100);
    if (opts?.platformProfileId) q = q.eq("platform_profile_id", opts.platformProfileId);
    if (opts?.type) q = q.eq("profile_changes.change_type", opts.type);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map((r: Record<string, unknown>) => {
      const ch = r.profile_changes as Record<string, unknown>;
      return {
        id: r.id as string,
        user_id: r.user_id as string,
        platform_profile_id: r.platform_profile_id as string,
        change_type: ch.change_type as UserNotification["change_type"],
        severity: ch.severity as Severity,
        old_value: ch.old_value as string | null,
        new_value: ch.new_value as string | null,
        seen: r.seen as boolean,
        created_at: r.created_at as string,
        username: (r.platform_profiles as { username?: string } | null)?.username,
      };
    });
  }
  async unseenByProfile(userId: string) {
    const sb = await this.client();
    const { data } = await sb
      .from("user_notifications")
      .select("platform_profile_id")
      .eq("user_id", userId)
      .eq("seen", false);
    const out: Record<string, number> = {};
    for (const r of data ?? []) {
      const id = (r as { platform_profile_id: string }).platform_profile_id;
      out[id] = (out[id] ?? 0) + 1;
    }
    return out;
  }
  async markSeen(userId: string) {
    const sb = await this.client();
    await sb.from("user_notifications").update({ seen: true }).eq("user_id", userId).eq("seen", false);
  }

  async pendingDigest(userId: string) {
    const sb = await this.client();
    const { data } = await sb
      .from("user_notifications")
      .select("*, profile_changes!inner(change_type, severity, old_value, new_value), platform_profiles(username)")
      .eq("user_id", userId)
      .eq("digested", false)
      .order("created_at", { ascending: false });
    return (data ?? []).map((r: Record<string, unknown>) => {
      const ch = r.profile_changes as Record<string, unknown>;
      return {
        id: r.id as string,
        user_id: r.user_id as string,
        platform_profile_id: r.platform_profile_id as string,
        change_type: ch.change_type as UserNotification["change_type"],
        severity: ch.severity as Severity,
        old_value: ch.old_value as string | null,
        new_value: ch.new_value as string | null,
        seen: r.seen as boolean,
        created_at: r.created_at as string,
        username: (r.platform_profiles as { username?: string } | null)?.username,
      };
    });
  }
  async markDigested(userId: string) {
    const sb = await this.client();
    await sb.from("user_notifications").update({ digested: true }).eq("user_id", userId).eq("digested", false);
  }

  async savePushSubscription(userId: string, subscription: PushSubscriptionJSON) {
    const sb = await this.client();
    await sb
      .from("push_subscriptions")
      .upsert(
        { user_id: userId, endpoint: subscription.endpoint, subscription: JSON.stringify(subscription) },
        { onConflict: "user_id,endpoint" },
      );
  }
  async getPushSubscriptions(userId: string) {
    const sb = await this.client();
    const { data } = await sb.from("push_subscriptions").select("subscription").eq("user_id", userId);
    return (data ?? []).map((r: { subscription: string }) => JSON.parse(r.subscription) as PushSubscriptionJSON);
  }

  async getReferralCode(userId: string) {
    const sb = await this.client();
    const { data } = await sb.from("referral_codes").select("code").eq("user_id", userId).maybeSingle();
    return (data as { code: string } | null)?.code ?? null;
  }
  async createReferralCode(userId: string, code: string) {
    const sb = await this.client();
    await sb.from("referral_codes").upsert({ user_id: userId, code }, { onConflict: "user_id" });
    const { data } = await sb.from("referral_codes").select("code").eq("user_id", userId).single();
    return (data as { code: string }).code;
  }
  async getReferrerByCode(code: string) {
    const sb = await this.client();
    const { data } = await sb.from("referral_codes").select("user_id").eq("code", code).maybeSingle();
    return (data as { user_id: string } | null)?.user_id ?? null;
  }
  async getReferralCount(userId: string) {
    const sb = await this.client();
    const { count } = await sb
      .from("referrals")
      .select("id", { count: "exact", head: true })
      .eq("referrer_user_id", userId)
      .eq("status", "completed");
    return count ?? 0;
  }
  async addReferral(referrerId: string, referredId: string) {
    const sb = await this.client();
    const { error } = await sb
      .from("referrals")
      .insert({ referrer_user_id: referrerId, referred_user_id: referredId, status: "completed" });
    if (error) {
      if (error.code === "23505") return { ok: false, error: "Utilisateur déjà parrainé." };
      throw error;
    }
    return { ok: true };
  }
  async getUnlockedRewards(userId: string) {
    const sb = await this.client();
    const { data } = await sb.from("referral_rewards").select("*").eq("user_id", userId);
    return (data ?? []) as { milestone: number; reward_days: number; unlocked_at: string; claimed_at: string | null }[];
  }
  async unlockMilestone(userId: string, milestone: number, rewardDays: number) {
    const sb = await this.client();
    await sb
      .from("referral_rewards")
      .upsert(
        { user_id: userId, milestone, reward_days: rewardDays, unlocked_at: new Date().toISOString() },
        { onConflict: "user_id,milestone", ignoreDuplicates: true },
      );
    // Ajoute un enregistrement bonus si nouveau palier
    const { count } = await sb
      .from("user_bonus_days")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("source", `referral_milestone_${milestone}`);
    if ((count ?? 0) === 0) {
      await sb
        .from("user_bonus_days")
        .insert({ user_id: userId, total_days: rewardDays, source: `referral_milestone_${milestone}` });
    }
  }
  async getTotalBonusDays(userId: string) {
    const sb = await this.client();
    const { data } = await sb.from("referral_rewards").select("reward_days").eq("user_id", userId);
    return (data ?? []).reduce((s: number, r: { reward_days: number }) => s + r.reward_days, 0);
  }
}

// ---------------- Factory ----------------

let store: Store | null = null;

export function getStore(): Store {
  if (!store) {
    const hasSupabase =
      !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    store = hasSupabase ? new SupabaseStore() : new DevStore();
  }
  return store;
}

// Auth dev : mono-user démo. En prod → remplacer par session Supabase Auth.
export function getCurrentUserId(): string {
  return DEV_USER.id;
}
