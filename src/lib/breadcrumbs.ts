import { toolInfo } from "@/lib/addons/catalog";
import { toolNameL } from "@/lib/addons/i18n";
import type { WorkspaceUiText } from "@/lib/i18n/workspace-ui";
import type { Lang } from "@/lib/i18n/dict";
import type { WorkspaceSummary } from "@/lib/types";

export interface Crumb {
  label: string;
  href?: string;
}

/** Breadcrumb dari alamat halaman (tanpa data tambahan dari server). */
export function crumbsFor(pathname: string, t: WorkspaceUiText, lang: Lang, workspaces: WorkspaceSummary[]): Crumb[] {
  const parts = pathname.split("/").filter(Boolean);
  const [first, second, third] = parts;
  switch (first) {
    case "dashboard":
      return [{ label: t.dashboard }];
    case "chat":
      return [{ label: t.chat, href: "/chat" }];
    case "tools": {
      const root = { label: t.smartTools, href: "/tools" };
      if (!second) return [{ label: t.smartTools }];
      if (second === "agent") return [root, { label: t.agent }];
      if (second === "addons") return [root, { label: t.pricing }];
      const name = toolInfo(second) ? toolNameL(second, lang) : second;
      return third ? [root, { label: name, href: `/tools/${second}` }, { label: lang === "en" ? "Result" : "Hasil" }] : [root, { label: name }];
    }
    case "workspaces": {
      const root = { label: t.projects, href: "/workspaces" };
      const ws = second ? workspaces.find((w) => w.id === second) : undefined;
      return ws ? [root, { label: ws.name }] : [{ label: t.projects }];
    }
    case "agents":
      return [{ label: t.agent }];
    case "settings":
      return [{ label: t.settings }];
    case "pricing":
      return [{ label: t.pricing }];
    default:
      return [];
  }
}

