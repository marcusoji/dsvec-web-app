import { useState } from "react";
import {
  Check,
  Facebook,
  Linkedin,
  Link2,
  Mail,
  MessageCircle,
  Send,
  Share2,
  Twitter,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SHARE_TARGETS, shareTargetUrl, type ShareInput } from "@/lib/share";
import { cn } from "@/lib/utils";

const ICONS: Record<string, typeof Share2> = {
  whatsapp: MessageCircle,
  facebook: Facebook,
  x: Twitter,
  telegram: Send,
  linkedin: Linkedin,
  email: Mail,
};

/** Opens a share destination. Email uses the OS handler; the rest open a tab. */
function openShareTarget(id: string, input: ShareInput) {
  const href = shareTargetUrl(id, input);
  if (!href) return;
  if (id === "email") {
    window.location.href = href;
    return;
  }
  window.open(href, "_blank", "noopener,noreferrer");
}

export function ShareMenu({
  input,
  label = "Share",
  align = "end",
  className,
  triggerClassName,
}: {
  input: ShareInput;
  label?: string;
  align?: "start" | "center" | "end";
  /** Applied to the dropdown content — raise the z-index above a modal host. */
  className?: string;
  triggerClassName?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(input.url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked (insecure context, permissions); fall back to
      // the native share sheet below if the browser offers one.
      if (navigator.share) await navigator.share(input).catch(() => undefined);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border border-border-strong bg-paper px-3 py-1.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent",
          triggerClassName,
        )}
      >
        <Share2 className="size-4" aria-hidden="true" />
        {label}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className={cn("w-48", className)}>
        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
          Share this update
        </DropdownMenuLabel>
        {SHARE_TARGETS.map((target) => {
          const Icon = ICONS[target.id] ?? Share2;
          return (
            <DropdownMenuItem
              key={target.id}
              onSelect={() => openShareTarget(target.id, input)}
              className="gap-2"
            >
              <Icon className="size-4 text-primary" aria-hidden="true" />
              {target.label}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void copyLink()} className="gap-2">
          {copied ? (
            <Check className="size-4 text-primary" aria-hidden="true" />
          ) : (
            <Link2 className="size-4 text-primary" aria-hidden="true" />
          )}
          {copied ? "Link copied" : "Copy link"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
