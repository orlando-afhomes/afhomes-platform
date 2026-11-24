import { createElement, type ReactElement } from "react";
import {
  Archive, ArrowLeft, ArrowLeftRight, ArrowRight, Ban, CalendarX, Check, CheckCheck, ChevronRight, ChevronsDownUp, ChevronsUpDown, CircleCheck, CircleSlash, Clock, Copy, CreditCard, Download, Eraser, Eye, FileSignature, FileText, HandCoins, ListChecks,
  Link2, LogIn, LogOut, PackageCheck, Pencil, Plus, Power, Printer, QrCode, ReceiptText, RefreshCw, RotateCcw, RotateCw, Save, Search, Send, ShieldCheck, SlidersHorizontal, Trash2, Undo2, Upload, UserPlus, Wrench, X,
  type LucideIcon,
} from "lucide-react";

/**
 * Every text button shows an icon that matches its meaning. A button that does not pass its own
 * icon gets one from its label here (first matching rule wins); a label with no rule gets a
 * neutral fallback, so no action button is ever left without an icon. Add a rule when a new kind
 * of action appears; `button-icons.test.tsx` lists the labels the app uses.
 */
const RULES: ReadonlyArray<readonly [RegExp, LucideIcon]> = [
  [/^(cancel|close|dismiss|not now|no thanks)\b/, X],
  [/\b(request fix|fix|correct)\b/, Wrench],
  [/\benter receipt\b/, ReceiptText],
  [/\bshow qr\b/, QrCode],
  [/\bopen contract\b/, FileText],
  [/\bremove date\b/, CalendarX],
  [/\bresolve hold\b/, Clock],
  [/\brecord payout\b/, HandCoins],
  [/\bpayback received\b/, HandCoins],
  [/\bnot collected\b/, CircleSlash],
  [/\brefund\b/, Undo2],
  [/\bmanage card\b/, CreditCard],
  [/\b(card )?picked up\b/, PackageCheck],
  [/\bsave as draft\b/, Save],
  [/\b(save|update|apply)\b/, Save],
  [/\bsend back\b/, RotateCcw],
  [/\b(back|previous)\b/, ArrowLeft],
  [/^(continue|next|proceed|skip)\b/, ArrowRight],
  [/\b(resend|submit|send)\b/, Send],
  [/\bdeactivate\b/, Ban],
  [/\bactivate\b/, Power],
  [/\barchive\b/, Archive],
  [/\bmatch\b/, Link2],
  [/\bvoid\b/, Ban],
  [/\bsign in\b|\blog in\b/, LogIn],
  [/\bsign out\b|\blog out\b/, LogOut],
  [/\bverify\b|\broles?\b/, ShieldCheck],
  [/\b(complete)\b/, CircleCheck],
  [/\ball paid out\b/, CheckCheck],
  [/\b(confirm|approve|accept|mark|resolve|finali[sz]e)\b/, Check],
  [/\b(reject|deny)\b/, X],
  [/\b(decline|stop|block|deactivate|suspend)\b/, Ban],
  [/\b(delete|remove|discard)\b/, Trash2],
  [/\bclear\b/, Eraser],
  [/\bcollapse\b/, ChevronsDownUp],
  [/\bexpand\b/, ChevronsUpDown],
  [/\bprepare\b/, FileText],
  [/\brequest\b/, Send],
  [/\b(download|export)\b/, Download],
  [/\b(upload|import|attach)\b/, Upload],
  [/\bprint\b/, Printer],
  [/\bcopy\b/, Copy],
  [/\baddendum\b/, FileSignature],
  [/\b(search|look ?up|find|lookup)\b/, Search],
  [/\b(try again|retry|refresh|reload)\b/, RotateCw],
  [/\b(replace|renew|regenerate|reissue)\b/, RefreshCw],
  [/\b(reset|undo|revert|restore|reactivate|return)\b/, RotateCcw],
  [/\btransfer\b/, ArrowLeftRight],
  [/\b(assign|invite)\b/, UserPlus],
  [/\b(set|configure|adjust)\b/, SlidersHorizontal],
  [/\b(select|choose|pick)\b/, ListChecks],
  [/\b(edit|change|correct|rename|fix|modify|enter)\b/, Pencil],
  [/\b(add|new|create|record|register|start)\b/, Plus],
  [/\b(review|view|open|details|show|see|preview|check)\b/, Eye],
  [/\b(contract|document|report|statement|summary)\b/, FileText],
];

/** Icon for a plain-text button label; empty labels get none, unknown labels get a neutral chevron. */
export function iconForLabel(label: string): LucideIcon | undefined {
  const text = label.trim().toLowerCase();
  if (!text) return undefined;
  return RULES.find(([pattern]) => pattern.test(text))?.[1] ?? ChevronRight;
}

/** The icon element for a plain-text button label, or null when no rule fits. */
export function labelIcon(label: string): ReactElement | null {
  const Icon = iconForLabel(label);
  return Icon ? createElement(Icon, { "aria-hidden": true }) : null;
}
