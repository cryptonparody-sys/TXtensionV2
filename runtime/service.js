import { TXtensionConfig } from '../core/options.js';

const CONFIG_PROMISE = Promise.resolve(TXtensionConfig);

const STORAGE_KEY = 'txSettings';
const DEFAULT_MAX_TOKENS = 400;
const clone = (value) => (typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value)));

let keepAliveInterval = null;
let cachedConfig = null;

async function loadConfig() {
  if (!cachedConfig) {
    cachedConfig = await CONFIG_PROMISE;
  }
  return cachedConfig;
}

chrome.runtime.onInstalled.addListener(async (details) => {
  try {
    const config = await loadConfig();
    const { rawSettings } = await readSettings();
    const merged = mergeSettings(config, rawSettings);
    await chrome.storage.local.set({ [STORAGE_KEY]: merged });

    if (details.reason === 'install') {
      startKeepAlive();
      await chrome.tabs.create({
        url: chrome.runtime.getURL('about/index.html'),
        active: true
      });
    }
  } catch (error) {
    console.error('[TXtension] onInstalled error', error);
  }
});

chrome.runtime.onStartup.addListener(() => startKeepAlive());
chrome.runtime.onSuspend.addListener(() => stopKeepAlive());

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  const action = request.action || request.type;

  switch (action) {
    case 'getTxConfig':
      loadConfig()
        .then((config) => sendResponse({ success: true, config, settingsKey: STORAGE_KEY }))
        .catch((error) => sendResponse({ success: false, error: error?.message || 'Config unavailable' }));
      return true;
    case 'translateTweet':
      translateTweet(request)
        .then((translation) => sendResponse({ success: true, translation }))
        .catch((error) => sendResponse({ success: false, error: error?.message || 'Translation failed' }));
      return true;
    case 'translateDiscordMessage':
      translateDiscordMessage(request)
        .then((translation) => sendResponse({ success: true, translation }))
        .catch((error) => sendResponse({ success: false, error: error?.message || 'Translation failed' }));
      return true;
    case 'generateReply':
      generateReply(request)
        .then((reply) => sendResponse({ success: true, reply }))
        .catch((error) => sendResponse({ success: false, error: error?.message || 'Reply failed' }));
      return true;
    case 'generateDiscordReply':
      generateDiscordReply(request)
        .then((reply) => sendResponse({ success: true, reply }))
        .catch((error) => sendResponse({ success: false, error: error?.message || 'Reply failed' }));
      return true;
    case 'translateReplyDraft':
      translateReplyDraft(request)
        .then((translation) => sendResponse({ success: true, translation }))
        .catch((error) => sendResponse({ success: false, error: error?.message || 'Translation failed' }));
      return true;
    default:
      return false;
  }
});

async function translateTweet({ tweetContent, targetLanguage, toneId }) {
  const config = await loadConfig();
  const { rawSettings } = await readSettings();
  const settings = mergeSettings(config, rawSettings);

  const providerId = settings.provider;
  const providerSettings = settings.providerSettings[providerId] || {};
  const apiKey = (providerSettings.apiKey || '').trim();
  if (!providerId || !apiKey) {
    throw new Error('No provider credentials configured.');
  }

  const tone = config.tonePresets.find((preset) => preset.id === (toneId || settings.tonePreset)) || config.tonePresets[0];
  const languageCode = targetLanguage || settings.targetLanguage;
  const languageLabel = resolveLanguageLabel(config, languageCode, 'the selected language');

  const prompt = [
    `You are TXtension, an expert translator who always responds in ${languageLabel}.`,
    `Write entirely in ${languageLabel}; never switch languages or include transliterations from other scripts.`,
    `Use a smooth, conversational voice even for technical subjects. Keep explanations clear and natural, never stiff or academic.`,
    'Respect the natural writing direction of the requested language and keep the word order authentic to native speakers.',
    tone.prompt,
    `If the tweet already uses ${languageLabel}, rewrite it to match the requested style instead of apologising.`,
    `Return only the final text with no labels, headings, notes, or commentary. Do not mention that you are translating or summarising.`,
    tweetContent?.language ? `Detected source language: ${tweetContent.language}` : '',
    tweetContent?.author ? `Tweet author: ${tweetContent.author}` : '',
    `Tweet content:\n"""${tweetContent?.text || ''}"""`
  ]
    .filter(Boolean)
    .join('\n\n');

  await wait(Math.floor(120 + Math.random() * 220));

  const translation = await dispatchToProvider({
    providerId,
    providerSettings,
    prompt,
    config
  });

  return sanitizeOutput(translation);
}

async function translateDiscordMessage({ messageContent, targetLanguage, toneId }) {
  const config = await loadConfig();
  const { rawSettings } = await readSettings();
  const settings = mergeSettings(config, rawSettings);

  const providerId = settings.provider;
  const providerSettings = settings.providerSettings[providerId] || {};
  const apiKey = (providerSettings.apiKey || '').trim();
  if (!providerId || !apiKey) {
    throw new Error('No provider credentials configured.');
  }

  const tone = config.tonePresets.find((preset) => preset.id === (toneId || settings.tonePreset)) || config.tonePresets[0];
  const languageCode = targetLanguage || settings.targetLanguage;
  const languageLabel = resolveLanguageLabel(config, languageCode, 'the selected language');

  const prompt = [
    `You are TXtension, an expert translator drafting responses for Discord conversations. Always answer in ${languageLabel}.`,
    `Write entirely in ${languageLabel}; never switch languages or include transliterations from other scripts.`,
    `Use a smooth, conversational voice that feels natural in real chat threads—even for technical subjects. Keep terminology accurate but explain tricky ideas plainly.`,
    'Respect the natural writing direction of the requested language and keep the word order authentic to native speakers.',
    tone.prompt,
    messageContent?.language ? `Detected source language: ${messageContent.language}` : '',
    messageContent?.author ? `Message author: ${messageContent.author}` : '',
    `Message content:\n"""${messageContent?.text || ''}"""`,
    `Return only the translated message. Do not add headings, notes, emojis, markdown fences, or commentary.`
  ]
    .filter(Boolean)
    .join('\n\n');

  await wait(Math.floor(120 + Math.random() * 220));

  const translation = await dispatchToProvider({
    providerId,
    providerSettings,
    prompt,
    config
  });

  return sanitizeOutput(translation);
}

async function translateReplyDraft({ text, targetLanguage, sourceLanguage, context }) {
  const config = await loadConfig();
  const { rawSettings } = await readSettings();
  const settings = mergeSettings(config, rawSettings);

  const providerId = settings.provider;
  const providerSettings = settings.providerSettings[providerId] || {};
  const apiKey = (providerSettings.apiKey || '').trim();
  if (!providerId || !apiKey) {
    throw new Error('No provider credentials configured.');
  }

  const trimmed = (text || '').trim();
  if (!trimmed) {
    throw new Error('Write a reply first.');
  }

  const desiredLanguageCode = (targetLanguage || '').trim().toLowerCase() || settings.targetLanguage || 'en';
  const languageLabel = resolveLanguageLabel(config, desiredLanguageCode, 'the requested language');
  const sourceHint = (sourceLanguage || '').trim();

  const prompt = [
    `You are TXtension, a conversational translator preparing ${context === 'discord' ? 'Discord' : 'Twitter'} replies.`,
    `Translate the draft below into ${languageLabel} (${desiredLanguageCode}).`,
    sourceHint ? `The author likely wrote the draft in ${resolveLanguageLabel(config, sourceHint, sourceHint)}.` : '',
    'Keep the voice casual, fluid, and natural—avoid stiff, formal, or academic phrasing.',
    'Do not add ideas, emojis, hashtags, or commentary that do not exist in the draft.',
    'Avoid using hyphens, underscores, or decorative separators between words.',
    'Return only the translated reply text with no labels or surrounding quotes.',
    `Draft reply:\n"""${trimmed}"""`
  ]
    .filter(Boolean)
    .join('\n\n');

  await wait(Math.floor(120 + Math.random() * 220));

  const translation = await dispatchToProvider({
    providerId,
    providerSettings,
    prompt,
    config
  });

  return sanitizeOutput(translation);
}

async function generateReply({ tweetContent }) {
  const config = await loadConfig();
  const { rawSettings } = await readSettings();
  const settings = mergeSettings(config, rawSettings);

  const providerId = settings.provider;
  const providerSettings = settings.providerSettings[providerId] || {};
  const apiKey = (providerSettings.apiKey || '').trim();
  if (!providerId || !apiKey) {
    throw new Error('No provider credentials configured.');
  }

  const customPrompt = (settings.reply?.prompt || '').trim();
  if (!customPrompt) {
    throw new Error('Please first specify the prompt in the settings.');
  }

  const replyContext = (settings.reply?.context || '').trim();
  const avoidList = (settings.reply?.avoid || '').trim();
  const minWords = Number.isFinite(settings.reply?.minWords) ? Math.max(0, settings.reply.minWords) : 0;
  const maxWords = Number.isFinite(settings.reply?.maxWords) ? Math.max(0, settings.reply.maxWords) : 0;

  const prompt = [
    'You are RXtension, a personalised reply assistant.',
    'Determine the tweet’s language from the content and write the reply entirely in that language.',
    'If multiple languages appear, choose the one most prominent in the tweet and stay consistent.',
    replyContext ? `Project or topic context to respect:
${replyContext}` : '',
    'Follow the custom instructions verbatim:',
    customPrompt,
    avoidList ? `Never use the following words, phrases, or behaviours: ${avoidList}` : '',
    maxWords && minWords
      ? `Make the reply fall between ${minWords} and ${maxWords} words. Rewrite and condense ideas so the reply stays complete, natural, and fully meaningful without exceeding ${maxWords} words.`
      : maxWords
        ? `Keep the reply under ${maxWords} words. If needed, summarise and rephrase so the message stays complete, natural, and fully meaningful without exceeding the limit.`
        : minWords
          ? `Use at least ${minWords} words while keeping the reply natural and fully meaningful.`
          : '',
    tweetContent?.author ? `Tweet author: ${tweetContent.author}` : '',
    tweetContent?.authorDisplay ? `Display name: ${tweetContent.authorDisplay}` : '',
    `Tweet content:\n"""${tweetContent?.text || ''}"""`,
    'Return a single, ready-to-post reply. Exclude greetings, meta commentary, explanations, or surrounding quotes.'
  ]
    .filter(Boolean)
    .join('\n\n');

  await wait(Math.floor(120 + Math.random() * 220));

  const reply = await dispatchToProvider({
    providerId,
    providerSettings,
    prompt,
    config
  });

  return sanitizeOutput(reply);
}

async function generateDiscordReply({ messageContent }) {
  const config = await loadConfig();
  const { rawSettings } = await readSettings();
  const settings = mergeSettings(config, rawSettings);

  const discordSettings = settings.discordReply || {};
  const customPrompt = (discordSettings.prompt || '').trim();
  if (!customPrompt) {
    throw new Error('Please first specify the prompt in the settings.');
  }

  const avoidList = (discordSettings.avoid || '').trim();
  const minWordsDiscord = Number.isFinite(discordSettings.minWords) ? Math.max(0, discordSettings.minWords) : 0;
  const maxWordsDiscord = Number.isFinite(discordSettings.maxWords) ? Math.max(0, discordSettings.maxWords) : 0;
  const providerId = settings.provider;
  const providerSettings = settings.providerSettings[providerId] || {};
  const apiKey = (providerSettings.apiKey || '').trim();
  if (!providerId || !apiKey) {
    throw new Error('No provider credentials configured.');
  }

  const context = typeof discordSettings.context === 'string' ? discordSettings.context.trim() : '';

  const prompt = [
    'You are RD, a collaborative Discord co-pilot who drafts concise, natural replies.',
    'Determine the original message language from its content and write the reply entirely in that language.',
    'If the message mixes languages, reply in the language that dominates the message. Never switch to a different language or translate unless explicitly asked.',
    'Keep phrasing conversational and fluent—even for technical topics. Avoid stiff, academic, or overly formal language.',
    'Do not restate the original message word-for-word. Respond directly to the author with clear, helpful guidance.',
    context ? `Background context to respect:\n${context}` : '',
    'Custom reply guidance (follow these instructions exactly):',
    customPrompt,
    avoidList ? `Never use the following words, phrases, or behaviours: ${avoidList}` : '',
    maxWordsDiscord && minWordsDiscord
      ? `Make the reply fall between ${minWordsDiscord} and ${maxWordsDiscord} words. Rewrite and condense ideas so the reply stays complete, natural, and fully meaningful without exceeding ${maxWordsDiscord} words.`
      : maxWordsDiscord
        ? `Keep the reply under ${maxWordsDiscord} words. If needed, summarise and rephrase so the message stays complete, natural, and fully meaningful without exceeding the limit.`
        : minWordsDiscord
          ? `Use at least ${minWordsDiscord} words while keeping the reply natural and fully meaningful.`
          : '',
    messageContent?.author ? `Message author: ${messageContent.author}` : '',
    `Incoming message:\n"""${messageContent?.text || ''}"""`,
    'Return only the reply text. Do not add prefixes, suffixes, summaries, or markdown code fences.'
  ]
    .filter(Boolean)
    .join('\n\n');

  await wait(Math.floor(120 + Math.random() * 220));

  const reply = await dispatchToProvider({
    providerId,
    providerSettings,
    prompt,
    config
  });

  return sanitizeOutput(reply);
}

async function dispatchToProvider({ providerId, providerSettings, prompt, config }) {
  const catalog = config.providerCatalog;
  switch (providerId) {
    case 'openai':
      return callOpenAI({ providerSettings, prompt, catalog });
    case 'anthropic':
      return callAnthropic({ providerSettings, prompt, catalog });
    case 'gemini':
      return callGemini({ providerSettings, prompt, catalog });
    case 'deepseek':
      return callDeepSeek({ providerSettings, prompt, catalog });
    case 'openrouter':
      return callOpenRouter({ providerSettings, prompt, catalog });
    case 'custom':
      return callCustom({ providerSettings, prompt });
    default:
      throw new Error('Unsupported provider configured.');
  }
}

async function callOpenAI({ providerSettings, prompt, catalog }) {
  const entry = catalog.openai;
  const baseUrl = (providerSettings.baseUrl || entry.endpoint).replace(/\/$/, '');
  const response = await executeJson(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${providerSettings.apiKey}`
    },
    body: JSON.stringify({
      model: providerSettings.model || entry.defaultModel,
      messages: [{ role: 'user', content: prompt }],
      temperature: sanitizeNumber(providerSettings.temperature, 0.2),
      max_tokens: providerSettings.maxTokens || DEFAULT_MAX_TOKENS
    })
  });
  const content = response?.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenAI returned an empty response.');
  return content;
}

async function callAnthropic({ providerSettings, prompt, catalog }) {
  const entry = catalog.anthropic;
  const baseUrl = (providerSettings.baseUrl || entry.endpoint).replace(/\/$/, '');
  const response = await executeJson(`${baseUrl}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': providerSettings.apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: providerSettings.model || entry.defaultModel,
      max_tokens: providerSettings.maxTokens || DEFAULT_MAX_TOKENS,
      temperature: sanitizeNumber(providerSettings.temperature, 0.2),
      system: 'You are TXtension, a precise translation assistant.',
      messages: [{ role: 'user', content: prompt }]
    })
  });
  const content = response?.content?.[0]?.text;
  if (!content) throw new Error('Claude returned an empty response.');
  return content;
}

async function callGemini({ providerSettings, prompt, catalog }) {
  const entry = catalog.gemini;
  const baseUrl = (providerSettings.baseUrl || entry.endpoint).replace(/\/$/, '');
  const model = providerSettings.model || entry.defaultModel;
  const response = await executeJson(`${baseUrl}/models/${model}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': providerSettings.apiKey
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: sanitizeNumber(providerSettings.temperature, 0.2),
        maxOutputTokens: providerSettings.maxOutputTokens || providerSettings.maxTokens || DEFAULT_MAX_TOKENS
      }
    })
  });
  const content = response?.candidates?.[0]?.content?.parts?.map((part) => part.text).join('');
  if (!content) throw new Error('Gemini returned an empty response.');
  return content;
}

async function callDeepSeek({ providerSettings, prompt, catalog }) {
  const entry = catalog.deepseek;
  const baseUrl = (providerSettings.baseUrl || entry.endpoint).replace(/\/$/, '');
  const response = await executeJson(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${providerSettings.apiKey}`
    },
    body: JSON.stringify({
      model: providerSettings.model || entry.defaultModel,
      messages: [{ role: 'user', content: prompt }],
      temperature: sanitizeNumber(providerSettings.temperature, 0.2),
      max_tokens: providerSettings.maxTokens || DEFAULT_MAX_TOKENS
    })
  });
  const content = response?.choices?.[0]?.message?.content;
  if (!content) throw new Error('DeepSeek returned an empty response.');
  return content;
}

async function callOpenRouter({ providerSettings, prompt, catalog }) {
  const entry = catalog.openrouter;
  const baseUrl = (providerSettings.baseUrl || entry.endpoint).replace(/\/$/, '');
  const response = await executeJson(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${providerSettings.apiKey}`
    },
    body: JSON.stringify({
      model: providerSettings.model || entry.defaultModel,
      messages: [{ role: 'user', content: prompt }],
      temperature: sanitizeNumber(providerSettings.temperature, 0.2),
      max_tokens: providerSettings.maxTokens || DEFAULT_MAX_TOKENS
    })
  });
  const content = response?.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenRouter returned an empty response.');
  return content;
}

async function callCustom({ providerSettings, prompt }) {
  if (!providerSettings.baseUrl || !providerSettings.model) {
    throw new Error('Custom provider requires base URL and model.');
  }

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${providerSettings.apiKey}`
  };

  if (providerSettings.extraHeaders) {
    try {
      Object.assign(headers, JSON.parse(providerSettings.extraHeaders));
    } catch (error) {
      console.warn('[TXtension] Invalid custom headers JSON', error);
    }
  }

  const response = await executeJson(providerSettings.baseUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: providerSettings.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: sanitizeNumber(providerSettings.temperature, 0.2),
      max_tokens: providerSettings.maxTokens || DEFAULT_MAX_TOKENS
    })
  });

  const content =
    response?.choices?.[0]?.message?.content ??
    response?.output ??
    response?.response ??
    null;

  if (!content) {
    throw new Error('Custom provider returned an empty response.');
  }

  return content;
}

async function executeJson(url, options) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 32000);
  const response = await fetch(url, { ...options, signal: controller.signal });
  clearTimeout(timeout);

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const body = await response.clone().json();
      message = body?.error?.message || body?.message || message;
    } catch {
      message = await response.text();
    }
    throw new Error(message);
  }

  return response.json();
}

function sanitizeOutput(raw) {
  let content = Array.isArray(raw) ? raw.join('\n') : raw;
  if (typeof content !== 'string') {
    content = JSON.stringify(content);
  }
  return content.replace(/^[\s"']+|[\s"']+$/g, '').trim();
}

function resolveLanguageLabel(config, languageCode, fallbackLabel) {
  if (!languageCode) return fallbackLabel;
  return config.languages.find((lang) => lang.code === languageCode)?.label || languageCode.toUpperCase();
}

async function readSettings() {
  try {
    const { [STORAGE_KEY]: settings } = await chrome.storage.local.get([STORAGE_KEY]);
    return { rawSettings: settings || {} };
  } catch (error) {
    console.warn('[TXtension] Failed to read settings, using defaults', error);
    return { rawSettings: {} };
  }
}

function mergeSettings(config, raw = {}) {
  const merged = deepMerge(clone(config.defaultSettings), raw || {});
  if (!merged.providerSettings) {
    merged.providerSettings = clone(config.defaultSettings.providerSettings);
  }
  merged.reply = deepMerge(clone(config.defaultSettings.reply), merged.reply || {});
  merged.popupStyle = deepMerge(clone(config.defaultSettings.popupStyle), merged.popupStyle || {});
  merged.discordReply = deepMerge(clone(config.defaultSettings.discordReply), merged.discordReply || {});
  if (merged.discordReply && Object.prototype.hasOwnProperty.call(merged.discordReply, 'enabled')) {
    delete merged.discordReply.enabled;
  }
  return merged;
}

function deepMerge(target, source) {
  if (!source) return target;
  const output = Array.isArray(target) ? [...target] : { ...target };
  Object.keys(source).forEach((key) => {
    if (Array.isArray(source[key])) {
      output[key] = source[key].slice();
    } else if (source[key] && typeof source[key] === 'object') {
      output[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      output[key] = source[key];
    }
  });
  return output;
}

function sanitizeNumber(value, fallback) {
  const num = Number(value);
  return Number.isFinite(num) ? Math.min(Math.max(num, 0), 1) : fallback;
}

function startKeepAlive() {
  if (keepAliveInterval) return;
  keepAliveInterval = setInterval(() => {
    chrome.runtime.getPlatformInfo(() => undefined);
  }, 20000);
}

function stopKeepAlive() {
  if (!keepAliveInterval) return;
  clearInterval(keepAliveInterval);
  keepAliveInterval = null;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
