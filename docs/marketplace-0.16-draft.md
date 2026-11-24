# CharmBits 0.16 Marketplace release

**Published:** [CharmBits: Coding Charms 0.16.0](https://marketplace.visualstudio.com/items?itemName=gautham-nvidia.charmlet).
All 241 released charms and all editor features are free. The listing body is
[extension/README.md](../extension/README.md); the same body can be used for a
future Open VSX release.

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

The README's hosted image URLs use `main`. All three listing images were fetched
anonymously after the merge and matched the reviewed captures byte for byte.

## Distribution and remaining account steps

Microsoft Marketplace, Open VSX and manual VSIX installation are separate routes. Current host evidence belongs in [editor-distribution.md](editor-distribution.md). Avoid claiming support for every fork based only on shared VS Code APIs.

The owner created the publisher **CharmBits (`gautham-nvidia`)** under the personal
Microsoft account **getcharmbits@gmail.com** on November 23, 2026. The publisher
screen confirms Owner access. The **CharmBits releases** Trusted Publishing
policy is configured for `gautham-nvidia/charmbits`, workflow `release.yml`, with
no GitHub environment. Its first authenticated publication succeeded on
November 24, 2026 at 06:33 UTC in
[release run 45339901948](https://github.com/gautham-nvidia/charmbits/actions/runs/45339901948).
The public listing reports version 0.16.0 and Free pricing. Its downloaded VSIX
exactly matches the uploaded package; every file also matches the separately
reviewed artifact from the same source commit.

The public homepage uses the released collection only; its former athlete and
musician previews are excluded along with the withheld app artwork. Cursor and
Devin installation evidence remains separate from their unverified authenticated
runtime behavior.

For the next version, retain this release sequence:

1. Review and merge the tested candidate, then confirm successful CI for that exact `main` commit.
2. Run the release workflow with destination `artifact` and review the public VSIX and checksum.
3. Run destination `marketplace` through the configured Trusted Publishing policy.
4. Verify the resulting public listing before enabling its website install link.

Open VSX remains a separate future step: claim the matching namespace, accept
its publisher agreement and configure its separate publishing secret.

The verified publication source is `da5666959291dfea79fcd587448faa0a1a7e814d`,
with all nine checks passing before upload. The public VSIX SHA-256 is
`e1512aa029e4b132ce0426e8dd2e45a14bf29ab92263cbe66c6eb4c02ce0f047`.
Payment and Brevo accounts are not required for this free editor release.
