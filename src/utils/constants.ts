export const GATEWAY_DEFAULT_PORT = 18789;
export const POLLING_INTERVAL_MS = 30_000;
export const STALE_THRESHOLD_MS = 60_000;

export const NAV_ITEMS = [
  { path: "/", label: "Overview", icon: "home" },
  { path: "/agents", label: "Agents", icon: "cpu" },
  { path: "/sessions", label: "Sessions", icon: "messages" },
  { path: "/swarm", label: "Coder Swarm", icon: "swarm" },
  { path: "/usage", label: "Usage & Costs", icon: "chart" },
  { path: "/cron", label: "Cron Jobs", icon: "clock" },
  { path: "/models", label: "Models", icon: "layers" },
  { path: "/logs", label: "Logs", icon: "terminal" },
] as const;

export type NavIcon = (typeof NAV_ITEMS)[number]["icon"];
