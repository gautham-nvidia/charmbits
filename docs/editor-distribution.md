# CharmBits 0.16 editor distribution

Gautham Anebajagane · TM · Operations

Every released editor charm and feature is free. Desktop pricing is separate.
The extension keeps **`gautham-nvidia.charmlet`** as its internal identity so existing
settings, photos and progress stay connected. Its visible name and package filename
are **CharmBits** and **`charmbits-0.16.0.vsix`**.

## Three installation routes

| Route | What it provides | Remaining account step |
|---|---|---|
| Microsoft Visual Studio Marketplace | The normal VS Code installation and update route | Confirm control of publisher `gautham-nvidia` and configure its GitHub Trusted Publisher |
| Open VSX | A separate registry used by compatible editors | Claim the matching namespace, complete the publisher agreement and add `OVSX_PAT` to repository Actions secrets |
| VSIX | The same package installed manually through **Extensions → Install from VSIX…** | Retain a tested artifact and its checksum; do not describe a local package as a published store listing |

A Marketplace upload does not automatically publish to Open VSX. Store use varies
by editor. Test the actual installed package before claiming a fork is supported.

## Publishing workflow

`.github/workflows/release.yml` offers `artifact`, `marketplace`, `open-vsx` and
`both`. It runs from `main`. Store uploads require successful editor CI at the
same source commit, licence documents and strict release checks.

For Microsoft Trusted Publishing, authorize:

| Field | Value |
|---|---|
| Repository owner | `gautham-nvidia` |
| Repository | `charmbits` |
| Workflow file | `release.yml` in `.github/workflows/` |
| Environment | None; this workflow does not declare a GitHub environment |

The workflow uses `vsce publish --oidc`; it does not need a persistent Marketplace
token in GitHub. Open VSX uses its separate `OVSX_PAT` secret. Configure the policy
in the publisher account; setting GitHub permissions alone does not prove ownership.

Start with the workflow's **artifact** destination. Review the listing, screenshots,
VSIX and SHA-256, then choose the intended store destination after the account setup
and accepted `main` checks are complete.

## Local compatibility checks

The actual CLIs, installed product files and disposable profiles were checked on **2026-11-18**:

| Installed host | Version found | Verification |
|---|---|---|
| Microsoft VS Code | 1.146.0 | All 15 development and nine public installed-VSIX scenarios passed. The private VSIX passed its 292-design catalogue, motion and reload check. |
| VSCodium | 1.143.17232 | All nine public installed-VSIX scenarios passed, including free access, pet reactions, bracelet styles, both pull directions and reload. |
| Cursor | 3.26.16 | The current 0.16 VSIX installed and its bundled code matched the candidate. This launch did not expose an automation connection; full runtime verification remains pending. |
| Devin | 3.14.30819; VS Code base 1.141.2 | The current 0.16 VSIX installed and its bundled code matched the candidate. The fresh profile reached the account screen after theme selection; full runtime verification remains pending. |

These observations supersede the earlier registry-only version lookup. No account
was used, owner profiles were not reused, and no login boundary was bypassed.
Installation alone does not establish full Cursor or Devin support. Finish their
functional checks in an authorized, signed-in profile before advertising that claim.

A real 0.15-to-0.16 upgrade in an owned VS Code profile preserved preferences,
the local photo and imported pack bytes, idempotent reimport, a paused focus
session, garden progress and a saved win. This rehearsal used synthetic data;
native paid-secret migration needs configured signing keys and was not exercised.

The test harness supports a vendor executable and CLI while keeping installations,
settings and imported data inside disposable profiles. The CLI path is explicit
because some vendors name or place it differently from VS Code.

**On the Windows PC (PowerShell), from `C:\dev\Lucky-Charms`:**

```powershell
$env:CHARMLET_TEST_HOST = "cursor"
$env:VSCODE_EXECUTABLE = "C:\Users\ganebajagane\AppData\Local\Programs\cursor\Cursor.exe"
$env:VSCODE_CLI_PATH = "C:\Users\ganebajagane\AppData\Local\Programs\cursor\resources\app\bin\cursor.cmd"
$env:CHARMLET_TEST_PACKAGED = "1"
npm.cmd --prefix extension run test:ui -- --grep "includes every released charm"
```

Use a fresh shell for another host so these test variables do not carry over.
The equivalent Devin paths are `...\Programs\Devin\Devin.exe` and
`...\Programs\Devin\bin\devin-desktop.cmd`; use the host label `devin`.
These checks do not install into the owner's normal editor profile.

Store publication, verified publisher ownership and current installed-package
results are recorded separately from package creation.

Gautham Anebajagane · TM · Operations
