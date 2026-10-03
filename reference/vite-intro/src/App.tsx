import { useState } from "react";
import { Boot } from "@/sequence/Boot";
import { Site } from "@/site/Site";
import type { Role } from "@/sequence/LoginPanel";

/**
 * Dev escape hatch. The opening film runs about twenty seconds end to end,
 * which is the right length to watch once and the wrong length to sit through
 * on every save. `?stage=site` (optionally `&role=concierge`) jumps straight in.
 * Stripped from production builds.
 */
function devStage(): Role | null {
  if (!import.meta.env.DEV) return null;
  const params = new URLSearchParams(window.location.search);
  if (params.get("stage") !== "site") return null;
  return params.get("role") === "concierge" ? "concierge" : "member";
}

export default function App() {
  const [role, setRole] = useState<Role | null>(devStage);

  // Signing out returns to the login, not to the opening film — the session
  // has already seen it once, and making someone sit through it twice would be
  // the opposite of hospitality.
  return role ? (
    <Site role={role} onSignOut={() => setRole(null)} />
  ) : (
    <Boot onFinish={setRole} />
  );
}
