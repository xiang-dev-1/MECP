#!/usr/bin/env python3
"""
MECP — Mesh Emergency Communication Protocol
Minimal Python encoder/decoder.

Usage:
    python mecp.py encode 0 M01 M07 "2pax 48.6520,20.1305"
    python mecp.py decode "MECP/0/M01 M07 2pax 48.6520,20.1305"
"""

import re
import sys

MAX_BYTES = 200

# All valid codes (category letter + two digits)
CODE_RE = re.compile(r'^[A-Z]\d{2}$')

# Freetext extraction patterns
PAT_COUNT = re.compile(r'(\d+)pax')
PAT_GPS = re.compile(r'(-?\d+\.\d+),(-?\d+\.\d+)')
PAT_REF = re.compile(r'#([A-Za-z0-9]{1,4})')
PAT_LANG = re.compile(r'@([a-z]{2})(?:\s|$)')
PAT_TIME = re.compile(r'@(\d{4})(?:\s|$)')
PAT_CALL = re.compile(r'~([A-Za-z0-9]{1,9})(?:\s|$)')


def encode(severity, codes, freetext=None):
    """Encode structured data into an MECP string."""
    msg = f"MECP/{severity}/{' '.join(codes)}"
    if freetext and freetext.strip():
        msg += f" {freetext.strip()}"
    byte_len = len(msg.encode('utf-8'))
    return {
        'message': msg,
        'bytes': byte_len,
        'over_limit': byte_len > MAX_BYTES,
    }


def decode(raw):
    """Decode an MECP string into structured data."""
    result = {
        'valid': False,
        'severity': None,
        'codes': [],
        'is_drill': False,
        'freetext': None,
        'extracted': {
            'count': None, 'gps': None, 'eta': None,
            'reference': None, 'language': None,
            'timestamp': None, 'callsign': None,
        },
        'warnings': [],
        'raw': raw,
    }

    if not raw.startswith('MECP/'):
        return result

    sev_char = raw[5] if len(raw) > 5 else ''
    if sev_char in '0123':
        result['severity'] = int(sev_char)
    else:
        result['warnings'].append(f'Invalid severity: "{sev_char}"')

    if len(raw) < 7 or raw[6] != '/':
        result['warnings'].append('Missing "/" delimiter after severity')

    body = raw[7:]
    if not body.strip():
        result['valid'] = result['severity'] is not None
        return result

    tokens = body.split()
    freetext_start = None
    for i, tok in enumerate(tokens):
        if CODE_RE.match(tok):
            result['codes'].append(tok)
        else:
            freetext_start = i
            break

    if freetext_start is not None:
        result['freetext'] = ' '.join(tokens[freetext_start:])

    # Extract structured patterns from freetext
    text = result['freetext'] or ''

    m = PAT_COUNT.search(text)
    if m:
        result['extracted']['count'] = int(m.group(1))

    m = PAT_GPS.search(text)
    if m:
        lat, lon = float(m.group(1)), float(m.group(2))
        if -90 <= lat <= 90 and -180 <= lon <= 180:
            result['extracted']['gps'] = {'lat': lat, 'lon': lon}

    if 'R03' in result['codes'] and result['freetext']:
        m = re.match(r'^(\d+)(?:\s|$)', result['freetext'])
        if m:
            result['extracted']['eta'] = int(m.group(1))

    m = PAT_REF.search(text)
    if m:
        result['extracted']['reference'] = m.group(1)

    m = PAT_LANG.search(text)
    if m:
        result['extracted']['language'] = m.group(1)

    m = PAT_TIME.search(text)
    if m:
        hh, mm = int(m.group(1)[:2]), int(m.group(1)[2:])
        if 0 <= hh <= 23 and 0 <= mm <= 59:
            result['extracted']['timestamp'] = m.group(1)

    m = PAT_CALL.search(text)
    if m:
        result['extracted']['callsign'] = m.group(1)

    # Drill detection: only D01, D02
    result['is_drill'] = 'D01' in result['codes'] or 'D02' in result['codes']
    result['valid'] = result['severity'] is not None

    return result


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)

    cmd = sys.argv[1]

    if cmd == 'encode':
        severity = int(sys.argv[2])
        codes = []
        freetext = None
        for arg in sys.argv[3:]:
            if CODE_RE.match(arg):
                codes.append(arg)
            else:
                freetext = arg
        r = encode(severity, codes, freetext)
        print(r['message'])
        print(f"({r['bytes']} bytes{'  ** OVER LIMIT **' if r['over_limit'] else ''})")

    elif cmd == 'decode':
        raw = sys.argv[2]
        r = decode(raw)
        print(f"Valid:    {r['valid']}")
        print(f"Severity: {r['severity']}")
        print(f"Codes:    {', '.join(r['codes'])}")
        print(f"Drill:    {r['is_drill']}")
        print(f"Freetext: {r['freetext']}")
        for k, v in r['extracted'].items():
            if v is not None:
                print(f"  {k}: {v}")
        if r['warnings']:
            print(f"Warnings: {', '.join(r['warnings'])}")
    else:
        print(f"Unknown command: {cmd}")
        sys.exit(1)


if __name__ == '__main__':
    main()
