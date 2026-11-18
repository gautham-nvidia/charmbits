# CharmBits 0.15.1 — release terms and website corrections

Gautham Anebajagane · TM · Operations

The owner approved proprietary software terms, separate artwork terms and a
public app selection of 210 designs. The VS Code software features remain free,
with 31 starter charms and optional paid artwork. Desktop retains its existing
trial and Pro access.

## Distribution and saved data

The app packages exclude the 34 Music Icons and 17 Sports Icons images. Existing
saved choices retain their IDs and cord preferences and use a neutral placeholder
when the corresponding image is unavailable. Personal imports, photos, purchases,
focus and garden data are retained.

The owner separately requested one athlete and one musician on the homepage:
**Stephen Curry and Michael Jackson**. Only their WebP concept previews appear
there. They do not enter the app catalogue, commerce products, raw downloads or
press kit. This display request does not establish third-party likeness rights.
The selection is recorded in `website/homepage-previews.json`.

The app now links to **https://charmbits.pages.dev/**. Cloudflare builds for the
old `charmlet.pages.dev` project generate a permanent path-preserving redirect to
the new address. Builds for the new project do not generate that redirect.

## Website movement correction

A 1440-pixel-wide browser reproduced Cali's movement problem: a 100-pixel pull to
the right left its centre at 1237.155, while the same pull left moved it to
1137.162. The large charm's hanging point had reached the right movement limit.
The website layout now reserves room on both sides before placing the anchor.
The shared app physics is unchanged.

The browser regression checks both drag directions and a swing across the resting
point in desktop, VS Code preview and 320/390/768-pixel layouts. It waits for the
charm to be visible before interacting, since offscreen animation intentionally
pauses.

## Verification and publication

Local validation passed 104 app unit tests, 22 service/release tests and eight
installed-VSIX scenarios. The Windows desktop archive was extracted and launched
in an owned profile, including checks for excluded images and exact licence
contents. Website checks cover image/download boundaries, the two homepage
previews, motion, mobile layouts, email choices and isolated checkout fixtures.
Final package hashes and hosted checks belong to the matching release record.

The earlier 0.14→0.15.0 installation rehearsal remains historical evidence.
Its `retainedChoices: 235` counts picker options in the synthetic profile, not
stored cord preferences. This document does not claim a new 0.14→0.15.1 rehearsal.

Marketplace publication still requires verified publisher ownership and Trusted
Publishing, reviewed source on `main`, and successful checks at that commit.
Email, checkout and private delivery remain disabled until their providers and
purchase/refund flows are configured. Desktop signing and native platform checks
remain requirements before promoting the standalone application.

Gautham Anebajagane · TM · Operations
