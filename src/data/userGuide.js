// Generated from user.md by scripts/generate-guide.mjs. Do not edit by hand.
// Edit user.md and run: npm run generate:guide

export const guideTitle = "Thread Wire Calculator — User Guide"

export const guideSections = Object.freeze([
  {
    "id": "what-the-three-wire-method-is-for",
    "title": "What the three-wire method is for"
  },
  {
    "id": "what-you-need",
    "title": "What you need"
  },
  {
    "id": "getting-started",
    "title": "Getting started"
  },
  {
    "id": "the-fields-one-by-one",
    "title": "The fields, one by one"
  },
  {
    "id": "reading-the-result",
    "title": "Reading the result"
  },
  {
    "id": "classes-of-fit",
    "title": "Classes of fit"
  },
  {
    "id": "when-the-app-says-it-has-no-limits",
    "title": "When the app says it has no limits"
  },
  {
    "id": "units-and-decimals",
    "title": "Units and decimals"
  },
  {
    "id": "what-it-remembers",
    "title": "What it remembers"
  },
  {
    "id": "installing-it-on-a-phone-tablet-or-computer",
    "title": "Installing it on a phone, tablet or computer"
  },
  {
    "id": "when-an-update-appears",
    "title": "When an update appears"
  },
  {
    "id": "reporting-a-problem",
    "title": "Reporting a problem"
  }
])

// One entry per block, so a change to one paragraph shows up as a one line diff.
export const guideHtml = [
  "<p>A pocket calculator for checking a thread you have cut, or working out what it should measure before you cut it. It runs in a browser, works offline once installed, and is meant to sit on the bench next to the micrometer.</p>",
  "<p>If you have never used the three-wire method before, read the next two sections first. Everything after that is the app itself.</p>",
  "<h2 id=\"what-the-three-wire-method-is-for\">What the three-wire method is for</h2>",
  "<p>The important size on a thread is not the outside diameter. It is the <strong>pitch diameter</strong> — the diameter partway down the flanks, where the width of the thread and the width of the gap between threads come out equal. That is the size that decides whether a nut runs on, and whether it runs on loose or tight. A micrometer cannot reach it directly, because the crests of the thread are in the way.</p>",
  "<p>The three-wire method gets at it indirectly. You lay three wires of identical diameter in the thread grooves — two on one side, one on the other, so the micrometer has three points of contact — and measure across the outside of the wires with a micrometer. That reading is the <strong>measurement over wires</strong>. It is bigger than the pitch diameter by an amount that depends only on the pitch, the thread angle and the wire size, all of which are known. So one number can be turned into the other, and this app does that arithmetic both ways.</p>",
  "<h2 id=\"what-you-need\">What you need</h2>",
  "<ul><li>A micrometer that covers the size, ideally with a ratchet or friction thimble so every reading is taken at the same pressure.</li><li>Three wires of the <strong>same</strong> diameter, sized to sit on the flanks rather than bottoming in the root or riding on the crests. The app tells you the ideal size; a set of thread measuring wires will have something close.</li><li>The pitch of the thread you are measuring. If you are cutting it, you already know it. If you are checking someone else's work, a thread pitch gauge settles it.</li></ul>",
  "<h2 id=\"getting-started\">Getting started</h2>",
  "<ol><li><strong>Pick the mode.</strong> Two buttons at the top:<ul><li><strong>Find pitch diameter</strong> — you have a micrometer reading over the wires and want to know the pitch diameter it corresponds to. This is the checking-a-thread direction.</li><li><strong>Find measure over wires</strong> — you know the pitch diameter you are aiming at and want to know what the micrometer should read. This is the before-you-cut direction.</li></ul></li><li><strong>Pick display units.</strong> <strong>Metric</strong> shows millimetres, <strong>Imperial</strong> shows inches. This only changes what you read and type; it does not change the thread you have selected.</li><li><strong>Pick the thread standard.</strong> Metric ISO, UNC, UNF, UNEF, 4-UN, 6-UN, 8-UN, or BSP parallel (G).</li><li><strong>Pick the fastener size</strong>, then the <strong>pitch</strong> if the size offers more than one. Inch threads list pitch as threads per inch (TPI); metric threads list it in millimetres.</li><li><strong>Pick a class of fit</strong> if the standard has one. See <em>Classes of fit</em> below. If you do not know which to use, leave it as it comes.</li><li><strong>Read or type the measurement.</strong> The measurement field has already filled itself in with the size the thread should be — so a thread you have just selected already shows what it ought to measure, before you touch anything. Type your own micrometer reading over the top of it when you have one.</li></ol>",
  "<p>The result updates as you type. There is no calculate button.</p>",
  "<h2 id=\"the-fields-one-by-one\">The fields, one by one</h2>",
  "<h3 id=\"pitch\">Pitch</h3>",
  "<p>Shown as TPI for inch standards and millimetres for metric ones, because that is how each family is quoted. Where it is not obvious, a small line underneath gives the same pitch as a length in your chosen display units.</p>",
  "<h3 id=\"wire-size\">Wire size</h3>",
  "<p>Starts on <strong>Auto</strong>, showing the best wire size for the thread — the wire that touches each flank right at the pitch line, which is the size that makes the measurement least sensitive to small errors. The result panel also shows this number in its own box.</p>",
  "<p>If the wires actually in your drawer are a different size, type that size in. The badge changes to <strong>Custom</strong> and every number the app gives you is recalculated for the wires you really have, which is the point: a class limit means nothing unless it is expressed for the wires in use. <strong>Use best wire</strong> puts it back to Auto.</p>",
  "<p>A custom wire size survives changing thread, because the wires on the bench do not change when you pick a different job.</p>",
  "<h3 id=\"measurement\">Measurement</h3>",
  "<p>This is the field you type your reading into. What it means depends on the mode: in <strong>Find pitch diameter</strong> it is the measurement over wires, and in <strong>Find measure over wires</strong> it is the pitch diameter. The label changes to say which.</p>",
  "<p>The badge above it tells you where the current number came from:</p>",
  "<ul><li><strong>Nominal</strong> — the basic size from the thread tables, used when no class is selected.</li><li><strong>2A max</strong>, <strong>6g max</strong>, and so on — the largest pitch diameter the selected class allows. This is the size to cut to: on an external thread you aim at the top of the band and have the whole tolerance left to work down into.</li><li><strong>Measured</strong> — you typed it. The button beside the field (<strong>Use limit</strong> or <strong>Use nominal</strong>) puts the target back.</li></ul>",
  "<p>Selecting a different thread clears a typed reading, because a measurement belongs to the thread it was taken on. Changing the class does <strong>not</strong> clear it — the thread in your hand has not changed, only the limits you are judging it against.</p>",
  "<h2 id=\"reading-the-result\">Reading the result</h2>",
  "<p>The dark panel at the bottom gives the calculated number in large type — the pitch diameter, or the measurement over wires, whichever the mode asks for.</p>",
  "<p>With a class selected you also get a permitted range in two places: under the input, in the units of the input, and beside the result, in the units of the result. So both the pitch diameter limits and the micrometer readings they correspond to are on the screen at once, and you never have to convert between them in your head.</p>",
  "<p>Alongside the range sits the verdict:</p>",
  "<ul><li><strong>Within 2A</strong> — the thread is in tolerance.</li><li><strong>Under 2A min</strong> — undersize. You have cut too deep; on an external thread there is no recovering this one.</li><li><strong>Over 2A max</strong> — oversize. Still has material to come off, so keep going.</li></ul>",
  "<h2 id=\"classes-of-fit\">Classes of fit</h2>",
  "<p>A class of fit is the amount of slop the standard allows. It is written as a band: a smallest allowed pitch diameter and a largest. Any thread whose pitch diameter falls inside the band is a good thread by that class. Two things set the band — where it sits relative to the basic size, and how wide it is.</p>",
  "<p>Which classes you are offered depends on the standard you picked.</p>",
  "<h3 id=\"inch-threads-asme-b1-1\">Inch threads — ASME B1.1</h3>",
  "<ul><li><strong>Class 2A</strong> — the ordinary commercial fit. Nearly every bolt you buy is 2A. It carries a small clearance allowance, which means its largest pitch diameter is slightly <em>below</em> the basic size, leaving room for plating and easy assembly.</li><li><strong>Class 3A</strong> — the tight fit, for close work. No allowance, so it opens right at the basic size, and the band is narrower.</li></ul>",
  "<p>For a 5/8-11 UNC thread, whose basic pitch diameter is 0.5660 in:</p>",
  "<div class=\"guide-table\"><table><thead><tr><th scope=\"col\">Class</th><th scope=\"col\">Smallest</th><th scope=\"col\">Largest</th></tr></thead><tbody><tr><th scope=\"row\">2A</th><td>0.5589 in</td><td>0.5644 in</td></tr><tr><th scope=\"row\">3A</th><td>0.5619 in</td><td>0.5660 in</td></tr></tbody></table></div>",
  "<p>Note the 3A band is about half the width of the 2A band, and sits higher.</p>",
  "<h3 id=\"metric-threads-iso-965\">Metric threads — ISO 965</h3>",
  "<p>Metric classes are a number and a letter: the number is how wide the band is (smaller number = tighter), the letter is where it sits (h sits right at the basic size, g sits a little below it).</p>",
  "<ul><li><strong>6g (general purpose)</strong> — the metric equivalent of 2A, and what a standard metric bolt is.</li><li><strong>4h (close)</strong> — tighter, and sitting at the basic size rather than below it.</li></ul>",
  "<p>For M6 x 1, whose basic pitch diameter is 5.350 mm:</p>",
  "<div class=\"guide-table\"><table><thead><tr><th scope=\"col\">Class</th><th scope=\"col\">Smallest</th><th scope=\"col\">Largest</th></tr></thead><tbody><tr><th scope=\"row\">6g</th><td>5.212 mm</td><td>5.324 mm</td></tr><tr><th scope=\"row\">4h</th><td>5.279 mm</td><td>5.350 mm</td></tr></tbody></table></div>",
  "<h3 id=\"bsp\">BSP</h3>",
  "<p>BSP parallel threads get no class control at all. BSP uses a different tolerance system, which this app does not carry, and borrowing a class from another standard would be making up a number. You still get the pitch diameter and the measurement over wires; you just do not get a pass/fail verdict.</p>",
  "<h2 id=\"when-the-app-says-it-has-no-limits\">When the app says it has no limits</h2>",
  "<p>The numbers in the class tables are transcribed from the published standards rather than worked out from a formula, because the standards round their own tables and recalculating does not always land back on the printed value. Where the standard prints a number, that is the number you get. Two consequences show up on screen:</p>",
  "<ul><li><strong>&quot;the class limits come from the tolerance formula instead&quot;</strong> — ASME B1.1 does not table that particular size, so the app has fallen back on the formula in the standard's appendix. The formula agrees with the printed table only about half the time and can be out by as much as 0.0007 in. Treat the limits as a guide and check them against a printed table before you cut to them or take a part to a gauge.</li><li><strong>&quot;there are no limits to show and the basic pitch diameter stands in&quot;</strong> — the standard does not tabulate that diameter-and-pitch combination at all. It happens with the very small metric sizes and with fine pitches on large diameters, such as M12 x 0.75. You still get the basic pitch diameter to aim at, but no band and no verdict.</li></ul>",
  "<p>Both messages appear in the small print at the foot of the result panel.</p>",
  "<h2 id=\"units-and-decimals\">Units and decimals</h2>",
  "<p>Everything is calculated in millimetres internally and converted only for display, so switching between <strong>Metric</strong> and <strong>Imperial</strong> never loses precision and never drifts. Metric shows four decimal places, imperial shows five — near enough the same resolution, and finer than a wire measurement is read in practice.</p>",
  "<h2 id=\"what-it-remembers\">What it remembers</h2>",
  "<p>Your setup is kept between visits: the mode, the display units, the standard, size and pitch, your class choices, and a custom wire size. Measurements are not kept — a reading belongs to one job, and starting a new session with someone else's number in the field would be worse than starting empty.</p>",
  "<h2 id=\"installing-it-on-a-phone-tablet-or-computer\">Installing it on a phone, tablet or computer</h2>",
  "<p>The app installs to your home screen and runs with no signal afterwards, which is the point of it in a workshop with no reception.</p>",
  "<ul><li><strong>iPhone or iPad:</strong> open the site in Safari, tap Share, then <strong>Add to Home Screen</strong>.</li><li><strong>Android:</strong> open the site in Chrome, open the menu, then <strong>Install</strong> (Chrome renames and moves this between versions, so yours may word it differently). A properly installed app appears in the app drawer; a plain shortcut does not, which is how you can tell them apart.</li><li><strong>Desktop:</strong> use the install icon in the browser's address bar.</li></ul>",
  "<p>Once installed, the whole app is stored on the device. It will keep working with the phone in flight mode.</p>",
  "<h2 id=\"when-an-update-appears\">When an update appears</h2>",
  "<p>A small panel appears at the bottom of the screen reading <strong>&quot;A new version is ready&quot;</strong>, with <strong>Update</strong> and <strong>Close</strong>.</p>",
  "<ul><li><strong>Update</strong> switches to the new version and reloads. Your current measurement is not carried across, so finish what you are reading first.</li><li><strong>Close</strong> leaves you on the version you are running. You will be offered the update again next time you open the app.</li></ul>",
  "<p>Nothing updates itself behind your back. An app that reloaded on its own halfway through a measurement would be worse than one running a week behind.</p>",
  "<h2 id=\"reporting-a-problem\">Reporting a problem</h2>",
  "<p>The bottom right corner of the result panel shows a version and a short code, like <code>v0.1.0 · 427ebb1</code>. Quote both when reporting a problem. The version alone cannot tell anyone whether your installed copy has picked up a given fix; the code always changes when anything does.</p>",
].join('\n')
