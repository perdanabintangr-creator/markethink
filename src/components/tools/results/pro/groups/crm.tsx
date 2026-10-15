"use client";

/** Halaman hasil tools kelompok "crm". Tambahkan: <tool>: ({ data }) => <XxxResult data={data as XxxOutput} /> */
export const VIEWS: Record<string, (props: { data: unknown; input: Record<string, unknown> }) => React.ReactNode> = {};
