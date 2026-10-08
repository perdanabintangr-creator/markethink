"use client";

import posthog from "posthog-js";

export function track(event: string, props?: Record<string, unknown>) {
  if (process.env.NEXT_PUBLIC_POSTHOG_KEY && posthog.__loaded) posthog.capture(event, props);
}

export function identify(userId: string, props?: Record<string, unknown>) {
  if (process.env.NEXT_PUBLIC_POSTHOG_KEY && posthog.__loaded) posthog.identify(userId, props);
}
