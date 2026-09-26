// Store contacts supplied by the owner. Phone numbers are in international
// format without "+" or spaces, as WhatsApp links require.
export const WHATSAPP_CONTACTS = [
  { name: 'Munir Al Balushi', phone: '96879970799' },
  { name: 'Bassam Al Balushi', phone: '96871146552' },
  // Added 2026-09-26 without a person's name: shown as the store's line.
  { name: 'BLACKSHARK', phone: '96894909974' },
] as const;

// api.whatsapp.com instead of the wa.me short link: some DNS services and
// networks fail to resolve wa.me (seen with Quad9), while this address works
// everywhere and opens the same chat with the same pre-filled message.
export function whatsappLink(phone: string, message?: string) {
  const query = new URLSearchParams({ phone });
  if (message) query.set('text', message);
  return `https://api.whatsapp.com/send?${query.toString().replaceAll('+', '%20')}`;
}

/** The short form shown to shoppers, e.g. "wa.me/+96879970799". */
export function whatsappLabel(phone: string) {
  return `wa.me/+${phone}`;
}
