# CharmBits privacy

Updated 2026-11-16.

CharmBits' extension runs locally. It does not send your source code, focus notes, garden progress or imported artwork to a CharmBits server. It does not include analytics, advertising or an account requirement.

## Data on your device

The extension saves your chosen charm, cord choices, appearance and motion preferences, message preferences, optional focus intention, timer state, small-win notes and counts, reminder settings, watering dates and earned flowers in your editor's extension storage. Cali's optional name, encouragement and focus-prompt preferences are stored there too. Imported charm packs are copied to that storage so they keep working offline and survive extension updates.

The in-app **Photo charms** panel processes the image you choose in memory. It saves only the cropped, framed 216-by-252-pixel PNG and the keepsake name you enter, in a local charm pack. The original file and its embedded metadata are not retained. No photo is uploaded. Closing the editor before saving discards the draft.

The live companions' gaze responds only to pointer coordinates in the CharmBits view. Their gaze and expressions do not use a camera, microphone, face recognition or a network service. Cali's text comes from installed messages and your local focus/win state; it is not sent to a chat service. Nimbus's optional weather connection is described below.

CharmBits reads the pack file you explicitly choose to import. It does not scan workspace files or send editor contents to an AI model. Its built-in facts, trivia, motivational messages and artwork are installed resources. AI-generated review artwork was prepared during development; displaying it does not make an AI request.

Storage is local, not a cross-device sync service. Your operating system, editor profile backup or device backup may copy these files according to your own settings. Treat optional focus notes and personal-photo packs as personal data.

## Network activity

All features and released charms work without an activation account in VS Code and compatible extension hosts. The extension does not poll the purchase service. Previously imported signed grants remain in the editor's secret storage for compatibility; they are not needed to unlock this release.

**Nimbus weather is off by default.** If you enable it in Appearance, you choose a US airport station and Fahrenheit or Celsius. Those preferences stay in the app's local `weather.json`. While CharmBits is visible, its host checks `api.weather.gov` about every ten minutes for that station's latest observation. The request includes the station identifier and a public application identifier; the National Weather Service also receives the connection IP address. No GPS, workspace data, photos, email, focus notes or garden history are sent.

Weather readings are kept in memory, with their observation time displayed separately from the request time. Older or unavailable data is labelled. Turning weather off or hiding the view cancels active requests and stops scheduled checks. The source button opens the fixed National Weather Service website in your browser. See the [National Weather Service privacy policy](https://www.weather.gov/privacy).

The separate standalone desktop app verifies signed trial or purchase grants and stores them in its encrypted access store. These grants contain a keyed account identifier, rights and issuance/trial dates, not an email address. When an access service is configured, activated desktop apps can send their grant to refresh purchases, trial status and refunds. Photos, workspace files, focus notes, garden progress and Cali's optional name are not sent. Signed purchases remain usable offline from their last confirmed access.

The website's review-download flow separately verifies an email address using Cloudflare/Turnstile and Brevo. Marketplace installation does not require that signup. Optional offers require a separate choice. Checkout is handled by Lemon Squeezy; payment-card details do not pass through the app or CharmBits' access service. The service retains a keyed email identity, trial deadline and ownership/consent records; its website privacy page describes the flow. Live delivery and checkout are disabled in this candidate's checked-in settings.

Choosing **Read source** opens the cited website in your normal browser. Downloading the extension or extra artwork visits the host or extension store you selected. Those services have their own privacy policies. Editor-provided update checks and telemetry are controlled by the editor, not by CharmBits.

Store/detail pages and README screenshots may load images hosted on GitHub. The running CharmBits view uses its installed or imported artwork and does not need those listing images.

The optional website Photo Studio is separate and unavailable by default. Its prepared workflow processes a selected photo in browser memory; only licence/session requests reach its server. A downloaded personal-photo pack contains the image and name you selected, so sharing the pack shares that content. Live merchant access has not been enabled.

## Removing data

Use **CharmBits: Remove Charm Pack** to remove an imported pack, or remove a keepsake in **Photo charms**. **Focus > Small wins > Clear history** removes saved win notes and counts. **Reset Charm** resets appearance; it does not erase garden progress.

Clear Cali's optional name under **Focus > Cali's encouragement**, then save preferences to remove it from the current local state. The same panel turns encouragement and focus prompts off.

Removing an app or its local preferences does not restart or erase the service's trial and purchase records. Use the contact on the published website's privacy page for requests about those records; do not post email links or activation files in a public issue.

To remove all extension data, first back up any packs or progress you want to keep, close the editor, and remove only CharmBits' `gautham-nvidia.charmlet` directory from that editor profile's `User/globalStorage` folder. That compatibility identifier retains the previous name so upgrades can use the same saved data. Editor profiles and forks can use different locations. Uninstalling an extension may leave its saved storage behind.

The standalone desktop beta uses its own storage and is independent of the IDE extension. Removing extension data does not remove desktop progress.

## Questions

[Open a CharmBits issue](https://github.com/gautham-nvidia/charmbits/issues) for privacy questions. Do not attach private photos, licence keys, focus notes, credentials or workspace contents to a public issue.
