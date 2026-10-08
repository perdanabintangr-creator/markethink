"use client";

import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

function MarkdownImpl({ children, className }: { children: string; className?: string }) {
  return (
    <div
      className={cn(
        "prose prose-sm prose-neutral dark:prose-invert max-w-none break-words prose-p:leading-relaxed prose-pre:bg-muted prose-pre:text-foreground prose-headings:mt-4 prose-headings:mb-2 prose-table:my-3",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children, ...props }) => (
            <a href={href} target="_blank" rel="noopener noreferrer nofollow" {...props}>
              {children}
            </a>
          ),
          img: () => null,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

export const Markdown = memo(MarkdownImpl, (a, b) => a.children === b.children && a.className === b.className);
