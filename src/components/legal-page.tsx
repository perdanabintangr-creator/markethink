import { Logo } from "@/components/logo";

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Logo />
      <article className="prose prose-neutral dark:prose-invert mt-8 max-w-none">
        <h1>{title}</h1>
        {children}
      </article>
    </div>
  );
}
