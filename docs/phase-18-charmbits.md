# CharmBits rebrand and Marketplace candidate

Gautham Anebajagane · TM · Operations

**Extension 0.15.0 and desktop 0.12.0 are review candidates.** The visible product is now CharmBits. VS Code features are free, with 31 starter charms and optional paid charms. Desktop retains the existing starter, 30-day trial, Pro prices and access rules. Publication still needs approved source/artwork terms, publisher ownership and successful CI on the release commit.

## Compatibility

The following are deliberately stable:

| Boundary | Retained identity |
|---|---|
| Installed VS Code extension | `gautham-nvidia.charmlet` |
| Commands, views, settings and secret keys | Existing `charmlet.*` identifiers |
| Desktop profile and safe-storage identity | `Charmlet`, `dev.charmlet.desktop`, existing protocol |
| Pack and activation formats | `charmlet-pack`, `charmlet-access`, `.charmlet.json` |
| Purchases, signed-grant audience, webhook fields | Existing identifiers and validation rules |
| Previously distributed artwork | Existing pack IDs, metadata and image bytes |

These are compatibility identifiers, not incomplete replacements. Display names, menus, dialogs, documentation, website copy, service messages and new download filenames use CharmBits. The repository is `gautham-nvidia/charmbits`; the existing website and support mailbox remain reachable through their established addresses.

## Verified locally

| Check | Result |
|---|---|
| Type checking, lint and production bundle | Pass |
| App models | 102 passed, including host-specific access, expiry, retained purchases and forged grants |
| Access service | 13 passed; downloads and offers confirmation do not start a desktop trial |
| Release checker | 7 passed, including package equality, private-file exclusion, licence gates and OIDC prerequisites |
| Artwork and Photo Studio boundaries | 23 passed |
| Real editor scenarios | 14 passed |
| Installed VSIX scenarios | 8 passed; the installed-mode invocation also ran 7 source controls |
| Windows desktop models | 13 passed |
| Windows archive | Extracted archive launched in an owned profile; shared feature and persistence smoke passed |
| Website | Desktop and 320/390/768-pixel layouts; 261 designs, 17 sports figures, 13 skylines; no console errors |
| Install route | Configured Marketplace installation bypasses signup; tested with an isolated destination fixture |
| Dependency check after publishing-tool update | 487 packages audited, zero reported vulnerabilities |

Native OS input verification and macOS packaging are also required from the hosted jobs. A local Electron ignored-mouse-events setting alone is not proof of native click-through.

### Actual upgrade

An isolated Windows profile installed the retained **0.14.0 VSIX**, created a generated photo and a saved win, imported a historical pack, and then installed **0.15.0** into the same profile. The assertions verified:

- All saved appearance and puzzle preferences, including 137% size.
- Exact stored photo and imported-pack bytes.
- A paused focus session and its intention.
- Six existing garden waterings and the saved win.
- All **235 available choices** in that beta profile.
- The new “Free for VS Code” label.
- Reimporting the old pack reports “already installed,” preserves the selected photo and creates no duplicate.

No real personal photos or customer data were used. This proves the exercised upgrade paths; native migration of a purchased signed token was not exercised because live signing keys are not configured. Signed-access model tests cover both application contexts.

## Review artifacts

| Artifact | Bytes | SHA-256 |
|---|---:|---|
| `extension/charmbits-0.15.0.vsix` | 20,340,391 | `d1076c1c1cc314aead89e1c9e66dea6fbbbed83746374b09a251a9340b615dd5` |
| `desktop/distribution/CharmBits-desktop-0.12.0-win32-x64.zip` | 178,563,075 | `1424f4513ca62ee09f0ebec49e32c9199fb77a1b04c91cd7813cf84b67880603` |

The VSIX has 332 files. Updating the publishing tool from 4.0.0 to pinned **4.1.1** enables the officially documented `--oidc` publishing option. All **324 runtime and artwork entries** are byte-identical to the package used for the local UI and upgrade checks. Hosted installed-extension checks will exercise packages built with 4.1.1. The earlier package is retained in local session records.

The Windows packager initially returned `EPERM` on a directory rename; an identical retry succeeded without changing code or security settings. The ZIP above is the successfully extracted and tested result.

The macOS menu explicitly labels About and Quit as CharmBits while retaining the internal application name for profile/keychain compatibility. The desktop smoke checks that boundary; its menu assertions run on macOS.

## Website and listing

The approved Terminal logo and visual design are retained. The website distinguishes free VS Code features from Desktop Pro, keeps Auto theme as the default, and retains the small theme control and dismissible offers popup. Email, checkout and private delivery remain disabled until configured. The legacy Photo Studio URL now has correct branding, working navigation and a clear explanation that native VS Code photo tools are free.

The [listing copy and account setup](store-listing.md) includes current screenshots from an installed 0.15.0 profile. Its picker shows the actual 31-charm starter.

The release workflow supports GitHub Trusted Publishing without a stored Marketplace PAT. The owner must configure the publisher policy for `gautham-nvidia/charmbits`, workflow `release.yml`, with no environment name. The public extension lookup currently returns “not found”; that does not establish ownership of the publisher.

## Decisions before publication

| Item | Required result |
|---|---|
| Source terms | Choose the code licence; add `extension/LICENSE` and the matching manifest value |
| Artwork | Approve the distributable lineup and its terms; add `extension/ARTWORK-LICENSE.md`. Public review approval does not establish third-party rights |
| Publisher | Verify ownership of `gautham-nvidia` and configure its Trusted Publishing policy |
| Release source | Review/merge the candidate and obtain successful `main` CI at the exact release commit |
| Paid services | Configure signing keys and providers, rebuild affected apps, and rehearse purchases/refunds before enabling sales |
| Desktop promotion | Complete signing/notarization and remaining physical platform checks |

Trademark filing remains deferred at the owner's request. Neither domain registration nor a trademark filing is introduced as a prerequisite for preparing this candidate.

The preparation record does not claim Marketplace publication, completed live payments or a new Cloudflare deployment. Hosted verification and deployment evidence are recorded separately once observed.

---

Gautham Anebajagane · TM · Operations
