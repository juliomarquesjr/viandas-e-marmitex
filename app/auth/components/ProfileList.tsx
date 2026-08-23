"use client";

import { Check, Plus, X } from "lucide-react";
import Image from "next/image";
import {
  profileInitials,
  profileLabel,
  roleLabel,
  type RecentLogin,
} from "@/lib/auth/recent-logins";

const ROW_BASE =
  "flex h-[52px] w-full items-center gap-[11px] rounded-lg px-2.5 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--auth-aside-bg)]";

const ROW_SELECTED =
  "border border-[color:var(--auth-row-selected-border)] bg-[color:var(--auth-row-selected-bg)] shadow-[var(--auth-row-selected-shadow)]";

const ROW_IDLE =
  "border border-transparent hover:bg-[color:var(--auth-row-hover-bg)]";

interface ProfileListProps {
  profiles: RecentLogin[];
  activeEmail: string | null;
  manualActive: boolean;
  onSelect: (email: string) => void;
  onSelectManual: () => void;
  onForget: (email: string) => void;
}

export function ProfileList({
  profiles,
  activeEmail,
  manualActive,
  onSelect,
  onSelectManual,
  onForget,
}: ProfileListProps) {
  return (
    <>
      <div className="flex-grow px-3 py-[18px]">
        <div className="px-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--auth-fg-subtle)]">
          Perfis salvos
        </div>

        <div className="mt-2.5 flex flex-col gap-0.5">
          {profiles.map((profile) => {
            const isActive = !manualActive && profile.email === activeEmail;
            const label = profileLabel(profile);
            const role = roleLabel(profile.role);

            return (
              <div key={profile.email} className="group relative">
                <button
                  type="button"
                  onClick={() => onSelect(profile.email)}
                  aria-pressed={isActive}
                  className={`${ROW_BASE} ${isActive ? ROW_SELECTED : ROW_IDLE}`}
                >
                  {profile.image ? (
                    <Image
                      src={profile.image}
                      alt=""
                      width={32}
                      height={32}
                      className="h-8 w-8 shrink-0 rounded-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                        isActive
                          ? "bg-primary text-white"
                          : "bg-[color:var(--auth-avatar-bg)] text-[color:var(--auth-avatar-fg)]"
                      }`}
                    >
                      {profileInitials(profile)}
                    </span>
                  )}

                  <span className="flex min-w-0 flex-grow flex-col gap-px">
                    <span
                      className={`truncate text-[13.5px] ${
                        isActive
                          ? "font-semibold text-[color:var(--foreground)]"
                          : "font-medium text-[color:var(--auth-row-name)]"
                      }`}
                    >
                      {label}
                    </span>
                    <span className="truncate text-[11.5px] text-[color:var(--muted-foreground)]">
                      {role || profile.email}
                    </span>
                  </span>

                  {isActive ? (
                    <Check className="h-[17px] w-[17px] shrink-0 text-primary" strokeWidth={2.6} />
                  ) : (
                    <span className="h-[17px] w-[17px] shrink-0" />
                  )}
                </button>

                {!isActive ? (
                  <button
                    type="button"
                    onClick={() => onForget(profile.email)}
                    aria-label={`Remover ${label} deste dispositivo`}
                    title="Remover deste dispositivo"
                    className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-[color:var(--muted-foreground)] opacity-0 transition-opacity duration-150 hover:bg-[color:var(--muted)] hover:text-[color:var(--foreground)] focus:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary group-hover:opacity-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <div className="shrink-0 border-t border-[color:var(--border)] p-3">
        <button
          type="button"
          onClick={onSelectManual}
          aria-pressed={manualActive}
          className={`${ROW_BASE} h-11 ${manualActive ? ROW_SELECTED : ROW_IDLE}`}
        >
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-dashed ${
              manualActive
                ? "border-primary text-primary"
                : "border-[color:var(--auth-dashed-border)] text-[color:var(--muted-foreground)]"
            }`}
          >
            <Plus className="h-[15px] w-[15px]" />
          </span>
          <span
            className={`text-[13.5px] font-medium ${
              manualActive
                ? "text-[color:var(--foreground)]"
                : "text-[color:var(--muted-foreground)]"
            }`}
          >
            Outro e-mail
          </span>
        </button>
      </div>
    </>
  );
}
