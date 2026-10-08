"use client";

export const CHATS_CHANGED = "mt:chats-changed";
export const CREDITS_CHANGED = "mt:credits-changed";

export function emitChatsChanged() {
  window.dispatchEvent(new Event(CHATS_CHANGED));
}

export function emitCredits(remaining: number) {
  window.dispatchEvent(new CustomEvent(CREDITS_CHANGED, { detail: remaining }));
}
