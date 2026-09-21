# Thread Wire Calculator — User Guide

A pocket calculator for checking a thread you have cut, or working out what it should
measure before you cut it. It runs in a browser, works offline once installed, and is meant
to sit on the bench next to the micrometer.

If you have never used the three-wire method before, read the next two sections first.
Everything after that is the app itself.

## What the three-wire method is for

The important size on a thread is not the outside diameter. It is the **pitch diameter** —
the diameter partway down the flanks, where the width of the thread and the width of the
gap between threads come out equal. That is the size that decides whether a nut runs on,
and whether it runs on loose or tight. A micrometer cannot reach it directly, because the
crests of the thread are in the way.

The three-wire method gets at it indirectly. You lay three wires of identical diameter in
the thread grooves — two on one side, one on the other, so the micrometer has three points
of contact — and measure across the outside of the wires with a micrometer. That reading is
the **measurement over wires**. It is bigger than the pitch diameter by an amount that
depends only on the pitch, the thread angle and the wire size, all of which are known. So
one number can be turned into the other, and this app does that arithmetic both ways.

## What you need

- A micrometer that covers the size, ideally with a ratchet or friction thimble so every
  reading is taken at the same pressure.
- Three wires of the **same** diameter, sized to sit on the flanks rather than bottoming in
  the root or riding on the crests. The app tells you the ideal size; a set of thread
  measuring wires will have something close.
- The pitch of the thread you are measuring. If you are cutting it, you already know it. If
  you are checking someone else's work, a thread pitch gauge settles it.

## Getting started

1. **Pick the mode.** Two buttons at the top:
   - **Find pitch diameter** — you have a micrometer reading over the wires and want to
     know the pitch diameter it corresponds to. This is the checking-a-thread direction.
   - **Find measure over wires** — you know the pitch diameter you are aiming at and want
     to know what the micrometer should read. This is the before-you-cut direction.
2. **Pick display units.** **Metric** shows millimetres, **Imperial** shows inches. This
   only changes what you read and type; it does not change the thread you have selected.
3. **Pick the thread standard.** Metric ISO, UNC, UNF, UNEF, 4-UN, 6-UN, 8-UN, or BSP
   parallel (G).
4. **Pick the fastener size**, then the **pitch** if the size offers more than one. Inch
   threads list pitch as threads per inch (TPI); metric threads list it in millimetres.
5. **Pick a class of fit** if the standard has one. See *Classes of fit* below. If you do
   not know which to use, leave it as it comes.
6. **Read or type the measurement.** The measurement field has already filled itself in
   with the size the thread should be — so a thread you have just selected already shows
   what it ought to measure, before you touch anything. Type your own micrometer reading
   over the top of it when you have one.

The result updates as you type. There is no calculate button.

## The fields, one by one

### Pitch

Shown as TPI for inch standards and millimetres for metric ones, because that is how each
family is quoted. Where it is not obvious, a small line underneath gives the same pitch as a
length in your chosen display units.

### Wire size

Starts on **Auto**, showing the best wire size for the thread — the wire that touches each
flank right at the pitch line, which is the size that makes the measurement least sensitive
to small errors. The result panel also shows this number in its own box.

If the wires actually in your drawer are a different size, type that size in. The badge
changes to **Custom** and every number the app gives you is recalculated for the wires you
really have, which is the point: a class limit means nothing unless it is expressed for the
wires in use. **Use best wire** puts it back to Auto.

A custom wire size survives changing thread, because the wires on the bench do not change
when you pick a different job.

### Measurement

This is the field you type your reading into. What it means depends on the mode: in **Find
pitch diameter** it is the measurement over wires, and in **Find measure over wires** it is
the pitch diameter. The label changes to say which.

The badge above it tells you where the current number came from:

- **Nominal** — the basic size from the thread tables, used when no class is selected.
- **2A max**, **6g max**, and so on — the largest pitch diameter the selected class allows.
  This is the size to cut to: on an external thread you aim at the top of the band and have
  the whole tolerance left to work down into.
- **Measured** — you typed it. The button beside the field (**Use limit** or **Use
  nominal**) puts the target back.

Selecting a different thread clears a typed reading, because a measurement belongs to the
thread it was taken on. Changing the class does **not** clear it — the thread in your hand
has not changed, only the limits you are judging it against.

## Reading the result

The dark panel at the bottom gives the calculated number in large type — the pitch diameter,
or the measurement over wires, whichever the mode asks for.

With a class selected you also get a permitted range in two places: under the input, in the
units of the input, and beside the result, in the units of the result. So both the pitch
diameter limits and the micrometer readings they correspond to are on the screen at once,
and you never have to convert between them in your head.

Alongside the range sits the verdict:

- **Within 2A** — the thread is in tolerance.
- **Under 2A min** — undersize. You have cut too deep; on an external thread there is no
  recovering this one.
- **Over 2A max** — oversize. Still has material to come off, so keep going.

## Classes of fit

A class of fit is the amount of slop the standard allows. It is written as a band: a
smallest allowed pitch diameter and a largest. Any thread whose pitch diameter falls inside
the band is a good thread by that class. Two things set the band — where it sits relative
to the basic size, and how wide it is.

Which classes you are offered depends on the standard you picked.

### Inch threads — ASME B1.1

- **Class 2A** — the ordinary commercial fit. Nearly every bolt you buy is 2A. It carries a
  small clearance allowance, which means its largest pitch diameter is slightly *below* the
  basic size, leaving room for plating and easy assembly.
- **Class 3A** — the tight fit, for close work. No allowance, so it opens right at the basic
  size, and the band is narrower.

For a 5/8-11 UNC thread, whose basic pitch diameter is 0.5660 in:

| Class | Smallest | Largest |
| --- | --- | --- |
| 2A | 0.5589 in | 0.5644 in |
| 3A | 0.5619 in | 0.5660 in |

Note the 3A band is about half the width of the 2A band, and sits higher.

### Metric threads — ISO 965

Metric classes are a number and a letter: the number is how wide the band is (smaller number
= tighter), the letter is where it sits (h sits right at the basic size, g sits a little
below it).

- **6g (general purpose)** — the metric equivalent of 2A, and what a standard metric bolt
  is.
- **4h (close)** — tighter, and sitting at the basic size rather than below it.

For M6 x 1, whose basic pitch diameter is 5.350 mm:

| Class | Smallest | Largest |
| --- | --- | --- |
| 6g | 5.212 mm | 5.324 mm |
| 4h | 5.279 mm | 5.350 mm |

### BSP

BSP parallel threads get no class control at all. BSP uses a different tolerance system,
which this app does not carry, and borrowing a class from another standard would be making
up a number. You still get the pitch diameter and the measurement over wires; you just do
not get a pass/fail verdict.

## When the app says it has no limits

The numbers in the class tables are transcribed from the published standards rather than
worked out from a formula, because the standards round their own tables and recalculating
does not always land back on the printed value. Where the standard prints a number, that is
the number you get. Two consequences show up on screen:

- **"the class limits come from the tolerance formula instead"** — ASME B1.1 does not table
  that particular size, so the app has fallen back on the formula in the standard's
  appendix. The formula agrees with the printed table only about half the time and can be
  out by as much as 0.0007 in. Treat the limits as a guide and check them against a printed
  table before you cut to them or take a part to a gauge.
- **"there are no limits to show and the basic pitch diameter stands in"** — the standard
  does not tabulate that diameter-and-pitch combination at all. It happens with the very
  small metric sizes and with fine pitches on large diameters, such as M12 x 0.75. You still
  get the basic pitch diameter to aim at, but no band and no verdict.

Both messages appear in the small print at the foot of the result panel.

## Units and decimals

Everything is calculated in millimetres internally and converted only for display, so
switching between **Metric** and **Imperial** never loses precision and never drifts. Metric
shows four decimal places, imperial shows five — near enough the same resolution, and finer
than a wire measurement is read in practice.

## What it remembers

Your setup is kept between visits: the mode, the display units, the standard, size and
pitch, your class choices, and a custom wire size. Measurements are not kept — a reading
belongs to one job, and starting a new session with someone else's number in the field would
be worse than starting empty.

## Installing it on a phone, tablet or computer

The app installs to your home screen and runs with no signal afterwards, which is the point
of it in a workshop with no reception.

- **iPhone or iPad:** open the site in Safari, tap Share, then **Add to Home Screen**.
- **Android:** open the site in Chrome, open the menu, then **Install** (Chrome renames and
  moves this between versions, so yours may word it differently). A properly installed app
  appears in the app drawer; a plain shortcut does not, which is how you can tell them
  apart.
- **Desktop:** use the install icon in the browser's address bar.

Once installed, the whole app is stored on the device. It will keep working with the phone
in flight mode.

## When an update appears

A small panel appears at the bottom of the screen reading **"A new version is ready"**, with
**Update** and **Close**.

- **Update** switches to the new version and reloads. Your current measurement is not
  carried across, so finish what you are reading first.
- **Close** leaves you on the version you are running. You will be offered the update again
  next time you open the app.

Nothing updates itself behind your back. An app that reloaded on its own halfway through a
measurement would be worse than one running a week behind.

## Reporting a problem

The bottom right corner of the result panel shows a version and a short code, like
`v0.2.0 · 427ebb1`. Quote both when reporting a problem. The version alone cannot tell
anyone whether your installed copy has picked up a given fix; the code always changes when
anything does.
