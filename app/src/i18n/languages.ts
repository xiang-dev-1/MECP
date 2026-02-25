/**
 * Static imports of all 20 MECP language files.
 * Bundled at build time — no async loading needed.
 */
import type { LanguageFile } from '@mecp/engine';

import cs from '../../../languages/cs.json';
import de from '../../../languages/de.json';
import en from '../../../languages/en.json';
import es from '../../../languages/es.json';
import fa from '../../../languages/fa.json';
import fr from '../../../languages/fr.json';
import it from '../../../languages/it.json';
import ja from '../../../languages/ja.json';
import nl from '../../../languages/nl.json';
import no from '../../../languages/no.json';
import pl from '../../../languages/pl.json';
import pt from '../../../languages/pt.json';
import ru from '../../../languages/ru.json';
import sk from '../../../languages/sk.json';
import sr from '../../../languages/sr.json';
import sv from '../../../languages/sv.json';
import tr from '../../../languages/tr.json';
import uk from '../../../languages/uk.json';
import zhCn from '../../../languages/zh-cn.json';
import zhTw from '../../../languages/zh-tw.json';

const LANGUAGES: Record<string, LanguageFile> = {
  cs: cs as unknown as LanguageFile,
  de: de as unknown as LanguageFile,
  en: en as unknown as LanguageFile,
  es: es as unknown as LanguageFile,
  fa: fa as unknown as LanguageFile,
  fr: fr as unknown as LanguageFile,
  it: it as unknown as LanguageFile,
  ja: ja as unknown as LanguageFile,
  nl: nl as unknown as LanguageFile,
  no: no as unknown as LanguageFile,
  pl: pl as unknown as LanguageFile,
  pt: pt as unknown as LanguageFile,
  ru: ru as unknown as LanguageFile,
  sk: sk as unknown as LanguageFile,
  sr: sr as unknown as LanguageFile,
  sv: sv as unknown as LanguageFile,
  tr: tr as unknown as LanguageFile,
  uk: uk as unknown as LanguageFile,
  'zh-cn': zhCn as unknown as LanguageFile,
  'zh-tw': zhTw as unknown as LanguageFile,
};

/** Get a language file by ISO 639-1 code. Falls back to English. */
export function getLanguage(code: string): LanguageFile {
  return LANGUAGES[code] ?? LANGUAGES['en'];
}

/** Get all available language files sorted by name */
export function getAllLanguages(): LanguageFile[] {
  return Object.values(LANGUAGES).sort((a, b) =>
    a.language_name.localeCompare(b.language_name)
  );
}

/** Get all language codes */
export function getLanguageCodes(): string[] {
  return Object.keys(LANGUAGES);
}

export default LANGUAGES;
