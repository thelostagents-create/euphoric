import type { CSSProperties, ReactNode } from "react";
import type { User } from "../types";

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle" />
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function tierBadge(tier: string) {
  if (tier === "premium") return <span className="badge premium">Premium</span>;
  if (tier === "supernova") return <span className="badge supernova">Supernova</span>;
  return null;
}

/** Banner background: image only counts for premium/supernova members. */
export function bannerStyle(user: User): CSSProperties {
  const canImage = user.tier !== "free";
  if (canImage && user.banner.image) {
    return {
      backgroundImage: `url(${user.banner.image})`,
      backgroundSize: "cover",
      backgroundPosition: `center ${user.banner.position ?? 50}%`,
    };
  }
  return { background: user.banner.color };
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}
