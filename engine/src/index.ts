/**
 * MECP Engine — Mesh Emergency Communication Protocol
 *
 * Pure TypeScript encoder/decoder for MECP messages.
 * No I/O, no platform dependencies, no side effects.
 */

export { decode, isMECP, getCategory, isBeacon, isBeaconAck, isBeaconCancel } from './decoder';
export { encode, validate, getByteLength } from './encoder';
export type {
  ParsedMessage,
  EncodeResult,
  ValidationResult,
  LanguageFile,
  Severity,
  CategoryLetter,
  SeverityDef,
  CategoryDef,
} from './types';
export {
  MAX_MESSAGE_BYTES,
  MECP_PREFIX,
  CODE_REGEX,
  VALID_SEVERITIES,
  CATEGORIES,
} from './types';
