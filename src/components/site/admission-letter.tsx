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
import { printedOn } from "@/lib/print-sheets";
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

/**
 * The official admission letter. Follows the same document pattern as the
 * application form and scoresheet: board crest, campus identity, "Official
 * document" marker and a signature block. Shown in a preview dialog and kept
 * in the page's `print-only` copy so "Print / Save as PDF" prints the letter.
 */
export function AdmissionLetter({ data }: { data: AdmissionLetterData }) {
  const issued = new Date();
  const session = issued.getFullYear();

  return (
    <article
      data-sheet="admission"
      className="print-sheet surface-card overflow-hidden bg-paper text-foreground"
    >
      <header className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
        <div className="flex items-center gap-4">
          <PrintLogo />
          <div>
            <h2 className="font-display text-lg font-bold leading-tight">Admission Letter</h2>
            <p className="text-sm font-medium">{SITE.campusName}</p>
            <p className="text-xs text-muted-foreground">{SITE.name}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 text-right text-xs text-muted-foreground">
          <span className="font-semibold uppercase tracking-wide">Official document</span>
          <span>{SITE.address}</span>
          <span>Printed {printedOn()}</span>
        </div>
      </header>

      <div className="px-8 py-7">
        <div className="flex flex-wrap items-start justify-between gap-4 text-sm">
          <div>
            <p className="text-[0.7rem] uppercase tracking-wide text-muted-foreground">Reference</p>
            <p className="mt-0.5 font-mono text-xs font-medium">{data.applicationNumber}</p>
          </div>
          <p className="text-sm font-medium">{longDate(issued)}</p>
        </div>

        <div className="mt-8 text-sm leading-relaxed">
          <p className="font-medium">{data.fullName}</p>
          <p className="mt-0.5 whitespace-pre-line text-muted-foreground">{data.address}</p>
        </div>

        <p className="mt-8 text-sm font-semibold uppercase tracking-wide text-primary">
          Offer of admission
        </p>

        <div className="mt-3 space-y-4 text-sm leading-relaxed">
          <p>Dear {data.fullName},</p>
          <p>
            I am pleased to inform you that you have been offered provisional admission into the{" "}
            <strong className="font-semibold">{data.unitName}</strong> trade unit of the{" "}
            {SITE.campusName} for the {session} academic session ({streamLabel(data.stream)}).
          </p>
          <p>
            This offer is provisional and subject to the presentation of your original credentials
            and the payment of the prescribed registration fees. You are required to report to the
            Admissions Office within two (2) weeks of the date of this letter, failing which the
            offer may lapse.
          </p>
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

        <div className="mt-10 text-sm leading-relaxed">
          <p>Yours faithfully,</p>
          <p className="mt-10 w-56 border-t border-border pt-1 font-medium">Registrar</p>
          <p className="text-xs text-muted-foreground">{SITE.campusName}</p>
        </div>
      </div>

      <footer className="border-t border-border px-8 py-4 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span>
            {SITE.shortName} · {SITE.branch}
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
