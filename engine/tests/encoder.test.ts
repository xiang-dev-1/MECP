import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { encode, validate, getByteLength } from '../src/encoder';

describe('MECP Encoder', () => {
  it('encodes a basic emergency message', () => {
    const r = encode(0, ['M01', 'M07'], '2pax P05 48.6520,20.1305');
    assert.equal(r.message, 'MECP/0/M01 M07 2pax P05 48.6520,20.1305');
    assert.equal(r.overLimit, false);
  });

  it('encodes message without freetext', () => {
    const r = encode(3, ['L01', 'L06']);
    assert.equal(r.message, 'MECP/3/L01 L06');
    assert.equal(r.overLimit, false);
  });

  it('encodes single code', () => {
    const r = encode(0, ['M01']);
    assert.equal(r.message, 'MECP/0/M01');
  });

  it('warns when message exceeds 200 bytes', () => {
    const longText = 'A'.repeat(250);
    const r = encode(0, ['M01'], longText);
    assert.equal(r.overLimit, true);
    assert.ok(r.warnings.some(w => w.includes('exceeds')));
  });

  it('trims trailing whitespace from freetext', () => {
    const r = encode(3, ['L01'], '  hello  ');
    assert.equal(r.message, 'MECP/3/L01 hello');
  });

  it('warns on invalid code format', () => {
    const r = encode(0, ['M01', 'invalid', 'M07']);
    assert.ok(r.warnings.some(w => w.includes('Invalid code')));
    // Still produces the message
    assert.ok(r.message.includes('invalid'));
  });

  it('correctly encodes new category codes (X, H)', () => {
    const r = encode(2, ['H03', 'H07'], '5pax P05 48.65,20.13');
    assert.equal(r.message, 'MECP/2/H03 H07 5pax P05 48.65,20.13');

    const r2 = encode(1, ['X01', 'X02', 'P05'], '48.65,20.13');
    assert.equal(r2.message, 'MECP/1/X01 X02 P05 48.65,20.13');
  });

  it('encodes with all freetext conventions', () => {
    const r = encode(0, ['M01', 'P05'], '48.65,20.13 #A1 @sk @1430 ~OM3ABC');
    assert.equal(r.message, 'MECP/0/M01 P05 48.65,20.13 #A1 @sk @1430 ~OM3ABC');
    assert.equal(r.overLimit, false);
  });

  it('encodes B01 beacon message', () => {
    const r = encode(0, ['B01', 'M01', 'P05'], '48.6520,20.1305 @1430');
    assert.equal(r.message, 'MECP/0/B01 M01 P05 48.6520,20.1305 @1430');
    assert.equal(r.overLimit, false);
  });
});

describe('MECP Validator', () => {
  it('validates correct MECP message', () => {
    const r = validate('MECP/0/M01 M07 2pax');
    assert.equal(r.valid, true);
    assert.equal(r.errors.length, 0);
  });

  it('rejects non-MECP string', () => {
    const r = validate('Hello world');
    assert.equal(r.valid, false);
    assert.ok(r.errors.length > 0);
  });

  it('rejects invalid severity', () => {
    const r = validate('MECP/9/M01');
    assert.equal(r.valid, false);
    assert.ok(r.errors.some(e => e.includes('severity')));
  });

  it('warns on oversized message', () => {
    const long = 'MECP/0/M01 ' + 'A'.repeat(200);
    const r = validate(long);
    assert.ok(r.warnings.some(w => w.includes('200')));
  });
});

describe('getByteLength', () => {
  it('counts ASCII correctly', () => {
    assert.equal(getByteLength('MECP/0/M01'), 10);
  });

  it('counts UTF-8 multi-byte characters', () => {
    // "ä" is 2 bytes in UTF-8
    assert.equal(getByteLength('ä'), 2);
    // "日" is 3 bytes
    assert.equal(getByteLength('日'), 3);
  });

  it('counts empty string as 0', () => {
    assert.equal(getByteLength(''), 0);
  });
});
