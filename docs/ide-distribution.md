# IDE distribution

Microsoft Marketplace and Open VSX are separate registries. Publishing to
Microsoft alone does not create an Open VSX listing.

| Editor | Catalogue | Distribution path |
| --- | --- | --- |
| VS Code | Microsoft Marketplace | Public VSIX |
| Cursor | Cursor's Open VSX mirror | Publish to Open VSX, then verify the mirror |
| Devin Desktop | Open VSX mirror | Publish to Open VSX, then verify the mirror |
| VSCodium | Open VSX by default | Public VSIX |
| Eclipse Theia | Open VSX, depending on product configuration | Check the host's VS Code API compatibility |
| JetBrains IDEs | JetBrains Marketplace | Separate plugin implementation |
| Zed | Zed extensions | Separate extension API; a rich companion UI needs a feasibility review |

Catalogue availability does not prove runtime compatibility. Verify activation,
charm selection, saved state after reload, garden, focus and photo controls in
each advertised editor. A successful VSIX installation alone is insufficient.

## First Open VSX publication

1. Sign into Open VSX with the intended public GitHub identity. Link an Eclipse
   account and review and sign the Open VSX Publisher Agreement.
2. Create the namespace matching `extension/package.json`'s `publisher`.
   Follow Open VSX's namespace ownership process. A missing public namespace is
   not a reservation or proof that the requested name can be claimed.
3. Create an Open VSX access token and store it as the repository Actions secret
   `OVSX_PAT`. Keep the token out of source files and release descriptions.
4. After the reviewed source is on `main` and its required checks pass, run
   **Extension Release** with the exact package version, destination **open-vsx**
   and **open_vsx_auth: pat**.
5. Verify the published version and downloaded package, then check the editor
   catalogues. Mirrors can update separately from the upstream registry.

Use **open-vsx** when that version already exists on Microsoft Marketplace.
The **both** destination would attempt another Microsoft upload.

Changing the publisher changes the extension identifier. Confirm ownership and
test existing-user updates and saved-data migration before changing it. Keep
the existing listing and user data while that migration is being resolved.

## Later releases through Trusted Publishing

Open VSX requires an existing extension, namespace ownership and the active
Publisher Agreement before configuring its trusted publisher. Match the actual
GitHub repository and `release.yml` workflow; this workflow has no environment.

Once that registration is complete, choose **open_vsx_auth: oidc**. The workflow
requests a temporary GitHub identity token and runs `ovsx --trusted-publishing`;
it withholds `OVSX_PAT` in that mode. The release check rejects missing GitHub
identity-token context or a conflicting PAT.

Marketplace authentication is configured separately. Licence, artwork, package
identity, clean-source and successful-main-CI checks still apply. Passing the
local checks does not prove that the registry has accepted the publisher policy.
Retire the bootstrap token after a successful trusted release.

## References

- [Cursor's Open VSX transition](https://forum.cursor.com/t/extension-marketplace-changes-transition-to-openvsx/109138)
- [Devin Desktop extensions](https://docs.devin.ai/desktop/recommended-extensions)
- [Open VSX publishing](https://github.com/eclipse/openvsx/wiki/Publishing-Extensions)
- [Open VSX trusted publishing](https://github.com/eclipse/openvsx/wiki/Trusted-Publishing)
- [VSCodium catalogue](https://github.com/VSCodium/vscodium/blob/master/docs/extensions.md)
- [Theia extensions](https://theia-ide.org/docs/extensions/)
- [JetBrains tool windows](https://plugins.jetbrains.com/docs/intellij/tool-windows.html)
- [Zed extensions](https://zed.dev/docs/extensions/developing-extensions)
