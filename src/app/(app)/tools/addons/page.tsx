import { redirect } from "next/navigation";

/** Toko add-on per kelompok sudah ditutup: semua Smart Tools kini satu paket (Pro & Promax). */
export default function AddonStorePage() {
  redirect("/pricing");
}
