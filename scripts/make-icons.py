#!/usr/bin/env python3
"""Render extension icons (dark rounded square + white bookmark ribbon) without dependencies."""
import struct, sys, zlib
from pathlib import Path

BG = (24, 24, 27)
FG = (255, 255, 255)
SS = 4  # supersampling per axis

# size -> (padding, corner radius) in pixels; 128 keeps the store's 16px transparent margin
LAYOUT = {16: (0, 3.5), 32: (1, 7), 48: (2, 10), 128: (16, 21)}
# Bookmark polygon in artwork-relative units (0..1)
RIBBON = [(0.33, 0.24), (0.67, 0.24), (0.67, 0.78), (0.5, 0.64), (0.33, 0.78)]


def in_rounded_rect(x, y, x0, y0, x1, y1, r):
    cx = min(max(x, x0 + r), x1 - r)
    cy = min(max(y, y0 + r), y1 - r)
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r and x0 <= x <= x1 and y0 <= y <= y1


def in_polygon(x, y, pts):
    inside = False
    for (ax, ay), (bx, by) in zip(pts, pts[1:] + pts[:1]):
        if (ay > y) != (by > y) and x < (bx - ax) * (y - ay) / (by - ay) + ax:
            inside = not inside
    return inside


def render(size):
    pad, radius = LAYOUT[size]
    art = size - 2 * pad
    ribbon = [(pad + px * art, pad + py * art) for px, py in RIBBON]
    rows = []
    for j in range(size):
        row = bytearray([0])
        for i in range(size):
            bg = fg = 0
            for sj in range(SS):
                for si in range(SS):
                    x, y = i + (si + 0.5) / SS, j + (sj + 0.5) / SS
                    if in_rounded_rect(x, y, pad, pad, size - pad, size - pad, radius):
                        bg += 1
                        fg += in_polygon(x, y, ribbon)
            n = SS * SS
            alpha = bg / n
            mix = fg / bg if bg else 0
            rgb = [round(b + (f - b) * mix) for b, f in zip(BG, FG)]
            row += bytes(rgb + [round(alpha * 255)])
        rows.append(bytes(row))
    raw = zlib.compress(b''.join(rows), 9)

    def chunk(kind, data):
        return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data))

    return (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0))
            + chunk(b'IDAT', raw) + chunk(b'IEND', b''))


if __name__ == '__main__':
    out = Path(sys.argv[1] if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent / 'src' / 'icons')
    for size in LAYOUT:
        (out / f'icon{size}.png').write_bytes(render(size))
        print(f'wrote {out / f"icon{size}.png"}')
