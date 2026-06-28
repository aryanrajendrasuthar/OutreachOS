# OutreachOS — LinkedIn Compliance Guide

## Disclaimer

OutreachOS is a tool that automates interactions on LinkedIn. Users are solely responsible for ensuring their use complies with LinkedIn's Terms of Service, User Agreement, and applicable laws. The existence of a technical capability in OutreachOS does not imply authorization to use it in violation of any agreement.

---

## Relevant LinkedIn Terms of Service

LinkedIn's User Agreement (as of 2026) prohibits:

1. **Scraping** — "You agree that you will not: ... scrape LinkedIn or use other automated means to access LinkedIn for any purpose..."
2. **Automated messages** — Sending automated or bulk messages without prior consent
3. **Fake personas** — Creating fake accounts or misrepresenting identity
4. **Exceeding rate limits** — Sending volumes of requests that overload LinkedIn's infrastructure

Source: [LinkedIn User Agreement](https://www.linkedin.com/legal/user-agreement)

---

## What OutreachOS Does to Minimize Risk

| Risk | Mitigation |
|------|------------|
| High volume connection spam | Daily cap (default: 20/day, user-configurable) |
| Bot detection | Playwright stealth plugin, randomized viewport, human-like mouse movement |
| Suspicious send timing | Randomized 90–480 second delay between each action |
| Identical messages | AI-personalized content for each prospect |
| Headless browser detection | `headless: false` in production (requires virtual display / Xvfb) |
| Session abuse | Encrypted session cookies stored per-user; never shared |

---

## User Responsibilities

By using OutreachOS, you agree to:

1. **Own or have authorization** to use the LinkedIn account whose session cookie you provide
2. **Not exceed LinkedIn's acceptable use limits** — 20 connection requests/day is conservative; adjust downward if you receive warnings
3. **Not scrape private or restricted profile data** — OutreachOS only reads publicly visible profile fields
4. **Review all AI-generated messages before sending** — enable HITL mode to approve every message
5. **Comply with GDPR/CCPA** if you are collecting or processing personal data of EU/California residents
6. **Not use OutreachOS** for spam, phishing, harassment, or any illegal purpose

---

## Recommendations

- **Use LinkedIn's official APIs** where available (LinkedIn Marketing Developer Platform, LinkedIn Talent Solutions API) — these are the compliant path for enterprise use cases
- **Keep daily caps low** (10–15/day) if your account is new or has received past warnings
- **Enable HITL mode** — review every message before it goes out
- **Monitor your account** — if LinkedIn sends warnings, pause OutreachOS immediately
- **Consult a lawyer** if you are building a commercial product on top of OutreachOS
