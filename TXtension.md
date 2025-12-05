# TXtension

This document is ready to ship with your public GitHub release of TXtension.

## What is TXtension?

TXtension brings inline AI assistance to both Twitter / X and Discord. A compact `TX` button beneath every tweet delivers smooth, tone-aware translations in your target language. The matching `RX` button drafts a reply using the personal prompt you save. When you enable Discord Reply, each Discord message gains an `RD` button that opens the same popup to craft project-aware responses. All prompts, settings, and API keys stay on the device inside `chrome.storage.local`.

## Installation

1. Download or clone this repository.
2. Open Chrome and go to `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked** and pick the `txtension-extension` folder.
5. Launch the TX toolbar icon to open the control panel and finish setup.

## Control Panel Overview

- **Overview** – Quick project recap framed by the refreshed glassmorphism dashboard.
- **Workspace** – Choose the default translation language, enable or disable popup pinning and auto-copy, and pick a popup theme.
- **Reply** – Save the RX prompt, maintain an avoid list, and decide whether drafted replies should land on the clipboard automatically.
- **Discord Reply** – Add long-form context, define the Discord prompt, capture an avoid list, and manage auto-copy. Discord translations reuse your Workspace tone and language defaults.
- **Tone Studio** – Select one of four presets (Simple, Professional, Comprehensive, Point) to influence the translator’s voice while keeping the output relaxed and conversational.
- **Integrations** – Configure OpenAI, Anthropic, Gemini, DeepSeek, OpenRouter, or any OpenAI-compatible REST endpoint. Credentials never leave local storage.

## Using the TX and RX Buttons on Twitter / X

1. Configure a provider and save your defaults in the control panel.
1. Visit Twitter / X; `TX` and `RX` appear beside the native tweet actions.
1. Click `TX` to translate the tweet. The popup honours writing direction automatically and keeps words in the right order for right-to-left scripts such as Persian.
1. Use the “Your Reply” composer beneath the translation to draft in your language and translate it back to the tweet’s language with one click, staying inside your saved word-count range.
1. Click `RX` to draft a reply using your prompt and the tweet’s detected language. If no prompt is saved, TXtension reminds you to add one before sending any request.
1. Hover the popup to keep it open. When pin mode is disabled, it fades out 10 seconds after you move away; when pin mode is enabled, it stays until you dismiss it or open another card.

## Using the TD and RD Buttons on Discord

1. Open **Discord Reply** in the control panel and provide optional project context plus the reply prompt. Translation relies on your Workspace tone and language defaults.
1. Browse Discord in Chrome. Each message gains `TD` (translate) and `RD` (reply) buttons tucked beneath the message group.
1. Click `TD` to translate the message into your configured language with the active tone preset. Use the “Your Reply” composer to translate your drafted response back into the message’s language instantly and within your word-count bounds.
1. Click `RD` to open the inline reply popup that blends your context, avoid list, word limits, and prompt with the message text, responding in the message’s own language automatically.
1. Keep the popup hovered to leave it on-screen. With pin mode disabled it fades out after 10 seconds once your mouse leaves both the card and the original message.
1. Copy the generated output—auto-copy follows your toggles for translations (Workspace) and replies (Discord Reply)—then paste it into Discord.

## Privacy & Storage

- Tweet and Discord message text is processed transiently in memory.
- Prompts, API keys, and preferences are stored locally in `chrome.storage.local`.
- All requests go directly to the AI provider endpoints you configure—no proxy relays or analytics layers.

## Contact

- GitHub: https://github.com/cryptonparody-sys
- Telegram: https://t.me/itscryptools
- Email: cryptonparody@gmail.com

Fork it, rebrand it, or ship your own variant—TXtension is built to be customised.
