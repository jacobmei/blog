---
title: "Rescuing EXIF GPS from iOS 18 adaptive-HDR HEIC, in a browser-only app"
description: |-
  A bug report from my wife: "the photos won't land on the map." The culprit turned out to be a twelve-byte difference in how iOS 18 writes the HEIC `ftyp` box. Here's how I patched around it without shipping a heavier parser to every user.
pubDate: 2026-04-21 22:00+08:00
author: jacobmei
category: Engineering
tags:
  - TrailPaint
  - HEIC
  - EXIF
  - iOS
  - browser
draft: false
featured: true
cover: ./assets/20260421-01.jpg
---
# Rescuing EXIF GPS from iOS 18 adaptive-HDR HEIC, in a browser-only app

My wife teaches outdoor-nature classes in Taipei and drops photos into [TrailPaint](https://trailpaint.org/app/), a small browser-only tool I built so she could make trail maps for her class handouts without wrestling with Canva. Drag GPX in, drop photos on the map, export a PNG. The whole thing runs in the tab.

One of the features she relies on is auto-placement: drop twenty photos and each one lands on its own spot because the browser reads the EXIF GPS tag and drops a card there. It's the part of the product that feels most like magic when it works.

Then she upgraded to an iPhone 15 Pro on iOS 18, and every photo she dropped piled up at the map center.

![White-stone lake trail — five spots auto-placed from EXIF GPS](./assets/20260421-01.jpg)

## The diagnosis

First suspicion: exifr. We use [exifr](https://github.com/MikeKovarik/exifr) as the primary EXIF reader — small, fast, tree-shakes to ~18 KB. It was returning an object with everything _except_ latitude and longitude. No throw, no warning, just `undefined`.

I diffed two HEIC files — one from her old iPhone 14 (iOS 17), one from the new 15 Pro (iOS 18), both taken seconds apart at the same spot. The raw hex tells the story.

HEIC is ISOBMFF, the same container format as MP4. The very first box is `ftyp`, which declares the major brand plus a list of compatible brands. Here's what I saw:

```
iPhone 14 / iOS 17:  ftyp size=28  brands: heic mif1 miaf MiHB
iPhone 15 Pro / 18:  ftyp size=52  brands: heic mif1 miaf MiHB
                                          tmap heic hevc unif
```

The iOS 18 version added a second layer of compatibility brands, most notably `tmap` — Apple's marker for tone-mapped adaptive HDR. It signals that the file contains both the HDR image and an SDR gain map, so older software can fall back gracefully.

Older software like exifr, which has a hard-coded `ftyp` box size sanity check of `≤ 50` bytes. iOS 17 files come in at 28 bytes; the textbook says a sane HEIC `ftyp` fits under 50. iOS 18 writes 52. That's the entire bug: a twelve-byte overshoot past a magic number, and exifr throws `"Unknown file format"` before it ever reaches the EXIF payload.

The payload itself is completely intact. exifr just never gets there.

## The fix that doesn't bloat the bundle

Three options went through my head. An upstream patch to exifr is the right long-term move, but my wife was sitting on broken photos that weekend. Swapping the whole parser to [ExifReader](https://github.com/mattiasw/ExifReader) — which does handle these files — would fix it, except ExifReader is roughly five times bigger, and I'd be shipping that weight to every user regardless of whether they're on iOS 18. The third option, and the one I went with, is a fallback chain: keep exifr as primary, dynamically import ExifReader only when exifr gives up on a HEIC. (I'll still file the upstream patch; filing it is on my list for after this publishes, since the fix — raising or removing the `≤ 50` byte check — is one line and would help everyone on exifr.)

```ts
const { gps, meta } = await tryExifr(file);
if (gps !== null || meta !== null) return { gps, meta };

// exifr gave up on the file entirely. Try the heavier parser.
const [{ default: ExifReader }, buf] = await Promise.all([
  import('exifreader'),
  file.arrayBuffer(),
]);
if (!isBmffSafeToParse(buf)) throw new Error('HEIC iloc structure rejected');
return parseWithExifReader(buf, ExifReader);
```

Two things I like about this. First, the main bundle doesn't move — ExifReader lives in its own ~34 KB gzip chunk that only downloads when needed. A user on iOS 17 (or Android, or a desktop dragging JPEGs) pays zero cost for a problem they don't have. Second, the fallback is bounded: it only fires when exifr produced _nothing_ — no GPS, no metadata — which is the specific failure mode we're trying to rescue. A normal photo that just happens to lack GPS still short-circuits after a single pass.

![London museum trip — spots auto-placed from HEIC EXIF across multiple venues](./assets/20260421-02.jpg)

## Four hardening doors

Adding a second parser meant adding a second attack surface. TrailPaint's threat model is genuinely small — users drop their own photos into their own browser, the bytes never leave — but "small" isn't "zero", and ExifReader's BMFF code has known rough edges. Four guards, cheapest first:

**1. Null Island rejection.** Coordinates `(0, 0)` sit in the Gulf of Guinea. Almost no one took a photo there. Broken EXIF parsers, on the other hand, return `(0, 0)` all the time. We reject it. The cost is that the three people actually photographing buoys near 0°N 0°E have to drag their spots manually; the benefit is that a parser regression can't quietly scatter your photos into the Atlantic.

**2. `DateTimeOriginal` regex anchor.** The obvious regex `/^\d{4}:\d{2}:\d{2}/` looks fine until you realize an earlier draft of mine was `/\d{4}:\d{2}:\d{2}/` — no anchor, no `$`. That one happily matches the middle of arbitrary strings. Not a security bug, but it was silently accepting garbage dates. Anchor both ends.

**3. `MAX_PHOTO_BYTES` guard.** The wrapper rejects files larger than 10 MB before any bytes reach the parser. Camera JPEGs run 2–5 MB, iOS 18 adaptive-HDR HEIC with a gain map sometimes pushes 8 MB, Live Photos can nudge higher. 10 MB is generous for a single-frame photo without inviting someone to feed us 50 MB and watch the tab OOM. If a legitimate photo trips it — rare but possible with multi-frame composites — the user's options today are downscale in their Photos app or file an issue and I'll raise the cap; I'd rather start strict and loosen later than the reverse.

**4. `isBmffSafeToParse` pre-scan.** This is the interesting one. ExifReader walks the ISOBMFF `iloc` box to enumerate metadata extents, and it trusts the fields in that box. Two known attack signatures live there. The first is an `iloc` where both `offset_size` and `length_size` are zero; that packs the extent iteration into a `65535 × 65535` nested loop whose inner step advances by zero bytes, which pegs the main thread indefinitely. The second is an `item_count` inflated to millions or billions — ExifReader dutifully iterates. Real iPhone HEICs carry around 2–15 items (primary image, thumbnail, depth, HDR gain map, EXIF, XMP); anything past that is almost certainly malicious.

The pre-scan walks the top-level boxes, descends into `meta` (which is a FullBox, so its sub-boxes start 4 bytes after the header), finds `iloc`, and rejects the two signatures:

```ts
// Walk top-level boxes, find `meta`
let pos = 0;
while (pos + 8 <= max) {
  const size = v.getUint32(pos);
  if (size < 8) return true; // 64-bit / open-ended — bail, let parser try
  if (boxType(v, pos) === 'meta') {
    // meta is a FullBox: skip 4 bytes of version+flags
    let q = pos + 8 + 4;
    while (q + 8 <= pos + size) {
      if (boxType(v, q) === 'iloc') {
        const ilocVersion = v.getUint8(q + 8);
        const sizeByte = v.getUint8(q + 12);
        const offsetSize = (sizeByte >> 4) & 0x0f;
        const lengthSize = sizeByte & 0x0f;
        // Attack 1: non-terminating extent loop
        if (offsetSize === 0 && lengthSize === 0) return false;
        // Attack 2: absurd item_count
        const itemCount = ilocVersion < 2
          ? v.getUint16(q + 14)
          : v.getUint32(q + 14);
        if (itemCount > ILOC_ITEM_CAP /* 1000 */) return false;
        return true;
      }
      q += v.getUint32(q);
    }
    return true;
  }
  pos += size;
}
return true;
```

A few details worth noting. The scan only looks at the first 256 KB of the buffer — metadata boxes sit at the start of an ISOBMFF file, and capping the scan window prevents the pre-scan itself from being a DoS vector on large inputs. If the file doesn't start with `ftyp`, the scan returns true and lets the parser decide (we only care about genuine HEIC). The `ILOC_ITEM_CAP = 1000` is two orders of magnitude above real files and still cheap to enforce. The scan is roughly 40 lines in the actual source (`exifParser.ts`).

## Why not a Web Worker

The textbook answer to "untrusted parser on user-supplied binary" is "run it in a Worker." I considered it and walked away. The attack surface here is genuinely tiny — users drop their own photos into their own browser, nothing goes to a server, there's no shared link that carries a photo. Against that, a Worker adds a second chunk, buffer transfer via `postMessage`, serialization overhead, and async orchestration around what's currently one `await`. The `iloc` pre-scan is forty synchronous lines that block exactly the class of file I was worried about, at the boundary, before the parser runs. Ceremony without a matching risk is its own cost. If the threat model changes — say I add a server-side path that accepts shared photos — the Worker comes back on the table.

## Closing notes

The thing I'd take away from this isn't the patch itself but the shape of the problem. BMFF is a moving target: Apple added `tmap` quietly with iOS 18, and they'll add something else. Any parser that reads container metadata is going to need a fallback story rather than a hope, and shipping that fallback via dynamic import is a nice way to keep the happy path cheap for the 80%+ of users who never trigger it.

The other useful shift was matching guards to reality instead of textbook. Hardening a browser tool where the user is both attacker and victim is a different problem than hardening a public upload endpoint. The correct guards here turned out to be smaller than the security-textbook answer would suggest — a cap on file size, two specific `iloc` attack signatures, and a couple of value-range checks. No Worker, no WASM sandbox, no quarantine queue. Just the bits that actually matched the risk.

Source is on GitHub under GPL-3.0: [github.com/notoriouslab/trailpaint](https://github.com/notoriouslab/trailpaint). The EXIF pipeline and the four guards live in `online/src/core/utils/exifParser.ts`; the size caps are in `exifToGeojson.ts`. The upstream patch to exifr is next on my list after this goes live. Happy to hear what I got wrong — BMFF always has another booby trap.
