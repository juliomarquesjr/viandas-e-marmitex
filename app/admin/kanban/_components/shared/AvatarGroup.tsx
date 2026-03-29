"use client";

import { cn } from "@/lib/utils";

interface AvatarUser {
  id: string;
  name: string;
  imageUrl?: string | null;
}

interface AvatarGroupProps {
  users: AvatarUser[];
  max?: number;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "h-6 w-6 text-[10px]",
  md: "h-8 w-8 text-xs",
  lg: "h-10 w-10 text-sm",
};

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

// Consistent color from name
function avatarColor(name: string) {
  const colors = [
    "bg-blue-500", "bg-violet-500", "bg-emerald-500", "bg-rose-500",
    "bg-amber-500", "bg-cyan-500", "bg-pink-500", "bg-indigo-500",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export function AvatarGroup({ users, max = 4, size = "md" }: AvatarGroupProps) {
  const visible = users.slice(0, max);
  const overflow = users.length - max;
  const sizeClass = sizeMap[size];

  return (
    <div className="flex items-center -space-x-1.5">
      {visible.map((user) => (
        <div
          key={user.id}
          title={user.name}
          className={cn(
            "rounded-full border-2 border-white/30 overflow-hidden flex-shrink-0 flex items-center justify-center font-semibold text-white",
            sizeClass,
            !user.imageUrl && avatarColor(user.name)
          )}
        >
          {user.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.imageUrl} alt={user.name} className="h-full w-full object-cover" />
          ) : (
            initials(user.name)
          )}
        </div>
      ))}
      {overflow > 0 && (
        <div
          className={cn(
            "rounded-full border-2 border-white/30 bg-white/20 flex-shrink-0 flex items-center justify-center font-semibold text-white backdrop-blur-sm",
            sizeClass
          )}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}
