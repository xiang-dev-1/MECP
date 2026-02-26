import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { decode } from '../src/decoder';
import { encode, getByteLength } from '../src/encoder';

describe('Edge Cases', () => {
  it('roundtrip: encode then decode produces consistent result', () => {
    const encoded = encode(0, ['M01', 'M07', 'P05'], '2pax 48.6520,20.1305');
    const decoded = decode(encoded.message);
    assert.equal(decoded.valid, true);
    assert.equal(decoded.severity, 0);
    assert.deepEqual(decoded.codes, ['M01', 'M07', 'P05']);
    assert.equal(decoded.extracted.count, 2);
    assert.notEqual(decoded.extracted.gps, null);
  });

  it('message at exactly 200 bytes', () => {
    // Build a message that is exactly 200 bytes
    const prefix = 'MECP/0/M01 '; // 11 bytes
    const padding = 'A'.repeat(200 - 11);
    const msg = prefix + padding;
    assert.equal(getByteLength(msg), 200);
    const r = decode(msg);
    assert.equal(r.valid, true);
  });

  it('message at 201 bytes triggers overLimit', () => {
    // "MECP/0/M01 " = 11 bytes, need 190 more to exceed 200
    const freetext = 'A'.repeat(190);
    const r = encode(0, ['M01'], freetext);
    assert.equal(r.overLimit, true);
  });

  it('handles Unicode freetext (accented chars)', () => {
    const r = decode('MECP/2/T01 P02 Oravská Polhora');
    assert.equal(r.valid, true);
    assert.ok(r.freetext!.includes('Oravská'));
  });

  it('handles GPS in southern/western hemisphere', () => {
    const r = decode('MECP/0/M01 P05 -33.8688,-151.2093');
    assert.equal(r.valid, true);
    assert.deepEqual(r.extracted.gps, { lat: -33.8688, lon: -151.2093 });
  });

  it('handles multiple spaces between tokens', () => {
    const r = decode('MECP/0/M01  M07  2pax');
    assert.equal(r.valid, true);
    assert.deepEqual(r.codes, ['M01', 'M07']);
    assert.equal(r.extracted.count, 2);
  });

  it('handles missing delimiter gracefully', () => {
    const r = decode('MECP/0M01');
    assert.ok(r.warnings.length > 0);
  });

  it('D03 does NOT set isDrill', () => {
    const r = decode('MECP/3/D03');
    assert.equal(r.isDrill, false);
    assert.deepEqual(r.codes, ['D03']);
  });

  it('preserves raw input string', () => {
    const input = 'MECP/0/M01 M07 2pax P05 48.6520,20.1305';
    const r = decode(input);
    assert.equal(r.raw, input);
  });

  it('handles empty string', () => {
    const r = decode('');
    assert.equal(r.valid, false);
  });

  it('handles MECP prefix only', () => {
    const r = decode('MECP/');
    assert.equal(r.valid, false);
  });

  it('handles code-like tokens in freetext (strict left-to-right)', () => {
    // After "12pax" triggers freetext, T03 T07 are freetext even though they look like codes
    const r = decode('MECP/1/M09 12pax T03 T07');
    assert.deepEqual(r.codes, ['M09']);
    assert.equal(r.extracted.count, 12);
    assert.ok(r.freetext!.includes('T03'));
    assert.ok(r.freetext!.includes('T07'));
  });

  it('reference tag with alphanumeric characters', () => {
    const r = decode('MECP/0/M01 P05 48.65,20.13 #Ab12');
    assert.equal(r.extracted.reference, 'Ab12');
  });

  it('callsign with numbers', () => {
    const r = decode('MECP/0/M01 ~2E0ABC');
    assert.equal(r.extracted.callsign, '2E0ABC');
  });

  it('distinguishes @xx (language) from @HHMM (timestamp)', () => {
    // @sk should be language, @1430 should be timestamp
    const r = decode('MECP/0/M01 @sk @1430');
    assert.equal(r.extracted.language, 'sk');
    assert.equal(r.extracted.timestamp, '1430');
  });

  it('all 12 categories parse correctly', () => {
    const categories = ['M01', 'T01', 'W01', 'S01', 'P01', 'C01', 'R01', 'D01', 'L01', 'X01', 'H01', 'B01'];
    for (const code of categories) {
      const r = decode(`MECP/3/${code}`);
      assert.equal(r.valid, true, `Failed for code ${code}`);
      assert.deepEqual(r.codes, [code], `Wrong codes for ${code}`);
    }
  });
});
