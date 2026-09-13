import type { Locale } from '../config';
import { de } from './de';
import { en, type Dictionary } from './en';
import { es } from './es';
import { ru } from './ru';

const DICTIONARIES: Record<Locale, Dictionary> = { en, ru, es, de };

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}

export type { Dictionary };
