import { useState } from "react";
import { FileSignature, Printer } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PrintLogo } from "@/components/site/print-logo";
import { SITE } from "@/lib/site";

export type AdmissionLetterData = {
  fullName: string;
  applicationNumber: string;
  unitName: string;
  stream: string;
  address: string;
};

function longDate(value: Date | string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Lagos",
  }).format(typeof value === "string" ? new Date(value) : value);
}

function streamLabel(stream: string) {
  return stream === "2" ? "Stream 2 (July–December)" : "Stream 1 (January–June)";
}

/** One aligned label/value row inside the admission-details panel. */
function Fact({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border px-4 py-2.5 text-sm last:border-b-0">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className={`text-right font-medium ${mono ? "font-mono text-xs" : ""}`}>{value}</dd>
    </div>
  );
}

/**
 * The official admission letter. Follows the same document pattern as the
 * application form and scoresheet: board crest, campus identity, "Official
 * document" marker and a signature block. Shown in a preview dialog and kept
 * in the page's `print-only` copy so "Print / Save as PDF" prints the letter.
 */
export function AdmissionLetter({ data }: { data: AdmissionLetterData }) {
  const issued = new Date();
  const session = issued.getFullYear();
  const reportBy = new Date(issued.getTime() + 14 * 24 * 60 * 60 * 1000);

  return (
    <article
      data-sheet="admission"
      className="print-sheet surface-card overflow-hidden bg-paper text-foreground"
    >
      {/* Letterhead */}
      <header className="flex items-start justify-between gap-6 border-b-2 border-ink px-8 py-5 print-avoid-break">
        <div className="flex items-center gap-4">
          <PrintLogo />
          <div>
            <h2 className="font-display text-lg font-bold leading-tight">Admission Letter</h2>
            <p className="text-sm font-medium">{SITE.campusName}</p>
            <p className="text-xs text-muted-foreground">{SITE.name}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-0.5 text-right text-xs text-muted-foreground">
          <span className="font-semibold uppercase tracking-wide">Official document</span>
          <span className="max-w-[15rem]">{SITE.address}</span>
          <span>{SITE.email}</span>
        </div>
      </header>

      {/* Reference and date strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-secondary/30 px-8 py-3 text-xs print-avoid-break">
        <span className="text-muted-foreground">
          Reference:{" "}
          <span className="font-mono font-medium text-foreground">{data.applicationNumber}</span>
        </span>
        <span className="text-muted-foreground">
          Date: <span className="font-medium text-foreground">{longDate(issued)}</span>
        </span>
      </div>

      <div className="px-8 py-7">
        {/* Addressee */}
        <div className="text-sm leading-relaxed print-avoid-break">
          <p className="text-[0.7rem] uppercase tracking-wide text-muted-foreground">To</p>
          <p className="mt-1 font-semibold">{data.fullName}</p>
          <p className="mt-0.5 whitespace-pre-line text-muted-foreground">{data.address}</p>
        </div>

        <p className="mt-7 text-sm font-semibold uppercase tracking-wide text-primary">
          Offer of admission
        </p>

        <div className="mt-3 space-y-3.5 text-justify text-sm leading-relaxed">
          <p>Dear {data.fullName},</p>
          <p>
            I am pleased to inform you that you have been offered provisional admission into the{" "}
            <strong className="font-semibold">{data.unitName}</strong> trade unit of the{" "}
            {SITE.campusName} for the {session} academic session ({streamLabel(data.stream)}).
          </p>
          <p>
            This offer is provisional and subject to the presentation of your original credentials
            and the payment of the prescribed registration fees. You are required to report to the
            Admissions Office on or before{" "}
            <strong className="font-semibold">{longDate(reportBy)}</strong>, failing which the offer
            may lapse.
          </p>
        </div>

        {/* Admission details */}
        <section className="mt-6 border border-border print-avoid-break">
          <h3 className="border-b border-border bg-secondary/30 px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
            Admission details
          </h3>
          <dl className="grid sm:grid-cols-2 sm:divide-x sm:divide-border">
            <div>
              <Fact label="Trade unit" value={data.unitName} />
              <Fact label="Session" value={String(session)} />
            </div>
            <div>
              <Fact label="Stream" value={streamLabel(data.stream)} />
              <Fact label="Application number" value={data.applicationNumber} mono />
            </div>
          </dl>
        </section>

        <div className="mt-6 space-y-3.5 text-justify text-sm leading-relaxed">
          <p>
            Please bring this letter, your application form, and your original academic and personal
            records when you report. Quote your application number{" "}
            <span className="font-mono text-xs font-medium">{data.applicationNumber}</span> in all
            correspondence about your admission.
          </p>
          <p>
            We congratulate you on your admission and look forward to welcoming you to the centre.
          </p>
        </div>

        {/* Signature block */}
        <div className="mt-10 text-sm leading-relaxed print-avoid-break">
          <p>Yours faithfully,</p>
          <div className="mt-12 w-60 border-t border-ink pt-1">
            <p className="font-semibold">Registrar</p>
            <p className="text-xs text-muted-foreground">{SITE.campusName}</p>
          </div>
        </div>
      </div>

      <footer className="border-t border-border px-8 py-4 text-xs text-muted-foreground print-avoid-break">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span>
            {SITE.shortName} · {SITE.branch} · {SITE.phone}
          </span>
          <span>Centre stamp / date</span>
        </div>
      </footer>
    </article>
  );
}

/**
 * Opens the letter in a preview dialog. The dialog is `no-print`, so the copy
 * the page keeps outside this component is what reaches the printer.
 */
export function AdmissionLetterDialog({ data }: { data: AdmissionLetterData }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
      >
        <FileSignature className="size-4" aria-hidden="true" /> Admission letter
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="no-print max-h-[92vh] max-w-[210mm] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              <FileSignature className="size-4 text-primary" aria-hidden="true" /> Admission letter
            </DialogTitle>
            <DialogDescription>
              Preview of the official letter. Print it or save it as a PDF.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-md border border-border-strong bg-paper px-4 py-2 text-sm font-semibold"
            >
              <Printer className="size-4" aria-hidden="true" /> Print / Save as PDF
            </button>
          </div>

          <AdmissionLetter data={data} />
        </DialogContent>
      </Dialog>
    </>
  );
}
