import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { decode, isMECP, getCategory, isBeacon, isBeaconAck, isBeaconCancel } from '../src/decoder';

describe('MECP Decoder', () => {
  // === Brief Section 11.1 Test Cases ===

  it('parses full emergency message with GPS and count', () => {
    const r = decode('MECP/0/M01 M07 2pax P05 48.6520,20.1305');
    assert.equal(r.valid, true);
    assert.equal(r.severity, 0);
    assert.deepEqual(r.codes, ['M01', 'M07']);
    assert.equal(r.extracted.count, 2);
    assert.deepEqual(r.extracted.gps, { lat: 48.6520, lon: 20.1305 });
    assert.equal(r.isDrill, false);
  });

  it('parses safety message with freetext place name', () => {
    const r = decode('MECP/2/T04 T01 P02 Poprad');
    assert.equal(r.valid, true);
    assert.equal(r.severity, 2);
    assert.deepEqual(r.codes, ['T04', 'T01', 'P02']);
    assert.equal(r.freetext, 'Poprad');
  });

  it('parses ETA from R03', () => {
    const r = decode('MECP/3/R01 R03 45');
    assert.equal(r.valid, true);
    assert.equal(r.severity, 3);
    assert.deepEqual(r.codes, ['R01', 'R03']);
    assert.equal(r.extracted.eta, 45);
  });

  it('parses strict left-to-right — freetext starts at first non-code token', () => {
    const r = decode('MECP/1/M09 T03 T07 12pax');
    assert.equal(r.valid, true);
    assert.equal(r.severity, 1);
    assert.deepEqual(r.codes, ['M09', 'T03', 'T07']);
    assert.equal(r.extracted.count, 12);
  });

  it('parses social message with time freetext', () => {
    const r = decode('MECP/3/L01 L06 30min');
    assert.equal(r.valid, true);
    assert.equal(r.severity, 3);
    assert.deepEqual(r.codes, ['L01', 'L06']);
    assert.equal(r.freetext, '30min');
  });

  it('parses single code, no freetext', () => {
    const r = decode('MECP/0/M01');
    assert.equal(r.valid, true);
    assert.equal(r.severity, 0);
    assert.deepEqual(r.codes, ['M01']);
    assert.equal(r.freetext, null);
  });

  it('parses drill message — D01 sets isDrill', () => {
    const r = decode('MECP/0/D01 M01 M07 2pax P05 48.6520,20.1305');
    assert.equal(r.valid, true);
    assert.equal(r.severity, 0);
    assert.equal(r.isDrill, true);
    assert.deepEqual(r.codes, ['D01', 'M01', 'M07']);
    assert.equal(r.extracted.count, 2);
    assert.deepEqual(r.extracted.gps, { lat: 48.652, lon: 20.1305 });
  });

  it('parses D04 — isDrill is FALSE (retraction, not drill)', () => {
    const r = decode('MECP/3/D04');
    assert.equal(r.valid, true);
    assert.equal(r.severity, 3);
    assert.deepEqual(r.codes, ['D04']);
    assert.equal(r.isDrill, false); // D04 does NOT set isDrill
  });

  it('parses D02 drill with multiple codes', () => {
    const r = decode('MECP/0/D02 M09 12pax T03');
    assert.equal(r.valid, true);
    assert.equal(r.severity, 0);
    assert.equal(r.isDrill, true); // D02 sets isDrill
    assert.deepEqual(r.codes, ['D02', 'M09']);
    assert.equal(r.extracted.count, 12);
  });

  it('handles invalid severity with warning', () => {
    const r = decode('MECP/5/X99');
    assert.equal(r.severity, null);
    assert.ok(r.warnings.length > 0);
  });

  it('rejects non-MECP message', () => {
    const r = decode('Hello everyone');
    assert.equal(r.valid, false);
    assert.equal(r.codes.length, 0);
  });

  it('handles empty codes after severity', () => {
    const r = decode('MECP/0/');
    assert.equal(r.valid, true);
    assert.equal(r.severity, 0);
    assert.equal(r.codes.length, 0);
    assert.ok(r.warnings.some(w => w.includes('No codes')));
  });

  it('rejects lowercase mecp (case-sensitive)', () => {
    const r = decode('mecp/0/M01');
    assert.equal(r.valid, false);
  });

  it('parses GPS with negative coordinates and freetext', () => {
    const r = decode('MECP/0/M01 M07 P05 -33.8688,151.2093 3pax near harbour');
    assert.equal(r.valid, true);
    assert.deepEqual(r.codes, ['M01', 'M07', 'P05']);
    assert.deepEqual(r.extracted.gps, { lat: -33.8688, lon: 151.2093 });
    assert.equal(r.extracted.count, 3);
    assert.ok(r.freetext!.includes('near harbour'));
  });

  // === New Freetext Convention Tests ===

  it('extracts incident reference tag (#tag)', () => {
    const r = decode('MECP/0/M01 P05 48.65,20.13 #A1');
    assert.equal(r.extracted.reference, 'A1');
  });

  it('extracts sender language hint (@xx)', () => {
    const r = decode('MECP/0/M01 P05 48.65,20.13 @sk');
    assert.equal(r.extracted.language, 'sk');
  });

  it('extracts composition timestamp (@HHMM)', () => {
    const r = decode('MECP/0/M01 P05 48.65,20.13 @1430');
    assert.equal(r.extracted.timestamp, '1430');
  });

  it('extracts sender callsign (~CALL)', () => {
    const r = decode('MECP/0/M01 P05 48.65,20.13 ~OM3ABC');
    assert.equal(r.extracted.callsign, 'OM3ABC');
  });

  it('extracts all freetext conventions at once', () => {
    const r = decode('MECP/0/M01 M07 2pax P05 48.6520,20.1305 #A1 @sk @1430 ~OM3ABC');
    assert.equal(r.extracted.count, 2);
    assert.deepEqual(r.extracted.gps, { lat: 48.652, lon: 20.1305 });
    assert.equal(r.extracted.reference, 'A1');
    assert.equal(r.extracted.language, 'sk');
    assert.equal(r.extracted.timestamp, '1430');
    assert.equal(r.extracted.callsign, 'OM3ABC');
  });

  it('rejects invalid timestamp (2500)', () => {
    const r = decode('MECP/3/L01 @2500');
    assert.equal(r.extracted.timestamp, null);
  });

  // === New Code Category Tests ===

  it('parses X (Threat) category codes', () => {
    const r = decode('MECP/1/X01 X02 P05 48.65,20.13');
    assert.equal(r.valid, true);
    assert.deepEqual(r.codes, ['X01', 'X02', 'P05']);
  });

  it('parses H (Have/Offer) category codes', () => {
    const r = decode('MECP/2/H03 H07 5pax P05 48.65,20.13');
    assert.equal(r.valid, true);
    assert.deepEqual(r.codes, ['H03', 'H07']);
    assert.equal(r.extracted.count, 5);
  });

  it('parses R07 (situation resolved)', () => {
    const r = decode('MECP/3/R07 #A1');
    assert.equal(r.valid, true);
    assert.deepEqual(r.codes, ['R07']);
    assert.equal(r.extracted.reference, 'A1');
  });

  // === Helper Function Tests ===

  it('isMECP correctly identifies MECP messages', () => {
    assert.equal(isMECP('MECP/0/M01'), true);
    assert.equal(isMECP('Hello'), false);
    assert.equal(isMECP('mecp/0/M01'), false);
    assert.equal(isMECP('MECP/'), true);
  });

  it('getCategory returns correct category letter', () => {
    assert.equal(getCategory('M01'), 'M');
    assert.equal(getCategory('T04'), 'T');
    assert.equal(getCategory('X01'), 'X');
    assert.equal(getCategory('H03'), 'H');
  });

  // === Beacon (B) Code Tests ===

  it('parses B01 beacon message with GPS', () => {
    const r = decode('MECP/0/B01 M01 P05 48.6520,20.1305 @1430');
    assert.equal(r.valid, true);
    assert.equal(r.severity, 0);
    assert.deepEqual(r.codes, ['B01', 'M01', 'P05']);
    assert.deepEqual(r.extracted.gps, { lat: 48.652, lon: 20.1305 });
    assert.equal(r.extracted.timestamp, '1430');
    assert.equal(r.isDrill, false);
  });

  it('parses B02 acknowledgement', () => {
    const r = decode('MECP/2/B02 R01');
    assert.equal(r.valid, true);
    assert.equal(r.severity, 2);
    assert.deepEqual(r.codes, ['B02', 'R01']);
    assert.equal(r.isDrill, false);
  });

  it('parses B03 cancel', () => {
    const r = decode('MECP/2/B03');
    assert.equal(r.valid, true);
    assert.equal(r.severity, 2);
    assert.deepEqual(r.codes, ['B03']);
    assert.equal(r.isDrill, false);
  });

  it('D01+B01 drill beacon sets isDrill=true', () => {
    const r = decode('MECP/0/D01 B01 P05 48.6520,20.1305');
    assert.equal(r.valid, true);
    assert.equal(r.severity, 0);
    assert.equal(r.isDrill, true);
    assert.deepEqual(r.codes, ['D01', 'B01', 'P05']);
  });

  it('B01 alone does NOT set isDrill', () => {
    const r = decode('MECP/0/B01 M01');
    assert.equal(r.valid, true);
    assert.equal(r.isDrill, false);
  });

  it('isBeacon helper detects B01', () => {
    assert.equal(isBeacon(['B01', 'M01']), true);
    assert.equal(isBeacon(['M01', 'P05']), false);
    assert.equal(isBeacon(['B02']), false);
  });

  it('isBeaconAck helper detects B02', () => {
    assert.equal(isBeaconAck(['B02', 'R01']), true);
    assert.equal(isBeaconAck(['B01']), false);
  });

  it('isBeaconCancel helper detects B03', () => {
    assert.equal(isBeaconCancel(['B03']), true);
    assert.equal(isBeaconCancel(['B01']), false);
  });
});
