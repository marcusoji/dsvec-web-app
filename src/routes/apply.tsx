import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  FileDown,
  Info,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { PageHero, SiteShell } from "@/components/site/site-shell";
import { SITE } from "@/lib/site";
import { listUnits } from "@/lib/units.functions";
import {
  checkExistingApplication,
  lookupApplication,
  submitApplication,
} from "@/lib/applicants.functions";
import {
  MAX_PHOTO_BYTES,
  NIGERIAN_STATES,
  contactSchema,
  guardianEducationSchema,
  personalSchema,
  photoSchema,
  unitSchema,
} from "@/lib/validation";
import { cn } from "@/lib/utils";

const DESCRIPTION =
  "Apply online for admission into a trade unit at the DSTVEB Umutu Branch. Complete the guided form, upload a passport photograph and download your printable application form.";

const unitsQuery = queryOptions({ queryKey: ["units"], queryFn: () => listUnits() });

export const Route = createFileRoute("/apply")({
  head: () => ({
    meta: [
      { title: "Apply for Admission | DSTVEB Umutu Branch" },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: "Apply for Admission | DSTVEB Umutu Branch" },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(unitsQuery),
  component: ApplyPage,
});

const STEPS = [
  "Personal",
  "Contact",
  "Guardian & education",
  "Trade unit",
  "Photograph",
  "Review",
] as const;

type FormState = {
  first_name: string;
  middle_name: string;
  last_name: string;
  gender: string;
  date_of_birth: string;
  nationality: string;
  email: string;
  phone: string;
  address: string;
  state: string;
  local_government: string;
  next_of_kin_name: string;
  next_of_kin_relationship: string;
  next_of_kin_phone: string;
  school: string;
  qualification: string;
  school_year: string;
  unit_id: string;
  photo_data_url: string;
};

const EMPTY: FormState = {
  first_name: "",
  middle_name: "",
  last_name: "",
  gender: "",
  date_of_birth: "",
  nationality: "Nigerian",
  email: "",
  phone: "",
  address: "",
  state: "Delta",
  local_government: "",
  next_of_kin_name: "",
  next_of_kin_relationship: "",
  next_of_kin_phone: "",
  school: "",
  qualification: "",
  school_year: "",
  unit_id: "",
  photo_data_url: "",
};

function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string | null | undefined;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
      {hint && !error ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {error ? (
        <p role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const inputClass =
  "h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring";

function ApplyPage() {
  const { data: units } = useSuspenseQuery(unitsQuery);
  const navigate = useNavigate();
  const submit = useServerFn(submitApplication);
  const checkExisting = useServerFn(checkExistingApplication);
  const lookup = useServerFn(lookupApplication);

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [done, setDone] = useState<{ application_number: string; access_token: string } | null>(
    null,
  );
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (key: keyof FormState, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  const selectedUnit = useMemo(
    () => units.find((u) => u.id === form.unit_id),
    [units, form.unit_id],
  );

  async function validateStep(index: number) {
    const schema = [
      personalSchema,
      contactSchema,
      guardianEducationSchema,
      unitSchema,
      photoSchema,
    ][index];
    if (!schema) return true;
    const result = schema.safeParse(form);
    if (!result.success) {
      const next: Record<string, string> = {};
      for (const issue of result.error.issues) next[String(issue.path[0])] = issue.message;
      setErrors(next);
      return false;
    }
    if (index === 1) {
      const existing = await checkExisting({ data: { email: form.email, phone: form.phone } });
      if (existing.found) {
        setBlocked(
          `An application already exists for this ${existing.matched === "email" ? "email address" : "phone number"} (${existing.application_number}). Each applicant may register only once.`,
        );
        return false;
      }
      setBlocked(null);
    }
    return true;
  }

  async function next() {
    if (await validateStep(step)) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function onPhoto(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_PHOTO_BYTES) {
      setErrors((e) => ({ ...e, photo_data_url: "Photograph must be 2MB or smaller" }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => set("photo_data_url", String(reader.result));
    reader.readAsDataURL(file);
  }

  async function onSubmit() {
    setSubmitting(true);
    try {
      const result = await submit({
        data: { ...form, middle_name: form.middle_name || undefined },
      });
      if (!result.ok) {
        setBlocked(result.error);
        toast.error(result.error);
        return;
      }
      setDone({ application_number: result.application_number, access_token: result.access_token });
    } catch {
      toast.error("Submission failed. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <SiteShell>
        <section className="container-page py-16">
          <div className="mx-auto max-w-2xl text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-primary text-primary-foreground">
              <Check className="size-7" aria-hidden="true" />
            </span>
            <h1 className="mt-6 text-3xl md:text-4xl">Application submitted</h1>
            <p className="mt-3 text-muted-foreground">
              Your registration has been received. Keep your application number safe — it is
              required for all correspondence and screening.
            </p>
            <p className="mt-4 rounded-md border border-primary/30 bg-primary/10 p-3 text-sm text-foreground">
              A registration fee is payable before screening.{' '}
              <Link to="/contact" className="font-semibold underline underline-offset-4">
                Contact the Admissions Office
              </Link>{' '}
              by call, WhatsApp or email for the amount and payment details.
            </p>
            <p className="mt-6 font-display text-2xl tracking-tight">{done.application_number}</p>
            <div className="mt-8 flex flex-col items-center gap-3">
              <Link
                to="/application/$token"
                params={{ token: done.access_token }}
                className="inline-flex h-12 w-full max-w-sm items-center justify-center gap-2 rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground"
              >
                <FileDown className="size-4" aria-hidden="true" /> Download application form
              </Link>
              <button
                type="button"
                onClick={() => navigate({ to: "/" })}
                className="text-sm text-muted-foreground underline underline-offset-4"
              >
                Return to homepage
              </button>
            </div>
          </div>
        </section>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <PageHero
        eyebrow="Admissions"
        title="Online application & registration"
        lead="Complete all five steps. Each applicant may register once only — duplicate email addresses or phone numbers are rejected automatically."
      />
      <div className="container-page -mt-4 mb-8">
        <div className="flex items-start gap-3 rounded-md border border-primary/30 bg-primary/10 p-4 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          <p>
            A registration fee is payable after your application is submitted.{' '}
            <Link
              to="/contact"
              className="font-semibold underline underline-offset-4 hover:text-primary"
            >
              Click here for pricing and payment information
            </Link>
            {' '}— you can call, WhatsApp or email the Admissions Office before you apply.
          </p>
        </div>
      </div>
      <section className="container-page grid gap-10 py-12 lg:grid-cols-[1fr_20rem]">
        <div>
          <ol className="mb-8 flex flex-wrap gap-x-2 gap-y-2 text-xs" aria-label="Progress">
            {STEPS.map((label, i) => (
              <li key={label} className="flex items-center gap-2">
                <span
                  className={cn(
                    "grid size-6 place-items-center rounded-full border text-[0.7rem] font-semibold",
                    i < step
                      ? "border-primary bg-primary text-primary-foreground"
                      : i === step
                        ? "border-foreground text-foreground"
                        : "border-border text-muted-foreground",
                  )}
                  aria-current={i === step ? "step" : undefined}
                >
                  {i < step ? <Check className="size-3" aria-hidden="true" /> : i + 1}
                </span>
                <span className={cn(i === step ? "font-semibold" : "text-muted-foreground")}>
                  {label}
                </span>
                {i < STEPS.length - 1 ? <span className="text-border">—</span> : null}
              </li>
            ))}
          </ol>

          {blocked ? (
            <div
              role="alert"
              className="mb-6 flex gap-3 rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm"
            >
              <AlertTriangle
                className="mt-0.5 size-4 shrink-0 text-destructive"
                aria-hidden="true"
              />
              <p>{blocked}</p>
            </div>
          ) : null}

          <div className="surface-card p-6 md:p-8">
            {step === 0 ? (
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="First name" htmlFor="first_name" error={errors["first_name"]}>
                  <input
                    id="first_name"
                    className={inputClass}
                    value={form.first_name}
                    onChange={(e) => set("first_name", e.target.value)}
                  />
                </Field>
                <Field
                  label="Middle name (optional)"
                  htmlFor="middle_name"
                  error={errors["middle_name"]}
                >
                  <input
                    id="middle_name"
                    className={inputClass}
                    value={form.middle_name}
                    onChange={(e) => set("middle_name", e.target.value)}
                  />
                </Field>
                <Field label="Surname" htmlFor="last_name" error={errors["last_name"]}>
                  <input
                    id="last_name"
                    className={inputClass}
                    value={form.last_name}
                    onChange={(e) => set("last_name", e.target.value)}
                  />
                </Field>
                <Field label="Gender" htmlFor="gender" error={errors["gender"]}>
                  <select
                    id="gender"
                    className={inputClass}
                    value={form.gender}
                    onChange={(e) => set("gender", e.target.value)}
                  >
                    <option value="">Select…</option>
                    <option>Male</option>
                    <option>Female</option>
                  </select>
                </Field>
                <Field
                  label="Date of birth"
                  htmlFor="date_of_birth"
                  error={errors["date_of_birth"]}
                >
                  <input
                    id="date_of_birth"
                    type="date"
                    className={inputClass}
                    value={form.date_of_birth}
                    onChange={(e) => set("date_of_birth", e.target.value)}
                  />
                </Field>
                <Field label="Nationality" htmlFor="nationality" error={errors["nationality"]}>
                  <input
                    id="nationality"
                    className={inputClass}
                    value={form.nationality}
                    onChange={(e) => set("nationality", e.target.value)}
                  />
                </Field>
              </div>
            ) : null}

            {step === 1 ? (
              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="Email address"
                  htmlFor="email"
                  error={errors["email"]}
                  hint="Used for admission notices."
                >
                  <input
                    id="email"
                    type="email"
                    inputMode="email"
                    className={inputClass}
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                  />
                </Field>
                <Field
                  label="Phone number"
                  htmlFor="phone"
                  error={errors["phone"]}
                  hint="e.g. 08031234567"
                >
                  <input
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    className={inputClass}
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Residential address" htmlFor="address" error={errors["address"]}>
                    <textarea
                      id="address"
                      rows={3}
                      className="w-full rounded-md border border-input bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={form.address}
                      onChange={(e) => set("address", e.target.value)}
                    />
                  </Field>
                </div>
                <Field label="State of origin" htmlFor="state" error={errors["state"]}>
                  <select
                    id="state"
                    className={inputClass}
                    value={form.state}
                    onChange={(e) => set("state", e.target.value)}
                  >
                    {NIGERIAN_STATES.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </Field>
                <Field
                  label="Local government area"
                  htmlFor="local_government"
                  error={errors["local_government"]}
                >
                  <input
                    id="local_government"
                    className={inputClass}
                    value={form.local_government}
                    onChange={(e) => set("local_government", e.target.value)}
                  />
                </Field>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="grid gap-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field
                    label="Parent / guardian or next of kin name"
                    htmlFor="next_of_kin_name"
                    error={errors["next_of_kin_name"]}
                    hint="Mandatory for applicants under 18."
                  >
                    <input
                      id="next_of_kin_name"
                      className={inputClass}
                      value={form.next_of_kin_name}
                      onChange={(e) => set("next_of_kin_name", e.target.value)}
                    />
                  </Field>
                  <Field
                    label="Relationship to applicant"
                    htmlFor="next_of_kin_relationship"
                    error={errors["next_of_kin_relationship"]}
                  >
                    <input
                      id="next_of_kin_relationship"
                      className={inputClass}
                      value={form.next_of_kin_relationship}
                      onChange={(e) => set("next_of_kin_relationship", e.target.value)}
                      placeholder="e.g. Father, Mother, Guardian"
                    />
                  </Field>
                  <Field
                    label="Next of kin phone number"
                    htmlFor="next_of_kin_phone"
                    error={errors["next_of_kin_phone"]}
                  >
                    <input
                      id="next_of_kin_phone"
                      type="tel"
                      inputMode="tel"
                      className={inputClass}
                      value={form.next_of_kin_phone}
                      onChange={(e) => set("next_of_kin_phone", e.target.value)}
                      placeholder="08031234567"
                    />
                  </Field>
                </div>
                <div className="border-t border-border" />
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field
                    label="Most recent school / institution"
                    htmlFor="school"
                    error={errors["school"]}
                  >
                    <input
                      id="school"
                      className={inputClass}
                      value={form.school}
                      onChange={(e) => set("school", e.target.value)}
                      placeholder="Name of school or training centre"
                    />
                  </Field>
                  <Field
                    label="Highest qualification obtained"
                    htmlFor="qualification"
                    error={errors["qualification"]}
                  >
                    <input
                      id="qualification"
                      className={inputClass}
                      value={form.qualification}
                      onChange={(e) => set("qualification", e.target.value)}
                      placeholder="e.g. SSCE, NCE, OND"
                    />
                  </Field>
                  <Field
                    label="Year last attended / completed"
                    htmlFor="school_year"
                    error={errors["school_year"]}
                    hint="e.g. 2024 or 2023–2024"
                  >
                    <input
                      id="school_year"
                      className={inputClass}
                      value={form.school_year}
                      onChange={(e) => set("school_year", e.target.value)}
                    />
                  </Field>
                </div>
                <p className="text-xs text-muted-foreground">
                  These details are pre-printed on your application form. Leave blank if not
                  applicable.
                </p>
              </div>
            ) : null}

            {step === 3 ? (
              <fieldset>
                <legend className="text-sm font-medium">Choose one trade unit</legend>
                {errors["unit_id"] ? (
                  <p role="alert" className="mt-1 text-xs font-medium text-destructive">
                    {errors["unit_id"]}
                  </p>
                ) : null}
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {units.map((unit) => (
                    <label
                      key={unit.id}
                      className={cn(
                        "cursor-pointer rounded-md border p-4 transition",
                        form.unit_id === unit.id
                          ? "border-primary bg-accent/40"
                          : "border-border hover:border-foreground/30",
                      )}
                    >
                      <input
                        type="radio"
                        name="unit"
                        className="sr-only"
                        checked={form.unit_id === unit.id}
                        onChange={() => set("unit_id", unit.id)}
                      />
                      <span className="block font-display text-sm font-bold">{unit.name}</span>
                      <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                        {unit.summary}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : null}

            {step === 4 ? (
              <div>
                <h2 className="font-display text-lg">Passport photograph</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Plain background, face clearly visible. JPG, PNG or WebP, maximum 2MB.
                </p>
                <div className="mt-5 flex flex-wrap items-start gap-6">
                  <div className="grid h-40 w-32 place-items-center overflow-hidden rounded-md border border-dashed border-border bg-secondary">
                    {form.photo_data_url ? (
                      <img
                        src={form.photo_data_url}
                        alt="Uploaded passport photograph preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="px-2 text-center text-xs text-muted-foreground">
                        No photo yet
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-3">
                    <input
                      ref={fileRef}
                      id="photo"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      onChange={(e) => onPhoto(e.target.files?.[0])}
                    />
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="inline-flex h-11 items-center gap-2 rounded-md border border-border px-4 text-sm font-semibold"
                    >
                      <Upload className="size-4" aria-hidden="true" /> Choose photograph
                    </button>
                    {form.photo_data_url ? (
                      <button
                        type="button"
                        onClick={() => set("photo_data_url", "")}
                        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline underline-offset-4"
                      >
                        <X className="size-3.5" aria-hidden="true" /> Remove photograph
                      </button>
                    ) : null}
                    {errors["photo_data_url"] ? (
                      <p role="alert" className="text-xs font-medium text-destructive">
                        {errors["photo_data_url"]}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            {step === 5 ? (
              <div>
                <h2 className="font-display text-lg">Review your details</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Confirm everything is correct. Details cannot be edited after submission.
                </p>
                <dl className="mt-5 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                  {[
                    [
                      "Full name",
                      [form.first_name, form.middle_name, form.last_name].filter(Boolean).join(" "),
                    ],
                    ["Gender", form.gender],
                    ["Date of birth", form.date_of_birth],
                    ["Nationality", form.nationality],
                    ["Email", form.email],
                    ["Phone", form.phone],
                    ["Address", form.address],
                    ["State / LGA", `${form.state} / ${form.local_government}`],
                    ["Trade unit", selectedUnit?.name ?? "—"],
                    ["Next of kin", form.next_of_kin_name || "—"],
                    ["Relationship", form.next_of_kin_relationship || "—"],
                    ["Next of kin phone", form.next_of_kin_phone || "—"],
                    ["School / institution", form.school || "—"],
                    ["Qualification", form.qualification || "—"],
                    ["Year completed", form.school_year || "—"],
                  ].map(([k, v]) => (
                    <div key={k as string} className="border-b border-border pb-2">
                      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{k}</dt>
                      <dd className="mt-0.5 font-medium">{v || "—"}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}

            <div className="mt-8 flex items-center justify-between gap-3 border-t border-border pt-6">
              <button
                type="button"
                disabled={step === 0}
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                className="inline-flex h-11 items-center gap-2 rounded-md border border-border px-4 text-sm font-semibold disabled:opacity-40"
              >
                <ArrowLeft className="size-4" aria-hidden="true" /> Back
              </button>
              {step < STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={next}
                  className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground"
                >
                  Continue <ArrowRight className="size-4" aria-hidden="true" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onSubmit}
                  disabled={submitting}
                  className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                >
                  {submitting ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  ) : null}
                  Submit application
                </button>
              )}
            </div>
          </div>
        </div>

        <aside className="surface-card h-fit p-6">
          <h2 className="font-display text-base">Already applied?</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Retrieve your printable application form with your application number and email.
          </p>
          <LookupForm lookup={lookup} />
        </aside>
      </section>
    </SiteShell>
  );
}

function LookupForm({
  lookup,
}: {
  lookup: (opts: {
    data: { application_number: string; email: string };
  }) => Promise<{ found: boolean; access_token?: string }>;
}) {
  const navigate = useNavigate();
  const [number, setNumber] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="mt-4 flex flex-col gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          const res = await lookup({ data: { application_number: number, email } });
          if (res.found && res.access_token) {
            navigate({ to: "/application/$token", params: { token: res.access_token } });
          } else {
            toast.error("No application matches that number and email address.");
          }
        } finally {
          setBusy(false);
        }
      }}
    >
      <Field label="Application number" htmlFor="lookup_number">
        <input
          id="lookup_number"
          className={inputClass}
          placeholder={`${SITE.applicationPrefix}-2026-00001`}
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          required
        />
      </Field>
      <Field label="Email address" htmlFor="lookup_email">
        <input
          id="lookup_email"
          type="email"
          className={inputClass}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </Field>
      <button
        type="submit"
        disabled={busy}
        className="inline-flex h-11 items-center justify-center rounded-md border border-border px-4 text-sm font-semibold disabled:opacity-60"
      >
        {busy ? "Checking…" : "Find my application"}
      </button>
    </form>
  );
}
