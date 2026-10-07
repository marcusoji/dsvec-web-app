import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Download, Eye, FileText, Newspaper, Pin, X } from "lucide-react";

import { listNewsPosts, type NewsAttachment, type NewsPost } from "@/lib/news.functions";

const newsQuery = {
  queryKey: ["news", "public"],
  queryFn: () => listNewsPosts(),
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Lagos",
  }).format(new Date(value));

const isImage = (a: NewsAttachment) => a.kind === "image";
const canPreviewInline = (a: NewsAttachment) =>
  a.mime_type === "application/pdf" ||
  a.mime_type.startsWith("image/") ||
  a.mime_type === "text/plain";

function AttachmentActions({ attachment }: { attachment: NewsAttachment }) {
  if (!attachment.url) return null;
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
      {canPreviewInline(attachment) ? (
        <a
          href={attachment.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 underline underline-offset-4"
        >
          <Eye className="size-3.5" aria-hidden="true" /> Read
        </a>
      ) : null}
      <a
        href={attachment.url}
        download={attachment.file_name}
        className="inline-flex items-center gap-1 underline underline-offset-4"
      >
        <Download className="size-3.5" aria-hidden="true" /> Download
      </a>
    </div>
  );
}

function NewsCard({ post }: { post: NewsPost }) {
  const images = post.attachments.filter(isImage).filter((a) => a.url);
  const documents = post.attachments.filter((a) => !isImage(a));
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [lead, ...rest] = images;

  return (
    <article className="surface-card flex flex-col overflow-hidden">
      {lead ? (
        <button
          type="button"
          onClick={() => setLightbox(lead.url)}
          className="block max-h-56 w-full overflow-hidden bg-secondary"
          aria-label="View picture"
        >
          <img
            src={lead.url ?? ""}
            alt={lead.file_name}
            className="h-56 w-full object-cover transition-transform hover:scale-[1.02]"
          />
        </button>
      ) : null}

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CalendarDays className="size-3.5" aria-hidden="true" />
          {formatDate(post.created_at)}
          {post.pinned ? (
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary">
              <Pin className="size-3" aria-hidden="true" /> Pinned
            </span>
          ) : null}
        </div>
        <h3 className="mt-2 font-display text-lg leading-snug">{post.title}</h3>
        <p className="mt-2 flex-1 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
          {post.body}
        </p>

        {rest.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {rest.map((img) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setLightbox(img.url)}
                className="size-16 overflow-hidden rounded-md border border-border"
                aria-label={`View ${img.file_name}`}
              >
                <img src={img.url ?? ""} alt={img.file_name} className="size-full object-cover" />
              </button>
            ))}
          </div>
        ) : null}

        {documents.length ? (
          <ul className="mt-4 space-y-2">
            {documents.map((doc) => (
              <li
                key={doc.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <FileText className="size-4 shrink-0 text-primary" aria-hidden="true" />
                  <span className="truncate text-sm font-medium" title={doc.file_name}>
                    {doc.file_name}
                  </span>
                </span>
                <AttachmentActions attachment={doc} />
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {lightbox ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Picture preview"
          className="fixed inset-0 z-[100] grid place-items-center bg-ink/80 p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            aria-label="Close preview"
            className="absolute right-4 top-4 grid size-10 place-items-center rounded-md bg-background text-foreground"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
          <img
            src={lightbox}
            alt="News picture"
            className="max-h-[90vh] max-w-[92vw] rounded-md object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
    </article>
  );
}

export function NewsSection() {
  const { data, isLoading } = useQuery(newsQuery);
  const posts = data ?? [];

  if (isLoading || !posts.length) return null;

  return (
    <section className="border-t border-border bg-secondary/40">
      <div className="container-page py-16 md:py-20">
        <div className="rule-accent">
          <p className="eyebrow">Latest information</p>
          <h2 className="mt-2 text-2xl md:text-3xl">News from the centre</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Announcements, notices and updates from the Delta State Vocational Center, Umutu.
          </p>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {posts.map((post) => (
            <NewsCard key={post.id} post={post} />
          ))}
        </div>
      </div>
    </section>
  );
}
