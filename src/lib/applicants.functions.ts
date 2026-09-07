import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { applicationSchema, normalizeEmail, normalizePhone } from "./validation";

export type SubmitResult =
  | { ok: true; application_number: string; access_token: string }
  | { ok: false; error: string; duplicate?: { application_number: string; status: string } };

export type ApplicationView = {
  application_number: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  gender: string;
  date_of_birth: string;
  nationality: string;
  email: string;
  phone: string;
  address: string;
  state: string;
  local_government: string;
  next_of_kin_name: string | null;
  next_of_kin_relationship: string | null;
  next_of_kin_phone: string | null;
  school: string | null;
  qualification: string | null;
  school_year: string | null;
  status: string;
  created_at: string;
  unit_name: string;
  stream: string;
  photo_url: string | null;
};

function maskEmail(email: string) {
  const [user, domain] = email.split("@");
  return `${(user ?? "").slice(0, 2)}***@${domain ?? ""}`;
}

function maskPhone(phone: string) {
  return `${phone.slice(0, 6)}****${phone.slice(-2)}`;
}

export const checkExistingApplication = createServerFn({ method: "POST" })
  .inputValidator((data: { email?: string; phone?: string }) =>
    z
      .object({ email: z.string().max(160).optional(), phone: z.string().max(30).optional() })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email ? normalizeEmail(data.email) : null;
    const phone = data.phone ? normalizePhone(data.phone) : null;
    if (!email && !phone) return { found: false as const };

    const filters: string[] = [];
    if (email) filters.push(`email.eq.${email}`);
    if (phone) filters.push(`phone.eq.${phone}`);

    const { data: row } = await supabaseAdmin
      .from("applicants")
      .select("application_number, status, email, phone")
      .or(filters.join(","))
      .limit(1)
      .maybeSingle();

    if (!row) return { found: false as const };
    return {
      found: true as const,
      application_number: row.application_number,
      status: row.status as string,
      matched: row.email === email ? ("email" as const) : ("phone" as const),
    };
  });

export const submitApplication = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => applicationSchema.parse(data))
  .handler(async ({ data }): Promise<SubmitResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = normalizeEmail(data.email);
    const phone = normalizePhone(data.phone);

    const { data: existing } = await supabaseAdmin
      .from("applicants")
      .select("application_number, status")
      .or(`email.eq.${email},phone.eq.${phone}`)
      .limit(1)
      .maybeSingle();

    if (existing) {
      await supabaseAdmin.from("activity_log").insert({
        event_type: "duplicate_attempt",
        application_number: existing.application_number,
        email_masked: maskEmail(email),
        phone_masked: maskPhone(phone),
        detail: "Registration blocked: email or phone already registered",
      });
      return {
        ok: false,
        error:
          "An application already exists with this email address or phone number. Each applicant may register only once.",
        duplicate: { application_number: existing.application_number, status: existing.status },
      };
    }

    const { data: unit } = await supabaseAdmin
      .from("units")
      .select("id")
      .eq("id", data.unit_id)
      .eq("is_active", true)
      .maybeSingle();
    if (!unit) return { ok: false, error: "The selected trade unit is no longer available." };

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("applicants")
      .insert({
        first_name: data.first_name.trim(),
        middle_name: data.middle_name?.trim() || null,
        last_name: data.last_name.trim(),
        gender: data.gender,
        date_of_birth: data.date_of_birth,
        nationality: data.nationality || "Nigerian",
        email,
        phone,
        address: data.address.trim(),
        state: data.state,
        local_government: data.local_government.trim(),
        next_of_kin_name: data.next_of_kin_name?.trim() || null,
        next_of_kin_relationship: data.next_of_kin_relationship?.trim() || null,
        next_of_kin_phone: data.next_of_kin_phone?.trim() || null,
        school: data.school?.trim() || null,
        qualification: data.qualification?.trim() || null,
        school_year: data.school_year?.trim() || null,
        unit_id: data.unit_id,
        stream: data.stream,
      })
      .select("id, application_number, access_token")
      .single();

    if (insertError || !inserted) {
      console.error("[applicants] insert failed", insertError?.message);
      if (insertError?.code === "23505") {
        return {
          ok: false,
          error: "An application already exists with this email address or phone number.",
        };
      }
      return { ok: false, error: "We could not save your application. Please try again." };
    }

    const match = /^data:(image\/[a-z]+);base64,(.+)$/.exec(data.photo_data_url);
    if (match) {
      const mime = match[1] as string;
      const binary = Uint8Array.from(atob(match[2] as string), (c) => c.charCodeAt(0));
      const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
      const path = `${inserted.id}/photograph.${ext}`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from("applicant-photos")
        .upload(path, binary, { contentType: mime, upsert: true });
      if (uploadError) {
        console.error("[applicants] photo upload failed", uploadError.message);
      } else {
        await supabaseAdmin.from("applicant_documents").insert({
          applicant_id: inserted.id,
          kind: "photograph",
          storage_path: path,
          mime_type: mime,
          size_bytes: binary.byteLength,
        });
      }
    }

    await supabaseAdmin.from("activity_log").insert({
      event_type: "application_submitted",
      applicant_id: inserted.id,
      application_number: inserted.application_number,
      email_masked: maskEmail(email),
      phone_masked: maskPhone(phone),
      detail: "New application submitted",
    });

    return {
      ok: true,
      application_number: inserted.application_number,
      access_token: inserted.access_token,
    };
  });

export const getApplicationByToken = createServerFn({ method: "GET" })
  .inputValidator((data: { token: string }) => ({ token: String(data.token).slice(0, 100) }))
  .handler(async ({ data }): Promise<ApplicationView | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("applicants")
      .select(
        "id, application_number, first_name, middle_name, last_name, gender, date_of_birth, nationality, email, phone, address, state, local_government, next_of_kin_name, next_of_kin_relationship, next_of_kin_phone, school, qualification, school_year, status, created_at, stream, units(name)",
      )
      .eq("access_token", data.token)
      .maybeSingle();

    if (error || !row) return null;

    const { data: doc } = await supabaseAdmin
      .from("applicant_documents")
      .select("storage_path")
      .eq("applicant_id", row.id)
      .eq("kind", "photograph")
      .maybeSingle();

    let photo_url: string | null = null;
    if (doc?.storage_path) {
      const { data: signed } = await supabaseAdmin.storage
        .from("applicant-photos")
        .createSignedUrl(doc.storage_path, 60 * 30);
      photo_url = signed?.signedUrl ?? null;
    }

    const unit = row.units as unknown as { name: string } | null;

    return {
      application_number: row.application_number,
      first_name: row.first_name,
      middle_name: row.middle_name,
      last_name: row.last_name,
      gender: row.gender,
      date_of_birth: row.date_of_birth,
      nationality: row.nationality,
      email: row.email,
      phone: row.phone,
      address: row.address,
      state: row.state,
      local_government: row.local_government,
      next_of_kin_name: row.next_of_kin_name,
      next_of_kin_relationship: row.next_of_kin_relationship,
      next_of_kin_phone: row.next_of_kin_phone,
      school: row.school,
      qualification: row.qualification,
      school_year: row.school_year,
      status: row.status,
      created_at: row.created_at,
      unit_name: unit?.name ?? "—",
      stream: row.stream ?? "1",
      photo_url,
    };
  });

export const lookupApplication = createServerFn({ method: "POST" })
  .inputValidator((data: { application_number: string; email: string }) => ({
    application_number: String(data.application_number).trim().toUpperCase().slice(0, 40),
    email: normalizeEmail(String(data.email)),
  }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("applicants")
      .select("access_token, status")
      .eq("application_number", data.application_number)
      .eq("email", data.email)
      .maybeSingle();
    if (!row) return { found: false as const };
    return { found: true as const, access_token: row.access_token, status: row.status as string };
  });
