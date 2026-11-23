# CharmBits 0.16 Marketplace and Open VSX draft

This is the public editor candidate for owner review. All 241 released charms and all editor features are free. The listing body is [extension/README.md](../extension/README.md); use that same body for Microsoft Marketplace and Open VSX.

## Listing fields

These values match the package manifest:

| Field | Value |
|---|---|
| Display name | CharmBits: Coding Charms |
| Short description | Free coding companions, calm pet reactions, charm bracelets, focus sessions, a daily garden and local photo keepsakes. |
| Version | 0.16.0 |
| Publisher / extension identity | `gautham-nvidia.charmlet` |
| Price | Free |
| Minimum supported API | VS Code 1.90 |
| Category | Other |
| Keywords | charms, focus, productivity, garden, motivation, silicon, accessibility |
| Website | [CharmBits](https://charmbits.pages.dev/) |
| Support | [GitHub issues](https://github.com/gautham-nvidia/charmbits/issues) |
| Contact | [getcharmbits@gmail.com](mailto:getcharmbits@gmail.com) |
| Software terms | Approved proprietary [software licence](../extension/LICENSE) |
| Artwork terms | Separate [artwork licence](../extension/ARTWORK-LICENSE.md) |
| Privacy | [Privacy disclosure](../extension/PRIVACY.md) |

The internal `charmlet` identity keeps existing settings, photos, imported packs and progress connected. The visible branding is CharmBits.

## What the release offers

The opening copy leads with “A little company while you code.” The release highlights are:

- All 241 released charms and editor features, with no payment, activation or trial timer
- Two or three independently movable charms on silver, gold, rose gold, woven linen or pearl bracelets, with saved slots, reordering and removal
- Front-facing flowers attached to straight leafy stems tucked behind the bloom, and thirteen cord choices
- Calm responses for all 23 pets and selected material effects
- Europe, Americas, Asia and National Parks collections, including fifteen new landmarks and park miniatures
- Cali, Sunny, Nimbus and Robot Assistant, plus focus, garden, small wins, local photo keepsakes and playable breaks
- Left and right pulling, settling, keyboard controls and Reduced Motion

Weather is optional and off by default. Nimbus checks timestamped US National Weather Service station observations every ten minutes while visible. It does not offer continuous weather streaming, global coverage or stock quotes.

The public desktop edition keeps its free starter, 30-day Pro trial and existing purchases. The personal owner packages are separate and must not be uploaded to either registry.

## Screenshots for review

These captures come from the actual 0.16 editor tests using disposable profiles:

| Asset | Shows |
|---|---|
| [Main view](store-assets/navigation.png) | Cali, quiet encouragement, navigation and the 0.16 version |
| [Collection](store-assets/picker.png) | “Free for VS Code” and the 241-design collection |
| [Bracelet](store-assets/bracelet.png) | Shiba Inu, front-facing rose and Cali attached to the same curved cord |
| [Flower attachment](store-assets/flower.png) | The original front-facing bloom joined underneath |

The README's hosted image URLs use `main`; merge these reviewed assets before publishing so the store displays the same captures.

## Distribution and remaining account steps

Microsoft Marketplace, Open VSX and manual VSIX installation are separate routes. Current host evidence belongs in [editor-distribution.md](editor-distribution.md). Avoid claiming support for every fork based only on shared VS Code APIs.

The owner confirmed creating the Gmail inbox and personal Microsoft account using **getcharmbits@gmail.com** on November 23, 2026. Sign in with that account for the Marketplace setup below. Creating a Microsoft account does not establish ownership of a Marketplace publisher or configure Trusted Publishing.

The source and artwork terms are already chosen. To publish:

1. Review and merge the tested candidate, then confirm successful CI for that exact `main` commit.
2. Confirm ownership of Marketplace publisher `gautham-nvidia` and configure the Trusted Publishing policy in [editor-distribution.md](editor-distribution.md).
3. For Open VSX, claim the matching namespace, accept the publisher agreement and configure its separate publishing secret.
4. Run the prepared release workflow for the intended registry. Verify the resulting public listing before enabling its website install link.

No store publication is implied by this draft or by a locally packaged VSIX. Payment and Brevo accounts are not required for the free editor release.
