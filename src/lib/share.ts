export type ShareTarget = {
  id: string;
  label: string;
  /** Returns the outbound URL, or null when the target cannot take this share. */
  url: (input: ShareInput) => string | null;
  /** Opens in a new tab (link out) rather than being handled in the app. */
  external: boolean;
};

export type ShareInput = {
  /** Page URL to share. */
  url: string;
  /** Headline, used as the message/post text and the email subject. */
  title: string;
  /** Extra context for platforms that accept a separate body (email). */
  text?: string;
};

const enc = encodeURIComponent;

/**
 * Ordered list of share destinations. `navigator.share` (the device share
 * sheet) is offered separately, ahead of these, when the browser supports it.
 */
export const SHARE_TARGETS: ShareTarget[] = [
  {
    id: "whatsapp",
    label: "WhatsApp",
    external: true,
    url: ({ url, title }) => `https://api.whatsapp.com/send?text=${enc(`${title}\n${url}`)}`,
  },
  {
    id: "facebook",
    label: "Facebook",
    external: true,
    url: ({ url }) => `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`,
  },
  {
    id: "x",
    label: "X (Twitter)",
    external: true,
    url: ({ url, title }) => `https://twitter.com/intent/tweet?text=${enc(title)}&url=${enc(url)}`,
  },
  {
    id: "telegram",
    label: "Telegram",
    external: true,
    url: ({ url, title }) => `https://t.me/share/url?url=${enc(url)}&text=${enc(title)}`,
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    external: true,
    url: ({ url }) => `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`,
  },
  {
    id: "email",
    label: "Email",
    external: false,
    url: ({ url, title, text }) =>
      `mailto:?subject=${enc(title)}&body=${enc([text, url].filter(Boolean).join("\n\n"))}`,
  },
];

export function shareTargetUrl(id: string, input: ShareInput): string | null {
  return SHARE_TARGETS.find((t) => t.id === id)?.url(input) ?? null;
}
