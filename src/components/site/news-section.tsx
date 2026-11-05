import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Newspaper,
  Pin,
  X,
} from "lucide-react";

import { listNewsPosts, type NewsAttachment, type NewsPost } from "@/lib/news.functions";
import { ShareMenu } from "@/components/site/share-menu";
import type { ShareInput } from "@/lib/share";

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

const isImage = (a: NewsAttachment) => a.kind === "image" && !!a.url;
const canPreviewInline = (a: NewsAttachment) =>
  a.mime_type === "application/pdf" ||
  a.mime_type.startsWith("image/") ||
  a.mime_type === "text/plain";

/** Deep link to a single post on the Umutu page, for sharing. */
const NEWS_HASH_PREFIX = "#news-";

const shareInput = (post: NewsPost, baseUrl: string): ShareInput => ({
  title: post.title,
  text: post.body.replace(/\s+/g, " ").trim().slice(0, 180),
  url: `${baseUrl}${NEWS_HASH_PREFIX}${post.id}`,
});

/** A card shows a short teaser; anything longer opens in the reader. */
const CLAMP_CHARS = 220;
const needsReadMore = (post: NewsPost, images: NewsAttachment[], documents: NewsAttachment[]) =>
  post.body.length > CLAMP_CHARS || images.length > 0 || documents.length > 0;

/** How long each card stays before the carousel advances on its own. */
const AUTOPLAY_MS = 5000;

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

function PostReader({
  post,
  baseUrl,
  onClose,
  onPreviewImage,
}: {
  post: NewsPost;
  baseUrl: string;
  onClose: () => void;
  onPreviewImage: (url: string) => void;
}) {
  const images = post.attachments.filter(isImage);
  const documents = post.attachments.filter((a) => !isImage(a));
  const [cover, ...gallery] = images;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={post.title}
      className="fixed inset-0 z-[100] grid place-items-center bg-ink/80 p-4"
      onClick={onClose}
    >
      <div
        className="surface-card flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border p-5">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <CalendarDays className="size-3.5" aria-hidden="true" />
              {formatDate(post.created_at)}
              {post.pinned ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary">
                  <Pin className="size-3" aria-hidden="true" /> Pinned
                </span>
              ) : null}
            </div>
            <h2 className="mt-1 font-display text-xl leading-snug">{post.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-9 shrink-0 place-items-center rounded-md border border-border-strong bg-paper text-foreground"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="overflow-y-auto p-5">
          {cover ? (
            <button
              type="button"
              onClick={() => onPreviewImage(cover.url ?? "")}
              className="mb-4 block max-h-80 w-full overflow-hidden rounded-md bg-secondary"
              aria-label="View picture"
            >
              <img
                src={cover.url ?? ""}
                alt={cover.file_name}
                className="max-h-80 w-full object-contain"
              />
            </button>
          ) : null}

          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{post.body}</p>

          {gallery.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {gallery.map((img) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => onPreviewImage(img.url ?? "")}
                  className="size-20 overflow-hidden rounded-md border border-border"
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

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-4">
          <span className="text-xs text-muted-foreground">Share this update</span>
          {/* z-[120] lifts the menu above this z-[100] reader. */}
          <ShareMenu input={shareInput(post, baseUrl)} className="z-[120]" />
        </div>
      </div>
    </div>
  );
}

function NewsCard({
  post,
  showMedia,
  baseUrl,
  onRead,
}: {
  post: NewsPost;
  showMedia: boolean;
  baseUrl: string;
  onRead: (post: NewsPost) => void;
}) {
  const images = post.attachments.filter(isImage);
  const documents = post.attachments.filter((a) => !isImage(a));
  const [lead, ...rest] = images;
  const showReadMore = needsReadMore(post, images, documents);

  return (
    <article
      id={`news-${post.id}`}
      className="surface-card flex h-full scroll-mt-24 flex-col overflow-hidden"
    >
      {showMedia ? (
        lead ? (
          <button
            type="button"
            onClick={() => onRead(post)}
            className="block h-56 w-full shrink-0 overflow-hidden bg-secondary"
            aria-label={`Read ${post.title}`}
          >
            <img
              src={lead.url ?? ""}
              alt={lead.file_name}
              className="h-56 w-full object-cover transition-transform hover:scale-[1.02]"
            />
          </button>
        ) : (
          <div className="grid h-56 w-full shrink-0 place-items-center bg-secondary/60">
            <Newspaper className="size-10 text-muted-foreground" aria-hidden="true" />
          </div>
        )
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
        <p className="mt-2 line-clamp-4 min-h-[5.7rem] whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
          {post.body}
        </p>

        <div className="mt-auto pt-4">
          {rest.length || documents.length ? (
            <p className="mb-3 text-xs text-muted-foreground">
              {[
                images.length ? `${images.length} photo${images.length === 1 ? "" : "s"}` : null,
                documents.length
                  ? `${documents.length} file${documents.length === 1 ? "" : "s"}`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          ) : null}
          {showReadMore ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onRead(post)}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground"
              >
                Read more
              </button>
              <ShareMenu input={shareInput(post, baseUrl)} triggerClassName="px-3.5 py-2" />
            </div>
          ) : (
            <ShareMenu input={shareInput(post, baseUrl)} triggerClassName="px-3.5 py-2" />
          )}
        </div>
      </div>
    </article>
  );
}

export function NewsSection() {
  const { data, isLoading } = useQuery(newsQuery);
  const posts = useMemo(() => data ?? [], [data]);
  const trackRef = useRef<HTMLDivElement>(null);
  const [reading, setReading] = useState<NewsPost | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [edge, setEdge] = useState({ start: true, end: false });
  const [paused, setPaused] = useState(false);
  // Absolute base for share links. Set after mount (SSR has no origin) and kept
  // stable so the reader's copy-link never re-renders on a re-render.
  const [baseUrl, setBaseUrl] = useState("/umutu");
  useEffect(() => {
    setBaseUrl(`${window.location.origin}/umutu`);
  }, []);

  // A shared /umutu#news-<id> link should open that post already expanded, both
  // on a fresh page load and when the hash changes in place (someone pasting the
  // link while already on the page). The list arrives after mount, so wait for
  // the posts and match by id; unknown or stale ids are ignored and the visitor
  // just lands on the page. The mount run is guarded so a background refetch
  // cannot reopen a reader the visitor has closed.
  const deepLinkDone = useRef(false);
  useEffect(() => {
    if (!posts.length) return;
    const openFromHash = () => {
      const id = window.location.hash.slice(NEWS_HASH_PREFIX.length);
      if (!id) return;
      const match = posts.find((p) => p.id === id);
      if (!match) return;
      // Move the page onto the card first (synchronously, before the reader locks
      // scrolling) so closing the reader leaves the visitor at the right post.
      document
        .getElementById(`news-${id}`)
        ?.scrollIntoView({ block: "start", behavior: "instant" });
      setReading(match);
    };
    if (!deepLinkDone.current) {
      deepLinkDone.current = true;
      openFromHash();
    }
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, [posts]);

  function updateEdges() {
    const el = trackRef.current;
    if (!el) return;
    const start = el.scrollLeft <= 4;
    const end = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
    setEdge({ start, end });
  }

  useEffect(() => {
    updateEdges();
    window.addEventListener("resize", updateEdges);
    return () => window.removeEventListener("resize", updateEdges);
  }, [posts.length]);

  function scrollByCard(direction: 1 | -1) {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * Math.round(el.clientWidth * 0.9), behavior: "smooth" });
  }

  // Auto-advance while the visitor is idle. Move a page at a time and loop back
  // to the start once the end is reached; pause on hover, on keyboard focus,
  // while a reader/lightbox is open, and when the visitor prefers reduced motion.
  useEffect(() => {
    if (posts.length < 2 || paused || reading || lightbox) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => {
      const el = trackRef.current;
      if (!el) return;
      const step = Math.min(el.scrollWidth - el.clientWidth, el.clientWidth * 0.9);
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 4) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        el.scrollBy({ left: step, behavior: "smooth" });
      }
    }, AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [posts.length, paused, reading, lightbox]);

  if (isLoading || !posts.length) return null;

  const anyMedia = posts.some((p) => p.attachments.some(isImage));

  return (
    <section
      className="border-t border-border bg-secondary/40"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="container-page py-16 md:py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="rule-accent">
            <p className="eyebrow">Latest information</p>
            <h2 className="mt-2 text-2xl md:text-3xl">News from the centre</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Announcements, notices and updates from the Delta State Vocational Center, Umutu.
            </p>
          </div>
          {posts.length > 1 ? (
            <div className="hidden gap-2 sm:flex">
              <button
                type="button"
                onClick={() => scrollByCard(-1)}
                disabled={edge.start}
                aria-label="Previous news"
                className="grid size-10 place-items-center rounded-full border border-border-strong bg-paper text-foreground disabled:opacity-40"
              >
                <ChevronLeft className="size-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => scrollByCard(1)}
                disabled={edge.end}
                aria-label="Next news"
                className="grid size-10 place-items-center rounded-full border border-border-strong bg-paper text-foreground disabled:opacity-40"
              >
                <ChevronRight className="size-5" aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </div>

        <div
          ref={trackRef}
          onScroll={updateEdges}
          className="mt-8 flex snap-x snap-mandatory items-stretch gap-5 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {posts.map((post) => (
            <div
              key={post.id}
              className="w-[85%] shrink-0 snap-start sm:w-[calc(50%-0.625rem)] lg:w-[calc(33.333%-0.834rem)]"
            >
              <NewsCard post={post} showMedia={anyMedia} baseUrl={baseUrl} onRead={setReading} />
            </div>
          ))}
        </div>
      </div>

      {reading ? (
        <PostReader
          post={reading}
          baseUrl={baseUrl}
          onClose={() => setReading(null)}
          onPreviewImage={setLightbox}
        />
      ) : null}

      {lightbox ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Picture preview"
          className="fixed inset-0 z-[110] grid place-items-center bg-ink/80 p-4"
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
    </section>
  );
}
