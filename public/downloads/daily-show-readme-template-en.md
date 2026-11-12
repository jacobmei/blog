# <Show name>: the daily production process

> This README is written for an AI (Claude Code, for example) to read as its working instructions. Each time you start,
> tell it "Follow the README and do <date or month>". It reads this file, does the work, and writes back what it learned.
> To adapt it to your own show, replace everything in angle brackets `< >`.

## Show spec

- Aspect ratio: <9:16 vertical / 16:9 horizontal>, about <60> seconds
- Structure: <opening (cover card) → body (verse, text, reflection) → ending (credit card)>
- Voice: <whose voice narrates, and which tool generates it>
- Background footage: <what changes every day, e.g. sky, water; which AI video tool generates it>
- Music: <which folder it lives in, how it rotates day to day, whether it needs a credit>
- Fonts and colours: <font names, main colour>
- Permissions: <whose voice it is and whether they agreed; the music licence and how to credit it; whether uploads must be labelled as AI-generated>

## Tools

Fill in what you actually use, so the AI knows what to open for each step. The examples are my choices; yours can differ.

| Job | Tool |
|---|---|
| Narration | <local voice cloning, e.g. Qwen3-TTS> |
| Checking the narration was read correctly | <speech recognition, e.g. Whisper> |
| Background footage | <an AI video tool, e.g. VideoExpress> |
| Assembly | <an editor the AI can drive, e.g. Concat> |
| Publishing | <platform and method, e.g. the YouTube API> |

## Rules for the AI

1. When the source text looks like it has a typo, **list it and ask me**. Do not change the source yourself.
2. Every step must leave a file behind (see "The daily folder" below), so an interrupted run can resume from the missing step.
3. When you cannot decide something, stop and ask. Do not guess.
4. After each batch, write the new problems and their solutions into "Done so far" at the bottom.
5. When the process needs to change, write it into "Before the next run" first; it is the first thing to handle next time.
6. If a website's login has expired, stop and ask me to log in myself. Do not type my password for me.
7. Material that must be credited in the description (CC BY music, for example) is added automatically when `post.txt` is generated.

## Before the next run

(Delete each line once it is done)

## The daily folder

One folder per day, named by date `YYYYMMDD/`:

| File | Contents | Produced by step |
|---|---|---|
| `source.txt` | That day's source text | 1 |
| `day.json` | The day's config: date, reference, on-screen text, narration sentences, reflection question, background theme | 1 |
| `tts/voice.wav` | The joined narration (keep every take's score in the same folder) | 2 |
| `bg/` | Background video clips | 3 |
| `<show>_<date>.mp4` | The assembled video | 4 |
| `post.txt` | Title and description for publishing (including the music credit) | 4 |
| `audio.mp3` | Audio version, narration plus music (only if you publish a podcast) | 4 |
| `published.json` | Publishing record (if this file exists, do not upload again) | 5 |

Shared material (opening card, ending card, fonts, music, voice reference files) goes in `_fixed/`.

## Doing a whole month at once

1. **Text**: split the month's source into a `source.txt` per day and generate each day's `day.json`. Collect suspected typos into one table for me to confirm.
2. **Narration** (the slowest part; start it first and let it run in the background): generate 3 takes of each sentence, check each with speech recognition, and join the best ones.
   Only report to me the places where every take misreads the same word, or a sentence is missing.
3. **Background footage** (runs alongside the narration): write each day's prompts for the month's theme, submit them to the video tool, collect the clips, and sample a few frames to check.
   Only block things that clearly should not be there: <e.g. buildings, text, people, animals>. Accept small flaws.
4. **Assembly**: as soon as a day's narration is ready, assemble that day: opening, backgrounds, text cards, narration, music. Text cards follow the timing of the narration.
   Afterwards check the length, the loudness, and frames at a few points in time (is the text there, is anything covering it).
5. **Publishing**: schedule on <platform> for <06:00> each day, with the title and description from `post.txt`. Write `published.json` after uploading.
   For AI-generated or cloned voices, <YouTube> requires the "altered or synthetic content" box to be ticked. Reconcile once after uploading: every day is scheduled, nothing missing and nothing duplicated.
6. **Backup**: only back up what cannot be regenerated (source text, `day.json`, voice reference files, approved artwork, this README).

## Word list

`_fixed/lexicon.json`, which grows more complete with use:

- `tts`: substitutions applied before the narration is generated (e.g. a rare word the AI misreads, replaced by a common word with the same sound)
- `card`: substitutions for text cards (characters missing from the font)
- `typo`: common typos in the source that I have confirmed
- `asr_ok`: words that speech recognition often mishears although they were read correctly; do not report them again

## What changes each month

| Month | Background theme | Opening image |
|---|---|---|
| <January> | <theme> | <image> |

## Done so far

- <YYYY-MM-DD> <which days>: <what went wrong and how it was solved>
- Example: a YouTube channel can upload only about 40 videos a day; beyond that it is blocked until the next day, so a whole month has to be uploaded over several days.
