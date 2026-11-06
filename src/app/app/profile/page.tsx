"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/client";
import { ProfileForm } from "@/components/pages/ProfileForm";
import { Skeleton } from "@/components/ui/Skeleton";

interface ProfileUser {
  name: string;
  email: string;
  createdAt: string;
  region?: string;
  currency?: string;
  avatarUrl?: string | null;
}

export default function ProfilePage() {
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [loadErr, setLoadErr] = useState(false);

  const load = () => {
    setLoadErr(false);
    apiFetch("/api/auth/me", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((u: ProfileUser) => setUser(u))
      .catch(() => setLoadErr(true));
  };

  useEffect(load, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
          Profile
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Your name, password and session settings.
        </p>
      </div>
      {loadErr ? (
        <div className="card p-10 text-center">
          <p className="text-sm font-semibold text-rose">
            Couldn't load your profile.
          </p>
          <button className="btn-outline mt-4" onClick={load}>
            Try again
          </button>
        </div>
      ) : !user ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card p-5">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="mt-5 h-10 w-full" />
            <Skeleton className="mt-4 h-10 w-full" />
          </div>
          <div className="card p-5">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="mt-5 h-10 w-full" />
            <Skeleton className="mt-4 h-10 w-full" />
          </div>
        </div>
      ) : (
        <ProfileForm user={user} />
      )}
    </div>
  );
}
