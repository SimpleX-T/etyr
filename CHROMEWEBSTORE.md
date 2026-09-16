# Chrome Web Store Listing — Etyr

> Last Updated: 2026-09-16

## Store Listing

**Extension Name** [REQUIRED]
Etyr

**Short Description** [REQUIRED]
Understand the web as you read it. A minimalist dictionary that appears when you select text.

**Detailed Description** [REQUIRED]
Etyr is a minimalist dictionary and reading companion that seamlessly integrates into your browsing experience to help you understand the web as you read it.

Whenever you come across an unfamiliar word, simply highlight it, and Etyr will instantly display its definition, pronunciation, synonyms, and antonyms in a beautiful, non-intrusive tooltip. It's designed to keep you in the flow of reading without breaking your focus. 

Key Features:
- Instant Definitions: Double-click or select any word to see its meaning instantly.
- AI Fallback: Encountered slang, a modern acronym, or an obscure term? Etyr uses an advanced AI search algorithm to define words not found in traditional dictionaries.
- New Tab Dashboard: Etyr replaces your new tab page with a beautiful, customizable dashboard that features your saved words, helping you build your vocabulary over time.
- Customization: Choose between a Playful Notebook or Dark Flashcard aesthetic.

How to use it:
1. Install Etyr and pin it to your browser toolbar.
2. Select any word on any webpage to see its definition instantly.
3. Click the bookmark icon in the tooltip to save the word for later.
4. Open a new tab to review your saved words and vocabulary history.

Your privacy is our priority. Etyr only processes the words you explicitly select and does not track your browsing history or personal data.

**Category** [REQUIRED]
Productivity

**Single Purpose** [REQUIRED]
Highlights and defines text selections on web pages instantly while helping users build their vocabulary.

**Primary Language** [REQUIRED]
English

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon [REQUIRED] | 128×128 PNG | ✅ Ready | `public/icons/icon-128.png` |
| Screenshot 1 [REQUIRED] | 1280×800 or 640×400 | ⬜ Not created | `screenshot-1.png` |
| Screenshot 2 [RECOMMENDED] | 1280×800 or 640×400 | ⬜ Not created | `screenshot-2.png` |
| Screenshot 3 [RECOMMENDED] | 1280×800 or 640×400 | ⬜ Not created | `screenshot-3.png` |
| Screenshot 4 | 1280×800 or 640×400 | ⬜ Not created | `screenshot-4.png` |
| Screenshot 5 | 1280×800 or 640×400 | ⬜ Not created | `screenshot-5.png` |
| Small Promo Tile [RECOMMENDED] | 440×280 | ⬜ Not created | `promo-small.png` |
| Marquee Promo Tile | 1400×560 | ⬜ Not created | `promo-marquee.png` |

### Screenshot Notes
- **Screenshot 1**: Show a user selecting a complex word on an article page, with the Etyr tooltip popping up showing the definition and synonyms.
- **Screenshot 2**: Show the New Tab page (Playful Notebook theme) displaying the user's saved words.
- **Screenshot 3**: Show the Etyr Options/Settings page demonstrating the AI model customization options.
- **Screenshot 4**: Show a user selecting a slang word with the AI Fallback ("✨ AI Definition") badge visible.

## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| `storage` | permissions | Used to save the user's vocabulary lists, dictionary search history, and extension settings (such as AI provider preferences and theme). |
| `https://freedictionaryapi.com/*` | host_permissions | Required to fetch standard dictionary definitions and phonetics for words selected by the user. |
| `https://router.huggingface.co/*` | host_permissions | Required to fetch advanced AI-generated definitions for slang, acronyms, or obscure terms when the primary dictionary API fails. |
| `https://generativelanguage.googleapis.com/*` | host_permissions | Required to fetch advanced AI-generated definitions using Google Gemini when configured by the user as their AI fallback provider. |

## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** Yes

| Data Type | Collected? | Transmitted Off-Device? | Purpose | Shared with Third Parties? |
|-----------|-----------|------------------------|---------|---------------------------|
| Personally identifiable info | No | No | | No |
| Health info | No | No | | No |
| Financial info | No | No | | No |
| Authentication info | No | No | | No |
| Personal communications | No | No | | No |
| Location | No | No | | No |
| Web history | No | No | | No |
| User activity | Yes | No | Tracks the user's saved words and search history locally for the New Tab dashboard. | No |
| Website content | Yes | Yes | The specific word highlighted by the user is transmitted to dictionary APIs to fetch its definition. | Yes (Free Dictionary API, Hugging Face, or Google Gemini) |

### Data Use Certification
- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

## Privacy Policy

**Privacy Policy URL** [REQUIRED]
[To be created and hosted on GitHub Pages or Notion]

## Distribution

**Visibility**: Public
**Regions**: All regions
**Pricing**: Free

## Developer Info

**Publisher Name** [REQUIRED]
[Your Name / Company]

**Contact Email** [REQUIRED]
[Your Email]

**Support URL / Email** [RECOMMENDED]
[Your GitHub Issues page or Email]

**Homepage URL** [RECOMMENDED]
[Your Website or GitHub Repo]

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 1.0.0 | 2026-09-16 | Initial release of Etyr | Draft |

## Review Notes

### Known Issues / Limitations
- Only triggers on text selection; does not automatically scan the page.
- AI Fallback relies on free-tier APIs and requires the user to agree to the respective provider's terms.
