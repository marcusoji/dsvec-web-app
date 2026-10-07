import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requirePermission, type AdminAuthContext } from "./admin-auth";

/**
 * How many posts the public Umutu page shows. When a new post would push past
 * this, the oldest *unpinned* post is removed (and its media deleted); pinned
 * posts are kept and take up one of the slots instead.
 */
export const NEWS_VISIBLE_LIMIT = 4;

/** Media constraints. Images are re-encoded on the client; documents are sent raw. */
export const NEWS_IMAGE_MAX_BYTES = 1_500_000;
export const NEWS_DOC_MAX_BYTES = 4_000_000;
const ALLOWED_IMAGE_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_DOC_MIME = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
];

export type NewsAttachment = {
  id: string;
  kind: "image" | "document";
  file_name: string;
  mime_type: string;
  size_bytes: number;
  /** Short-lived signed URL for previewing or downloading the file. */
  url: string | null;
};

export type NewsPost = {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  author_email: string | null;
  created_at: string;
  updated_at: string;
  attachments: NewsAttachment[];
};

type AttachmentRow = {
  id: string;
  kind: "image" | "document";
  bucket: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
};

const POST_COLUMNS =
  "id, title, body, pinned, author_email, created_at, updated_at, news_attachments(id, kind, bucket, storage_path, file_name, mime_type, size_bytes)";

const SIGNED_URL_TTL_SECONDS = 60 * 60;

async function signAttachments(rows: AttachmentRow[]): Promise<NewsAttachment[]> {
  const out: NewsAttachment[] = [];
  for (const row of rows) {
    const { data: signed } = await supabaseAdmin.storage
      .from(row.bucket)
      .createSignedUrl(row.storage_path, SIGNED_URL_TTL_SECONDS);
    out.push({
      id: row.id,
      kind: row.kind,
      file_name: row.file_name,
      mime_type: row.mime_type,
      size_bytes: row.size_bytes,
      url: signed?.signedUrl ?? null,
    });
  }
  return out;
}

type RawPostRow = {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  author_email: string | null;
  created_at: string;
  updated_at: string;
  news_attachments: AttachmentRow[] | null;
};

async function mapPosts(rows: RawPostRow[]): Promise<NewsPost[]> {
  const out: NewsPost[] = [];
  for (const row of rows) {
    out.push({
      id: row.id,
      title: row.title,
      body: row.body,
      pinned: row.pinned,
      author_email: row.author_email,
      created_at: row.created_at,
      updated_at: row.updated_at,
      attachments: await signAttachments(row.news_attachments ?? []),
    });
  }
  return out;
}

/**
 * The posts shown on the public page: every pinned post, then the newest
 * unpinned posts until {@link NEWS_VISIBLE_LIMIT} is reached.
 */
export const listNewsPosts = createServerFn({ method: "GET" }).handler(
  async (): Promise<NewsPost[]> => {
    const { data, error } = await supabaseAdmin
      .from("news_posts")
      .select(POST_COLUMNS)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(NEWS_VISIBLE_LIMIT);
    if (error) {
      console.error("[news] list failed", error.message);
      return [];
    }
    return mapPosts((data ?? []) as unknown as RawPostRow[]);
  },
);

/** Everything an administrator manages, newest first. */
export const listAllNewsPosts = createServerFn({ method: "GET" })
  .middleware([requirePermission("news.manage")])
  .handler(async (): Promise<NewsPost[]> => {
    const { data, error } = await supabaseAdmin
      .from("news_posts")
      .select(POST_COLUMNS)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error("Could not load news posts");
    return mapPosts((data ?? []) as unknown as RawPostRow[]);
  });

type MediaInput = { data_url: string; file_name: string };

const mediaSchema = z.object({
  title: z.string().trim().min(3).max(160),
  body: z.string().trim().min(1).max(8000),
  pinned: z.boolean().default(false),
  image: z
    .object({
      data_url: z.string().min(1),
      file_name: z.string().trim().min(1).max(200),
    })
    .optional(),
  documents: z
    .array(
      z.object({
        data_url: z.string().min(1),
        file_name: z.string().trim().min(1).max(200),
      }),
    )
    .max(10)
    .default([]),
});

/** Decode a `data:` URL into bytes and its declared mime type. */
function decodeDataUrl(dataUrl: string): { bytes: Uint8Array; mime: string } | null {
  const match = /^data:([^;,]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  try {
    const binary = Uint8Array.from(atob(match[2] as string), (c) => c.charCodeAt(0));
    return { bytes: binary, mime: match[1] as string };
  } catch {
    return null;
  }
}

function extensionFor(mime: string, fileName: string): string {
  const fromName = fileName.includes(".") ? fileName.split(".").pop() : "";
  if (fromName && fromName.length <= 5) return fromName.toLowerCase();
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  if (mime === "application/pdf") return "pdf";
  return "bin";
}

type PreparedAttachment = {
  kind: "image" | "document";
  bucket: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
};

async function uploadMedia(
  postId: string,
  image: MediaInput | undefined,
  documents: MediaInput[],
): Promise<PreparedAttachment[]> {
  const prepared: PreparedAttachment[] = [];

  const uploadOne = async (media: MediaInput, kind: "image" | "document") => {
    const decoded = decodeDataUrl(media.data_url);
    if (!decoded) throw new Error(`Could not read "${media.file_name}".`);
    const mime = decoded.mime || "application/octet-stream";
    const allowed = kind === "image" ? ALLOWED_IMAGE_MIME : ALLOWED_DOC_MIME;
    if (!allowed.includes(mime)) {
      throw new Error(`"${media.file_name}" is not a supported ${kind} file type.`);
    }
    const limit = kind === "image" ? NEWS_IMAGE_MAX_BYTES : NEWS_DOC_MAX_BYTES;
    if (decoded.bytes.byteLength > limit) {
      throw new Error(
        `"${media.file_name}" is too large (max ${Math.round(limit / 1024 / 1024)} MB).`,
      );
    }
    const ext = extensionFor(mime, media.file_name);
    const path = `${postId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabaseAdmin.storage
      .from("news-media")
      .upload(path, decoded.bytes, { contentType: mime, upsert: false });
    if (error) throw new Error(`Could not upload "${media.file_name}".`);
    prepared.push({
      kind,
      bucket: "news-media",
      storage_path: path,
      file_name: media.file_name,
      mime_type: mime,
      size_bytes: decoded.bytes.byteLength,
    });
  };

  try {
    if (image) await uploadOne(image, "image");
    for (const doc of documents) await uploadOne(doc, "document");
  } catch (err) {
    // Roll back anything already stored so a rejected file cannot leak space.
    if (prepared.length) {
      await supabaseAdmin.storage.from("news-media").remove(prepared.map((p) => p.storage_path));
    }
    throw err;
  }
  return prepared;
}

export type PrunablePost = { id: string; pinned: boolean; created_at: string };

/**
 * Chooses which posts to drop so the public page never exceeds
 * {@link NEWS_VISIBLE_LIMIT}: every pinned post is kept, then the newest
 * unpinned posts fill the remaining slots, and the rest are doomed. `keepId`
 * (the post just created or updated) is always retained, so a freshly published
 * post is never dropped when every slot is already taken. Pure, so the rolling
 * window can be reasoned about and tested without a database.
 */
export function selectPostsToPrune(rows: PrunablePost[], keepId?: string): string[] {
  const pinned = rows.filter((r) => r.pinned);
  const unpinned = rows.filter((r) => !r.pinned);
  const roomForUnpinned = Math.max(0, NEWS_VISIBLE_LIMIT - pinned.length);
  const kept = new Set<string>([
    ...pinned.map((r) => r.id),
    ...unpinned.slice(0, roomForUnpinned).map((r) => r.id),
  ]);
  if (keepId) kept.add(keepId);
  return rows.filter((r) => !kept.has(r.id)).map((r) => r.id);
}

/**
 * After a write, drop any post that no longer fits, deleting the post and its
 * media. This is what makes the page a rolling four. Errors thrown here happen
 * after the write has succeeded, so they never orphan the newly saved post.
 */
async function pruneNewsPosts(keepId?: string): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from("news_posts")
    .select("id, pinned, created_at")
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error("Could not tidy older news posts");

  const doomed = selectPostsToPrune((data ?? []) as PrunablePost[], keepId);
  if (!doomed.length) return 0;

  for (const id of doomed) {
    const { data: files } = await supabaseAdmin
      .from("news_attachments")
      .select("bucket, storage_path")
      .eq("post_id", id);
    const byBucket = new Map<string, string[]>();
    for (const f of files ?? []) {
      byBucket.set(f.bucket, [...(byBucket.get(f.bucket) ?? []), f.storage_path]);
    }
    for (const [bucket, paths] of byBucket) {
      await supabaseAdmin.storage.from(bucket).remove(paths);
    }
  }
  await supabaseAdmin.from("news_posts").delete().in("id", doomed);
  return doomed.length;
}

export const createNewsPost = createServerFn({ method: "POST" })
  .middleware([requirePermission("news.manage")])
  .validator(mediaSchema)
  .handler(async ({ data, context }): Promise<{ id: string; pruned: number }> => {
    const admin = (context as AdminAuthContext).admin;
    const { data: post, error } = await supabaseAdmin
      .from("news_posts")
      .insert({
        title: data.title,
        body: data.body,
        pinned: data.pinned,
        author_email: admin.email,
        created_by: admin.userId,
      })
      .select("id")
      .single();
    if (error || !post) throw new Error("Could not publish the news post");

    let uploaded: PreparedAttachment[] = [];
    try {
      uploaded = await uploadMedia(post.id, data.image, data.documents);
      if (uploaded.length) {
        const { error: attachError } = await supabaseAdmin.from("news_attachments").insert(
          uploaded.map((p) => ({
            post_id: post.id,
            kind: p.kind,
            bucket: p.bucket,
            storage_path: p.storage_path,
            file_name: p.file_name,
            mime_type: p.mime_type,
            size_bytes: p.size_bytes,
          })),
        );
        if (attachError) throw new Error("Could not save the news attachments");
      }
    } catch (err) {
      // Never leave a half-published post (or its files) behind.
      if (uploaded.length) {
        await supabaseAdmin.storage.from("news-media").remove(uploaded.map((p) => p.storage_path));
      }
      await supabaseAdmin.from("news_posts").delete().eq("id", post.id);
      throw err;
    }

    const pruned = await pruneNewsPosts(post.id);
    return { id: post.id, pruned };
  });

export const updateNewsPost = createServerFn({ method: "POST" })
  .middleware([requirePermission("news.manage")])
  .validator(
    z.object({
      id: z.string().uuid(),
      title: z.string().trim().min(3).max(160),
      body: z.string().trim().min(1).max(8000),
      pinned: z.boolean(),
      remove_attachment_ids: z.array(z.string().uuid()).max(50).default([]),
      image: z
        .object({ data_url: z.string().min(1), file_name: z.string().trim().min(1).max(200) })
        .optional(),
      documents: z
        .array(
          z.object({ data_url: z.string().min(1), file_name: z.string().trim().min(1).max(200) }),
        )
        .max(10)
        .default([]),
    }),
  )
  .handler(async ({ data }): Promise<{ pruned: number }> => {
    const { error } = await supabaseAdmin
      .from("news_posts")
      .update({ title: data.title, body: data.body, pinned: data.pinned })
      .eq("id", data.id);
    if (error) throw new Error("Could not save the news post");

    if (data.remove_attachment_ids.length) {
      const { data: files } = await supabaseAdmin
        .from("news_attachments")
        .select("bucket, storage_path")
        .in("id", data.remove_attachment_ids)
        .eq("post_id", data.id);
      const byBucket = new Map<string, string[]>();
      for (const f of files ?? []) {
        byBucket.set(f.bucket, [...(byBucket.get(f.bucket) ?? []), f.storage_path]);
      }
      for (const [bucket, paths] of byBucket) {
        await supabaseAdmin.storage.from(bucket).remove(paths);
      }
      await supabaseAdmin
        .from("news_attachments")
        .delete()
        .in("id", data.remove_attachment_ids)
        .eq("post_id", data.id);
    }

    const prepared = await uploadMedia(data.id, data.image, data.documents);
    if (prepared.length) {
      const { error: attachError } = await supabaseAdmin.from("news_attachments").insert(
        prepared.map((p) => ({
          post_id: data.id,
          kind: p.kind,
          bucket: p.bucket,
          storage_path: p.storage_path,
          file_name: p.file_name,
          mime_type: p.mime_type,
          size_bytes: p.size_bytes,
        })),
      );
      // The post already exists, so drop only the new files rather than the post.
      if (attachError) {
        await supabaseAdmin.storage.from("news-media").remove(prepared.map((p) => p.storage_path));
        throw new Error("Could not save the news attachments");
      }
    }

    const pruned = await pruneNewsPosts(data.id);
    return { pruned };
  });

export const deleteNewsPost = createServerFn({ method: "POST" })
  .middleware([requirePermission("news.manage")])
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }): Promise<{ deleted: true }> => {
    const { data: files } = await supabaseAdmin
      .from("news_attachments")
      .select("bucket, storage_path")
      .eq("post_id", data.id);
    const byBucket = new Map<string, string[]>();
    for (const f of files ?? []) {
      byBucket.set(f.bucket, [...(byBucket.get(f.bucket) ?? []), f.storage_path]);
    }
    for (const [bucket, paths] of byBucket) {
      await supabaseAdmin.storage.from(bucket).remove(paths);
    }
    const { error } = await supabaseAdmin.from("news_posts").delete().eq("id", data.id);
    if (error) throw new Error("Could not delete the news post");
    return { deleted: true };
  });
