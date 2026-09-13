import type { Locale } from '../config';
import { auditDe } from './de';
import { auditEn, type AuditMessages } from './en';
import { auditEs } from './es';
import { auditRu } from './ru';

const AUDIT_MESSAGES: Record<Locale, AuditMessages> = {
  en: auditEn,
  ru: auditRu,
  es: auditEs,
  de: auditDe,
};

export function getAuditMessages(locale: Locale): AuditMessages {
  return AUDIT_MESSAGES[locale];
}

export type { AuditMessages };
