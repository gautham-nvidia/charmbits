# CharmBits: desktop payments and email setup

Gautham Anebajagane · TM · Operations

The **editor edition is completely free**, including all released charms and features
in compatible VS Code hosts. Installing it from a configured extension store needs
no email signup, payment account or trial. The steps below serve the **desktop
edition and optional marketing email**.

The desktop policy stays: 31 starter charms, 15 additional free claims, a 30-day
Pro trial, then an optional one-time Pro purchase and individual extras. The current
public collection has 227 designs. Saved photos, purchases and garden progress remain.
Code and local tests are ready; real account delivery and payment tests are still required.

## What the owner can do next

| Service | Next action | Result to retain |
|---|---|---|
| **Lemon Squeezy** | Continue merchant onboarding for **CharmBits**, using **https://charmbits.pages.dev/**. Complete identity, business and payout details directly in the account. | Merchant approval and store ID. If onboarding offers Stripe Managed Payments instead, confirm the actual product before proceeding: the connector uses the Lemon Squeezy API. |
| **Brevo** | Use the existing **getcharmlet@gmail.com** administration inbox. Create a list named **CharmBits — Confirmed Offers**. | Numeric list ID; keep the API key in the account until adding it as a Worker secret. |
| **Sending domain** | Authenticate a domain you own in Brevo, using the DNS records Brevo generates. Choose a sender on that domain and test replies to the support inbox. | Verified sender and authenticated domain. `pages.dev` is the website address, not a sender domain we control. A paid Google Workspace mailbox is optional. |
| **Cloudflare** | Keep the Pages website. Configure the separate access Worker, D1 database, private R2 bucket and managed Turnstile widget. | Worker/API address, D1 ID and public Turnstile site key. The existing configuration helper connects them. |

No customer addresses should be imported into the offers list without consent.
Download confirmation and offers subscription are separate: the download form's
offers box starts unchecked, and only a confirmed opt-in joins the list.

## Desktop checkout configuration

Use **USD, one-time purchases** and test mode first:

| Item | Setting |
|---|---|
| CharmBits Desktop Pro | Owner-selected **$7.49 launch / $17.49 regular** pricing; no subscription |
| Individual extras basket | The service calculates approved **$0.49 / $0.99 / $1.99** item prices; a 49¢ item requires another paid item |
| Checkout controls | Fixed quantity; no pay-what-you-want. Pro can accept an approved coupon; individual-item checkout keeps coupons off |
| Webhook | `<API address>/v1/webhooks/lemon`, subscribed to `order_created` and `order_refunded` |
| Public IDs | `LEMON_STORE_ID`, `LEMON_PRO_VARIANT_ID`, `LEMON_CART_VARIANT_ID`, `BREVO_LIST_ID` |
| Private credentials | Worker secrets `LEMON_API_KEY`, `LEMON_WEBHOOK_SECRET`, `BREVO_API_KEY`, `TURNSTILE_SECRET` |

Use the exact variant IDs supplied by the store. The browser does not determine
prices or grant access; the service verifies the signed payment notification.
Review the providers' current fees and account terms before enabling live checkout:
[Lemon Squeezy pricing](https://www.lemonsqueezy.com/pricing) and
[Brevo pricing](https://www.brevo.com/pricing/).

## Connect and rehearse

The implementation uses **Cloudflare Workers + D1 + private R2**, with Brevo for
email and Lemon Squeezy for checkout. Follow the current [service setup guide](../service/README.md)
for account login, public configuration, secret entry, deployment and archive staging.
Its commands are labelled for the Windows PC.

The configuration helper creates signing material under the owner's
`.charmlet-publisher` directory, outside the repository. Preserve that directory:
its stable email-hash secret links existing trials and purchases. Keep the existing
internal identifiers when connecting services.

Before opening the desktop signup or purchase flow:

1. Confirm email delivery using an address the owner controls. Verify that the link
   works once and the installer checksum matches the staged release.
2. Test offers both unchecked and checked. Only confirmed consent should add a
   Brevo contact. Check unsubscribe without removing app access.
3. Start and reload a desktop trial. Reusing the same address must retain the first
   deadline; it must not grant a fresh 30 days.
4. In payment test mode, check successful and declined payment, a discount,
   duplicate notifications and refund. Confirm that the buyer owns the granted item.
5. After the rehearsal, use the owner's account for the agreed small live purchase
   and refund. Release apps reject sandbox access files, so test/live boundaries matter.

Keep `CHECKOUT_ENABLED` and public `salesEnabled` off until those checks pass.
Keep the R2 bucket private. The live website and a successful local test are not
evidence that a real receipt, activation or paid download has worked.

The free editor release can proceed independently of this account setup.

Gautham Anebajagane · TM · Operations
