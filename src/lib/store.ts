// Data layer dual :
// - Supabase si NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY présents
// - sinon DevStore (fichier JSON local) → l'app tourne sans clés en dev.

import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type {
  NotificationSettings,
  ProfileChange,
  PublicProfile,
  Snapshot,
  TrackedProfile,
  User,
} from "./types";

export interface Store {
  getUser(userId: string): Promise<User>;
  setPlan(userId: string, plan: User["plan"]): Promise<void>;
  listProfiles(userId: string): Promise<TrackedProfile[]>;
  getProfile(userId: string, id: string): Promise<TrackedProfile | null>;
  addProfile(userId: string, p: PublicProfile): Promise<TrackedProfile>;
  deleteProfile(userId: string, id: string): Promise<void>;
  updateProfile(id: string, p: PublicProfile): Promise<void>;
  touchChecked(id: string): Promise<void>;
  addSnapshot(trackedProfileId: string, p: PublicProfile): Promise<Snapshot>;
  latestSnapshot(trackedProfileId: string): Promise<Snapshot | null>;
  listSnapshots(trackedProfileId: string, limit: number): Promise<Snapshot[]>;
  addChange(c: Omit<ProfileChange, "id" | "created_at" | "seen">): Promise<ProfileChange>;
  listChanges(userId: string, opts?: { profileId?: string; type?: string; limit?: number }): Promise<ProfileChange[]>;
  markSeen(userId: string): Promise<void>;
  getSettings(userId: string): Promise<NotificationSettings>;
  updateSettings(userId: string, s: Partial<NotificationSettings>): Promise<NotificationSettings>;
  allProfilesForCheck(): Promise<TrackedProfile[]>;
}

// ---------------- DevStore (JSON local, mono-user démo) ----------------

const DEV_USER: User = { id: "demo-user", email: "demo@flip.app", plan: "free" };

interface DevDb {
  user: User;
  profiles: TrackedProfile[];
  snapshots: Snapshot[];
  changes: ProfileChange[];
  settings: NotificationSettings;
}

const DEFAULT_SETTINGS = (userId: string): NotificationSettings => ({
  user_id: userId,
  bio_enabled: true,
  photo_enabled: true,
  name_enabled: true,
  link_enabled: true,
  private_public_enabled: true,
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
        user: DEV_USER,
        profiles: [],
        snapshots: [],
        changes: [],
        settings: DEFAULT_SETTINGS(DEV_USER.id),
      };
    }
    return this.db!;
  }

  private async save() {
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    await fs.writeFile(this.file, JSON.stringify(this.db, null, 2));
  }

  async getUser() {
    return (await this.load()).user;
  }
  async setPlan(_: string, plan: User["plan"]) {
    const db = await this.load();
    db.user.plan = plan;
    await this.save();
  }
  async listProfiles(userId: string) {
    const db = await this.load();
    return db.profiles.filter((p) => p.user_id === userId);
  }
  async getProfile(userId: string, id: string) {
    const db = await this.load();
    return db.profiles.find((p) => p.id === id && p.user_id === userId) ?? null;
  }
  async addProfile(userId: string, p: PublicProfile) {
    const db = await this.load();
    const profile: TrackedProfile = {
      ...p,
      id: randomUUID(),
      user_id: userId,
      platform: "instagram",
      last_checked_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    db.profiles.push(profile);
    await this.save();
    return profile;
  }
  async deleteProfile(userId: string, id: string) {
    const db = await this.load();
    db.profiles = db.profiles.filter((p) => !(p.id === id && p.user_id === userId));
    db.snapshots = db.snapshots.filter((s) => s.tracked_profile_id !== id);
    db.changes = db.changes.filter((c) => c.tracked_profile_id !== id);
    await this.save();
  }
  async updateProfile(id: string, p: PublicProfile) {
    const db = await this.load();
    const i = db.profiles.findIndex((x) => x.id === id);
    if (i >= 0) db.profiles[i] = { ...db.profiles[i], ...p };
    await this.save();
  }
  async touchChecked(id: string) {
    const db = await this.load();
    const p = db.profiles.find((x) => x.id === id);
    if (p) p.last_checked_at = new Date().toISOString();
    await this.save();
  }
  async addSnapshot(trackedProfileId: string, p: PublicProfile) {
    const db = await this.load();
    const snap: Snapshot = {
      ...p,
      id: randomUUID(),
      tracked_profile_id: trackedProfileId,
      created_at: new Date().toISOString(),
    };
    db.snapshots.push(snap);
    await this.save();
    return snap;
  }
  async latestSnapshot(id: string) {
    const db = await this.load();
    return (
      db.snapshots
        .filter((s) => s.tracked_profile_id === id)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null
    );
  }
  async listSnapshots(id: string, limit: number) {
    const db = await this.load();
    return db.snapshots
      .filter((s) => s.tracked_profile_id === id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, limit);
  }
  async addChange(c: Omit<ProfileChange, "id" | "created_at" | "seen">) {
    const db = await this.load();
    const change: ProfileChange = {
      ...c,
      id: randomUUID(),
      seen: false,
      created_at: new Date().toISOString(),
    };
    db.changes.push(change);
    await this.save();
    return change;
  }
  async listChanges(userId: string, opts?: { profileId?: string; type?: string; limit?: number }) {
    const db = await this.load();
    return db.changes
      .filter(
        (c) =>
          c.user_id === userId &&
          (!opts?.profileId || c.tracked_profile_id === opts.profileId) &&
          (!opts?.type || c.change_type === opts.type),
      )
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, opts?.limit ?? 100)
      .map((c) => ({
        ...c,
        username: db.profiles.find((p) => p.id === c.tracked_profile_id)?.username,
      }));
  }
  async markSeen(userId: string) {
    const db = await this.load();
    for (const c of db.changes) if (c.user_id === userId) c.seen = true;
    await this.save();
  }
  async getSettings(userId: string) {
    const db = await this.load();
    return db.settings ?? DEFAULT_SETTINGS(userId);
  }
  async updateSettings(userId: string, s: Partial<NotificationSettings>) {
    const db = await this.load();
    db.settings = { ...DEFAULT_SETTINGS(userId), ...db.settings, ...s, user_id: userId };
    await this.save();
    return db.settings;
  }
  async allProfilesForCheck() {
    const db = await this.load();
    return db.profiles;
  }
}

// ---------------- SupabaseStore (production) ----------------

class SupabaseStore implements Store {
  // Service role : utilisé uniquement côté serveur (API routes / cron).
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
  async listProfiles(userId: string) {
    const sb = await this.client();
    const { data, error } = await sb
      .from("tracked_profiles")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data as TrackedProfile[];
  }
  async getProfile(userId: string, id: string) {
    const sb = await this.client();
    const { data } = await sb
      .from("tracked_profiles")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();
    return (data as TrackedProfile) ?? null;
  }
  async addProfile(userId: string, p: PublicProfile) {
    const sb = await this.client();
    const { raw_data: _raw, ...fields } = p;
    const { data, error } = await sb
      .from("tracked_profiles")
      .insert({ ...fields, user_id: userId, platform: "instagram", last_checked_at: new Date().toISOString() })
      .select()
      .single();
    if (error) throw error;
    return data as TrackedProfile;
  }
  async deleteProfile(userId: string, id: string) {
    const sb = await this.client();
    const { error } = await sb.from("tracked_profiles").delete().eq("id", id).eq("user_id", userId);
    if (error) throw error;
  }
  async updateProfile(id: string, p: PublicProfile) {
    const sb = await this.client();
    const { raw_data: _raw, ...fields } = p;
    const { error } = await sb.from("tracked_profiles").update(fields).eq("id", id);
    if (error) throw error;
  }
  async touchChecked(id: string) {
    const sb = await this.client();
    await sb.from("tracked_profiles").update({ last_checked_at: new Date().toISOString() }).eq("id", id);
  }
  async addSnapshot(trackedProfileId: string, p: PublicProfile) {
    const sb = await this.client();
    const { data, error } = await sb
      .from("profile_snapshots")
      .insert({ ...p, tracked_profile_id: trackedProfileId })
      .select()
      .single();
    if (error) throw error;
    return data as Snapshot;
  }
  async latestSnapshot(id: string) {
    const sb = await this.client();
    const { data } = await sb
      .from("profile_snapshots")
      .select("*")
      .eq("tracked_profile_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data as Snapshot) ?? null;
  }
  async listSnapshots(id: string, limit: number) {
    const sb = await this.client();
    const { data } = await sb
      .from("profile_snapshots")
      .select("*")
      .eq("tracked_profile_id", id)
      .order("created_at", { ascending: false })
      .limit(limit);
    return (data ?? []) as Snapshot[];
  }
  async addChange(c: Omit<ProfileChange, "id" | "created_at" | "seen">) {
    const sb = await this.client();
    const { data, error } = await sb.from("profile_changes").insert(c).select().single();
    if (error) throw error;
    return data as ProfileChange;
  }
  async listChanges(userId: string, opts?: { profileId?: string; type?: string; limit?: number }) {
    const sb = await this.client();
    let q = sb
      .from("profile_changes")
      .select("*, tracked_profiles(username)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(opts?.limit ?? 100);
    if (opts?.profileId) q = q.eq("tracked_profile_id", opts.profileId);
    if (opts?.type) q = q.eq("change_type", opts.type);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map((c: Record<string, unknown>) => ({
      ...(c as unknown as ProfileChange),
      username: (c.tracked_profiles as { username?: string } | null)?.username,
    }));
  }
  async markSeen(userId: string) {
    const sb = await this.client();
    await sb.from("profile_changes").update({ seen: true }).eq("user_id", userId).eq("seen", false);
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
  async allProfilesForCheck() {
    const sb = await this.client();
    const { data } = await sb
      .from("tracked_profiles")
      .select("*")
      .order("last_checked_at", { ascending: true, nullsFirst: true })
      .limit(200);
    return (data ?? []) as TrackedProfile[];
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
