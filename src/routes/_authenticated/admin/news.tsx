import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Download,
  Eye,
  FileText,
  Image as ImageIcon,
  Loader2,
  Newspaper,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";

import {
  createNewsPost,
  deleteNewsPost,
  listAllNewsPosts,
  NEWS_DOC_MAX_BYTES,
  NEWS_VISIBLE_LIMIT,
  updateNewsPost,
  type NewsPost,
} from "@/lib/news.functions";
import { compressImage } from "@/lib/image-compression";

export const Route = createFileRoute("/_authenticated/admin/news")({
  head: () => ({
    meta: [
      { title: "School news | DSTVEB Umutu Branch Staff Portal" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: NewsAdmin,
});

const allNewsQuery = {
  queryKey: ["news", "all"],
  queryFn: () => listAllNewsPosts(),
};

const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

const savedMessage = (verb: string, pruned: number) =>
  pruned > 0
    ? `Post ${verb}. ${pruned} older post(s) removed to keep the page at ${NEWS_VISIBLE_LIMIT}.`
    : `Post ${verb}.`;

type Draft = {
  title: string;
  body: string;
  pinned: boolean;
  updatedAt: number;
};

const draftKey = (postId?: string) => `dsvec:news-draft:${postId ?? "new"}`;

function readDraft(postId?: string): Draft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(draftKey(postId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Draft>;
    if (typeof parsed.title !== "string" || typeof parsed.body !== "string") return null;
    return {
      title: parsed.title,
      body: parsed.body,
      pinned: Boolean(parsed.pinned),
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : 0,
    };
  } catch {
    return null;
  }
}

function writeDraft(postId: string | undefined, draft: Draft) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(draftKey(postId), JSON.stringify(draft));
  } catch {
    // Storage can be full or blocked; the saved draft on the server still stands.
  }
}

function clearDraft(postId?: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(draftKey(postId));
  } catch {
    // Nothing to do if storage is unavailable.
  }
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Lagos",
  }).format(new Date(value));

/** A file chosen in the form, kept as a data URL until the post is saved. */
type PickedFile = { data_url: string; file_name: string; size: number };

/** Mime types the server accepts for attachments (images plus documents). */
const ALLOWED_UPLOAD_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
}

/** Loads an image File and re-encodes it to fit the upload budget. */
async function compressPickedImage(file: File): Promise<PickedFile | null> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Could not read that image."));
      img.src = objectUrl;
    });
    const compressed = compressImage(img, img.naturalWidth, img.naturalHeight);
    if (!compressed) return null;
    const baseName = file.name.replace(/\.[^.]+$/, "");
    return { data_url: compressed, file_name: `${baseName}.jpg`, size: file.size };
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function NewsAdmin() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery(allNewsQuery);
  const [editing, setEditing] = useState<NewsPost | null>(null);
  const [composing, setComposing] = useState(false);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  function refresh() {
    void qc.invalidateQueries({ queryKey: ["news"] });
  }

  async function remove(post: NewsPost) {
    if (!window.confirm(`Delete "${post.title}" and its attachments? This cannot be undone.`)) {
      return;
    }
    setBusy(post.id);
    try {
      await deleteNewsPost({ data: { id: post.id } });
      setMessage("News post deleted.");
      refresh();
    } catch {
      setMessage("Could not delete that post. Please try again.");
    } finally {
      setBusy("");
    }
  }

  const posts = data ?? [];
  // Mirrors selectPostsToPrune for the "On public page" badge: drafts never
  // count, pinned posts always show.
  const pinnedCount = posts.filter((p) => !p.is_draft && p.pinned).length;
  const publicIds = new Set([
    ...posts.filter((p) => !p.is_draft && p.pinned).map((p) => p.id),
    ...posts
      .filter((p) => !p.is_draft && !p.pinned)
      .slice(0, Math.max(0, NEWS_VISIBLE_LIMIT - pinnedCount))
      .map((p) => p.id),
  ]);

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display">School news</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Publish the latest information for the public Umutu page. Only the {NEWS_VISIBLE_LIMIT}{" "}
            most recent posts are shown; adding another drops the oldest unpinned post, while a
            pinned post keeps its place and pushes an older one out instead. Save a draft to keep
            work in progress off the public page — the form also keeps a local copy as you type, so
            a dropped connection will not lose your text.
          </p>
        </div>
        {!composing && !editing ? (
          <button
            type="button"
            onClick={() => {
              setComposing(true);
              setMessage("");
            }}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            <Plus className="size-4" aria-hidden="true" /> New post
          </button>
        ) : null}
      </div>

      {message ? <p className="mt-3 text-sm text-muted-foreground">{message}</p> : null}

      {composing ? (
        <NewsForm
          key="new"
          onCancel={() => setComposing(false)}
          onSaved={(pruned, draft) => {
            setComposing(false);
            setMessage(savedMessage(draft ? "saved" : "published", pruned));
            refresh();
          }}
        />
      ) : null}

      {editing ? (
        <NewsForm
          key={editing.id}
          post={editing}
          onCancel={() => setEditing(null)}
          onSaved={(pruned, draft) => {
            setEditing(null);
            setMessage(savedMessage(draft ? "saved" : "updated", pruned));
            refresh();
          }}
        />
      ) : null}

      <div className="mt-6 space-y-4">
        {isLoading ? (
          <p className="surface-card p-10 text-center text-sm text-muted-foreground">
            Loading news…
          </p>
        ) : !posts.length ? (
          <div className="surface-card flex flex-col items-center gap-2 p-12 text-center">
            <Newspaper className="size-8 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm font-medium">No news yet</p>
            <p className="text-sm text-muted-foreground">
              Publish the first post to show it on the Umutu page.
            </p>
          </div>
        ) : (
          posts.map((post) => (
            <article key={post.id} className="surface-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    {post.is_draft ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                        Draft
                      </span>
                    ) : post.pinned ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                        <Pin className="size-3" aria-hidden="true" /> Pinned
                      </span>
                    ) : null}
                    {publicIds.has(post.id) && !post.pinned ? (
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        On public page
                      </span>
                    ) : null}
                    <h2 className="font-display text-lg">{post.title}</h2>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatDate(post.created_at)}
                    {post.author_email ? ` · ${post.author_email}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(post);
                      setComposing(false);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border-strong bg-paper px-3 py-1.5 text-sm font-semibold"
                  >
                    <Pencil className="size-3.5" aria-hidden="true" /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(post)}
                    disabled={busy === post.id}
                    className="inline-flex items-center gap-1.5 rounded-md border border-destructive/40 px-3 py-1.5 text-sm font-semibold text-destructive disabled:opacity-50"
                  >
                    {busy === post.id ? (
                      <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <Trash2 className="size-3.5" aria-hidden="true" />
                    )}
                    Delete
                  </button>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {post.body}
              </p>
              {post.attachments.length ? (
                <div className="mt-4 flex flex-wrap gap-3">
                  {post.attachments.map((a) =>
                    a.kind === "image" ? (
                      a.url ? (
                        <a
                          key={a.id}
                          href={a.url}
                          target="_blank"
                          rel="noreferrer"
                          className="group relative block size-24 overflow-hidden rounded-md border border-border"
                        >
                          <img src={a.url} alt={a.file_name} className="size-full object-cover" />
                        </a>
                      ) : null
                    ) : (
                      <div
                        key={a.id}
                        className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2"
                      >
                        <FileText className="size-5 text-primary" aria-hidden="true" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium" title={a.file_name}>
                            {a.file_name}
                          </p>
                          <p className="text-xs text-muted-foreground">{mb(a.size_bytes)}</p>
                        </div>
                        {a.url ? (
                          <div className="flex gap-2">
                            <a
                              href={a.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-semibold text-foreground underline underline-offset-4"
                            >
                              <Eye className="size-3" aria-hidden="true" /> Read
                            </a>
                            <a
                              href={a.url}
                              download={a.file_name}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-foreground underline underline-offset-4"
                            >
                              <Download className="size-3" aria-hidden="true" /> Download
                            </a>
                          </div>
                        ) : null}
                      </div>
                    ),
                  )}
                </div>
              ) : null}
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function NewsForm({
  post,
  onCancel,
  onSaved,
}: {
  post?: NewsPost;
  onCancel: () => void;
  onSaved: (pruned: number, draft: boolean) => void;
}) {
  const [title, setTitle] = useState(post?.title ?? "");
  const [body, setBody] = useState(post?.body ?? "");
  const [pinned, setPinned] = useState(post?.pinned ?? false);
  const [image, setImage] = useState<PickedFile | null>(null);
  const [files, setFiles] = useState<PickedFile[]>([]);
  const [removeIds, setRemoveIds] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restoredAt, setRestoredAt] = useState<number | null>(null);
  const [autosavedAt, setAutosavedAt] = useState<number | null>(null);
  // Mirrors the latest field values so the autosave effects can read them
  // without re-running on every keystroke.
  const latest = useRef({
    title,
    body,
    pinned,
    image,
    files,
    removeIds,
    busy,
  });
  latest.current = { title, body, pinned, image, files, removeIds, busy };
  const skipAutosave = useRef(false);
  // Guards: the first debounce run is the mount (skip it so we never clobber a
  // recoverable draft), and the interval waits until the user has actually
  // edited something.
  const mounted = useRef(false);
  const edited = useRef(false);

  // Offer to restore unsaved text after a reload, crash or dropped network.
  useEffect(() => {
    const saved = readDraft(post?.id);
    if (!saved) return;
    if (post && saved.updatedAt <= new Date(post.updated_at).getTime()) {
      clearDraft(post.id);
      return;
    }
    const newer = !post || post.title !== saved.title || post.body !== saved.body;
    if (newer) setRestoredAt(saved.updatedAt);
    // Everything the effect needs is fixed for this mount (post id and the
    // server copy); the saved values are read once on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buildDraft = useCallback((): Draft => {
    const c = latest.current;
    return { title: c.title, body: c.body, pinned: c.pinned, updatedAt: Date.now() };
  }, []);

  const persistDraft = useCallback(
    (draft: Draft) => {
      writeDraft(post?.id, draft);
      setAutosavedAt(draft.updatedAt);
    },
    [post?.id],
  );

  // Snapshot on every edit (cheap, synchronous) …
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (skipAutosave.current) return;
    edited.current = true;
    const draft = buildDraft();
    if (!draft.title && !draft.body) return;
    const timer = window.setTimeout(() => persistDraft(draft), 600);
    return () => window.clearTimeout(timer);
  }, [title, body, pinned, buildDraft, persistDraft]);

  // … and a heavier safety write every 20 seconds, so a long typing session
  // survives even if the tab is closed between keystroke snapshots.
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (skipAutosave.current || latest.current.busy || !edited.current) return;
      const draft = buildDraft();
      if (draft.title || draft.body) persistDraft(draft);
    }, 20_000);
    return () => window.clearInterval(timer);
  }, [buildDraft, persistDraft]);

  function restoreDraft() {
    const saved = readDraft(post?.id);
    if (!saved) return;
    skipAutosave.current = true;
    edited.current = false;
    setTitle(saved.title);
    setBody(saved.body);
    setPinned(saved.pinned);
    setRestoredAt(null);
    window.setTimeout(() => {
      skipAutosave.current = false;
    }, 0);
  }

  function dismissRestore() {
    clearDraft(post?.id);
    setRestoredAt(null);
  }

  async function onImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("The cover image must be an image file.");
      return;
    }
    const prepared = await compressPickedImage(file);
    if (!prepared) {
      setError("Could not read that image.");
      return;
    }
    setError(null);
    setImage(prepared);
  }

  async function onFilesChange(e: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!picked.length) return;

    const prepared: PickedFile[] = [];
    for (const file of picked) {
      if (file.type.startsWith("image/")) {
        // Re-encode so a large photo still fits the image budget.
        const compressed = await compressPickedImage(file);
        if (!compressed) {
          setError(`Could not read "${file.name}".`);
          return;
        }
        prepared.push(compressed);
      } else {
        if (!ALLOWED_UPLOAD_TYPES.includes(file.type)) {
          setError(`"${file.name}" must be an image, PDF or Excel file.`);
          return;
        }
        if (file.size > NEWS_DOC_MAX_BYTES) {
          setError(`"${file.name}" is too large (max ${mb(NEWS_DOC_MAX_BYTES)}).`);
          return;
        }
        prepared.push({
          data_url: await readAsDataUrl(file),
          file_name: file.name,
          size: file.size,
        });
      }
    }
    setError(null);
    setFiles((current) => [...current, ...prepared].slice(0, 10));
  }

  async function save(draft: boolean) {
    setBusy(true);
    setError(null);
    // Freeze autosave so a queued snapshot cannot clobber the saved record.
    skipAutosave.current = true;
    try {
      if (post) {
        const res = await updateNewsPost({
          data: {
            id: post.id,
            title,
            body,
            pinned,
            is_draft: draft,
            remove_attachment_ids: [...removeIds],
            image: image ? { data_url: image.data_url, file_name: image.file_name } : undefined,
            files: files.map((d) => ({
              data_url: d.data_url,
              file_name: d.file_name,
            })),
          },
        });
        clearDraft(post.id);
        onSaved(res.pruned, res.is_draft);
      } else {
        const res = await createNewsPost({
          data: {
            title,
            body,
            pinned,
            is_draft: draft,
            image: image ? { data_url: image.data_url, file_name: image.file_name } : undefined,
            files: files.map((d) => ({ data_url: d.data_url, file_name: d.file_name })),
          },
        });
        clearDraft(undefined);
        onSaved(res.pruned, res.is_draft);
      }
    } catch (err) {
      skipAutosave.current = false;
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Could not save the news post. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    void save(false);
  }

  const keptAttachments = (post?.attachments ?? []).filter((a) => !removeIds.has(a.id));

  return (
    <form onSubmit={submit} className="surface-card mt-6 p-5">
      <h2 className="font-display text-lg">{post ? "Edit news post" : "New news post"}</h2>
      {post?.is_draft ? (
        <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Draft — not shown on the public page
        </p>
      ) : null}

      {restoredAt ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-secondary/60 px-3 py-2 text-sm">
          <span>Unsaved changes from your last visit were found.</span>
          <span className="flex gap-2">
            <button
              type="button"
              onClick={restoreDraft}
              className="rounded-md bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground"
            >
              Restore
            </button>
            <button
              type="button"
              onClick={dismissRestore}
              className="rounded-md border border-border-strong px-3 py-1 text-xs font-semibold"
            >
              Discard
            </button>
          </span>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <label htmlFor="news-title" className="mt-4 block text-sm font-medium text-foreground">
        Title
      </label>
      <input
        id="news-title"
        required
        minLength={3}
        maxLength={160}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="mt-1.5 h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />

      <label htmlFor="news-body" className="mt-4 block text-sm font-medium text-foreground">
        Information
      </label>
      <textarea
        id="news-body"
        required
        rows={6}
        maxLength={8000}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />

      <label className="mt-4 flex items-center gap-2 text-sm font-medium text-foreground">
        <input
          type="checkbox"
          checked={pinned}
          onChange={(e) => setPinned(e.target.checked)}
          className="size-4"
        />
        Pin this post {pinned ? "(keeps its place)" : "(may be replaced when newer posts arrive)"}
        {pinned ? (
          <Pin className="size-3.5 text-primary" aria-hidden="true" />
        ) : (
          <PinOff className="size-3.5 text-muted-foreground" aria-hidden="true" />
        )}
      </label>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="news-image" className="block text-sm font-medium text-foreground">
            Picture (optional)
          </label>
          <input
            id="news-image"
            type="file"
            accept="image/*"
            onChange={onImageChange}
            className="mt-1.5 block w-full text-sm"
          />
          {image ? (
            <div className="mt-2 inline-flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1 text-xs">
              <ImageIcon className="size-3.5 text-primary" aria-hidden="true" />
              {image.file_name}
              <button
                type="button"
                onClick={() => setImage(null)}
                aria-label="Remove picture"
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </div>

        <div>
          <label htmlFor="news-docs" className="block text-sm font-medium text-foreground">
            Files (optional, up to 10 — images, PDF or Excel)
          </label>
          <input
            id="news-docs"
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
            onChange={onFilesChange}
            className="mt-1.5 block w-full text-sm"
          />
        </div>
      </div>

      {keptAttachments.length ? (
        <div className="mt-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Current attachments
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {keptAttachments.map((a) => (
              <li
                key={a.id}
                className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1 text-xs"
              >
                {a.kind === "image" ? (
                  <ImageIcon className="size-3.5 text-primary" aria-hidden="true" />
                ) : (
                  <FileText className="size-3.5 text-primary" aria-hidden="true" />
                )}
                {a.file_name}
                <button
                  type="button"
                  onClick={() => setRemoveIds((s) => new Set(s).add(a.id))}
                  aria-label={`Remove ${a.file_name}`}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {files.length ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {files.map((d, i) => (
            <li
              key={`${d.file_name}-${i}`}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1 text-xs"
            >
              {d.data_url.startsWith("data:image/") ? (
                <ImageIcon className="size-3.5 text-primary" aria-hidden="true" />
              ) : (
                <FileText className="size-3.5 text-primary" aria-hidden="true" />
              )}
              {d.file_name}
              <button
                type="button"
                onClick={() => setFiles((list) => list.filter((_, index) => index !== i))}
                aria-label={`Remove ${d.file_name}`}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
          {post ? "Save changes" : "Publish post"}
        </button>
        <button
          type="button"
          onClick={() => void save(true)}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-md border border-border-strong bg-paper px-4 py-2 text-sm font-semibold disabled:opacity-60"
        >
          <Save className="size-4" aria-hidden="true" /> Save as draft
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="rounded-md border border-border-strong bg-paper px-4 py-2 text-sm font-semibold disabled:opacity-60"
        >
          Cancel
        </button>
        {autosavedAt ? (
          <span className="ml-auto text-xs text-muted-foreground" aria-live="polite">
            Draft saved locally at{" "}
            {new Intl.DateTimeFormat("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Africa/Lagos",
            }).format(new Date(autosavedAt))}
          </span>
        ) : null}
      </div>
    </form>
  );
}
