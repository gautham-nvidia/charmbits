# Marketplace visual assets

The 0.16.1 overview uses four image boards served from
`https://charmbits.pages.dev/assets/store/`. They accompany the three sections in
the extension README: Install, Features, and Terms and conditions.

| File | Pixels | Story |
|---|---|---|
| `cali-hero-0161.png` | 1400 × 760 | Cali, the free editor edition and the real VS Code workspace |
| `choose-and-play-0161.png` | 1400 × 760 | The collection and a bracelet containing Cali, a dog locket and a rose |
| `garden-focus-0161.png` | 1400 × 760 | A paused focus session and a flower earned in the garden |
| `dog-keepsake-0161.png` | 1400 × 680 | A personal photo keepsake and local photo storage |

## Capture and composition

`release/capture-listing.mjs` installs the public VSIX in an isolated editor
profile. It uses the actual UI to browse the collection, pause a focus session,
water the demo garden, import a dog portrait and arrange the bracelet. The
garden starts with synthetic progress at ten waterings; the normal Water plant
action earns the eleventh. These are product examples, not customer usage.

The capture does not use an owner's editor profile, workspace, photos or
account. Its scratch code and keepsake name are fictional examples. Optional
editor chat is disabled in this profile, and notification toasts are cleared
and checked before every capture. Product failures still fail the capture.

`release/compose-listing.mjs` adds the headings, backgrounds and framing around
those screenshots. It crops the bracelet and locket stage without changing the
product artwork or controls. The Cali illustration is an existing, reviewed
asset: `extension/media/live-art-cali-thumbs.png`. The same illustration produces
the Marketplace icon. Typography uses the existing Manrope and Bricolage
Grotesque fonts under their supplied OFL terms.

The original golden retriever demo was prompt-generated for this listing and
visually reviewed on 24 November 2026. It is not a user's pet photo. Its source
SHA-256 is
`58ff57a0e3982e766dd5fc59e8752325ceae5f9205ad2da45ecd66aa253952ae`.
No original user photo is shipped with the extension.

The reviewed native captures came from public 0.16.1 package SHA-256
`05396a8a7403b52d715955e9ba6230f68d10081f5a30f5bcc46c6ffb6651c37a`.
Capture and composition receipts retain the scene selectors, source package
hash and output hashes in the working session. Later copy or layout refinements
do not change the captured runtime.

Use versioned filenames when replacing published image boards so cached
Marketplace descriptions cannot silently mix different visual revisions.
