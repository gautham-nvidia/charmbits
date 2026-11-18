# Five-stock charm: proposed design and data decision

Gautham Anebajagane · TM · Operations

Research checked on 2026-11-16. This is a prepared feature design; stock quotes are
not enabled in the 0.16 release.

The charm would let someone choose up to five stock symbols, then see each price,
daily change and a small intraday chart. The quote's time, exchange, currency and
delay must remain visible. A market that is closed, an old quote and an unavailable
connection need distinct states. No fabricated prices, simulated market trends or
buy/sell recommendations belong in the live display.

## Recommended release decision

Keep the first fully free editor release independent of a paid stock feed.
The checked free API plans do not establish permission to distribute a native
quote display. A delayed TradingView web panel is a possible separate option;
its terms and embedding conditions still need checking for the chosen integration.
Do not describe that option as real-time stock data.

| Source checked | What the official source says | Consequence |
|---|---|---|
| [Twelve Data pricing](https://twelvedata.com/pricing-business) | Basic is $0 with 8 API credits and 800 requests/day, marked **internal non-display**. Venture lists **$499/month**, external display access and real-time US stocks. Enterprise lists $1,099/month and external distribution; a US-equity distribution add-on starts at $2,400/year. | A free key is not an app-distribution licence. The exact display/distribution rights and exchange costs need written confirmation before selecting a plan. |
| [Twelve Data terms, section 2](https://twelvedata.com/terms) | External display/redistribution requires the applicable tier, add-on or written agreement; non-display means data not shown to natural persons. | Do not share an internal/personal key behind the app or infer permission from a working endpoint. |
| [Finnhub pricing](https://finnhub.io/pricing) | The $0 plan offers 60 calls/minute and marks its licence **Personal Use. Terms apply**. The displayed paid All-In-One plan also says Personal Use. | No commercial/native redistribution right was verified. A separate quote and permission would be needed. |
| [TradingView widget data FAQ](https://www.tradingview.com/widget-docs/faq/data/) | Stock widgets stream delayed data under exchange rules; upgrading a TradingView account does not make the website widget real-time. Widget data cannot be exported/downloaded, and there is no quote-data API. | A hosted widget is a different presentation. Do not extract its data for a custom native charm. |
| [TradingView general FAQ](https://www.tradingview.com/widget-docs/faq/general/) | Attribution/branding changes require contacting TradingView. Widgets report the embedding URL, symbol, widget type and IP address; the FAQ says they set no cookies. | Preserve required attribution and explain the external connection if that option is chosen. |

These prices describe the specific published plans, not a universal minimum price
for market data. No subscription, provider account, message to sales or purchase
has been made.

## Reviewable implementation scope

1. **Choose five:** an initially empty, editable list with exchange-qualified symbols,
   duplicate checks and a five-symbol maximum. Example symbols such as NVDA or AAPL
   are examples only, not the owner's selected investments.
2. **Connect deliberately:** show the provider, cost/access requirement, coverage and
   expected delay before enabling requests. Store a user's key in native secret
   storage if the chosen provider permits that model; never bundle a shared key.
3. **Show facts:** price, daily absolute/percentage change, chart, observed time,
   currency, venue and market session. Use text and signs alongside colours.
4. **Handle interruptions:** bound responses and retries, pause when hidden, cancel
   superseded requests, retain an explicitly dated old quote, and handle weekends,
   holidays, timezones, missing symbols and provider limits.
5. **Keep the release honest:** only advertise real-time service after its entitlement,
   exchange coverage and actual update behavior have been verified. Keep historical
   charts and any market index benchmark within the licensed data scope.

The remaining product choice is between a delayed external web panel and funding
a licensed native display. That choice is separate from the free editor's core
features and the existing desktop Pro/pet purchases.

---

Gautham Anebajagane · TM · Operations
