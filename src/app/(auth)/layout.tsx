import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-b from-accent/40 to-background px-4 py-10">
      <Logo className="mb-8 text-lg" />
      <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-sm">{children}</div>
    </div>
  );
}
