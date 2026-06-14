import type { Server } from "../types";

/** Renders a server's image icon if set, otherwise its emoji. */
export function ServerIcon({ server, size = 24 }: { server: Server; size?: number }) {
  if (server.iconImage) {
    return (
      <img
        src={server.iconImage}
        alt={server.name}
        style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }}
      />
    );
  }
  return <span style={{ fontSize: size }}>{server.icon}</span>;
}
