import { TXtensionConfig } from '../core/options.js';

const STORAGE_KEY = 'txSettings';
const clone = (value) => (typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value)));

const state = {
  settings: clone(TXtensionConfig.defaultSettings),
  tonePresets: TXtensionConfig.tonePresets,
  providerCatalog: TXtensionConfig.providerCatalog,
  toneTemplate: null,
  providerTemplate: null,
  providerForms: new Map()
};

document.addEventListener('DOMContentLoaded', async () => {
  cacheTemplates();
  wireTabs();
  await hydrateSettings();
  renderOverview();
  renderWorkspace();
  renderReplySettings();
  renderDiscordSettings();
  renderTones();
  renderProviders();
  bindActions();
});

function cacheTemplates() {
  state.toneTemplate = document.getElementById('toneTemplate');
  state.providerTemplate = document.getElementById('providerTemplate');
}

async function hydrateSettings() {
  try {
    const { [STORAGE_KEY]: saved } = await chrome.storage.local.get([STORAGE_KEY]);
    if (saved && typeof saved === 'object') {
      state.settings = deepMerge(clone(TXtensionConfig.defaultSettings), saved);
    } else {
      state.settings = clone(TXtensionConfig.defaultSettings);
    }
  } catch (error) {
    console.error('[TXtension] Failed to load settings', error);
    state.settings = clone(TXtensionConfig.defaultSettings);
  }
  if (!state.settings.reply) {
    state.settings.reply = clone(TXtensionConfig.defaultSettings.reply);
  } else {
    state.settings.reply = deepMerge(clone(TXtensionConfig.defaultSettings.reply), state.settings.reply);
  }
  enforceWordBounds(state.settings.reply, TXtensionConfig.defaultSettings.reply);
  if (!state.settings.popupStyle) {
    state.settings.popupStyle = clone(TXtensionConfig.defaultSettings.popupStyle);
  } else {
    state.settings.popupStyle = deepMerge(clone(TXtensionConfig.defaultSettings.popupStyle), state.settings.popupStyle);
  }
  if (!state.settings.discordReply) {
    state.settings.discordReply = clone(TXtensionConfig.defaultSettings.discordReply);
  } else {
    state.settings.discordReply = deepMerge(clone(TXtensionConfig.defaultSettings.discordReply), state.settings.discordReply);
  }
  enforceWordBounds(state.settings.discordReply, TXtensionConfig.defaultSettings.discordReply);
  if (state.settings.discordReply && Object.prototype.hasOwnProperty.call(state.settings.discordReply, 'enabled')) {
    delete state.settings.discordReply.enabled;
  }
  updateHeaderSummary();
}

function renderOverview() {
  const linkNodes = document.querySelectorAll('[data-social-link]');
  linkNodes.forEach((node) => {
    const key = node.dataset.socialLink;
    node.href = TXtensionConfig.branding.socials[key] || '#';
  });
}

function renderWorkspace() {
  const languageSelect = document.getElementById('languageSelect');
  languageSelect.innerHTML = '';
  TXtensionConfig.languages.forEach((lang) => {
    const option = document.createElement('option');
    option.value = lang.code;
    option.textContent = lang.label;
    languageSelect.appendChild(option);
  });
  languageSelect.value = state.settings.targetLanguage;

  document.getElementById('pinWindow').checked = !!state.settings.pinWindow;
  document.getElementById('autoCopy').checked = !!state.settings.autoCopy;

  prepareAppearanceDefaults();
  renderAppearanceControls();
}

function prepareAppearanceDefaults() {
  const themes = TXtensionConfig.popupThemes || [];
  state.settings.popupStyle = state.settings.popupStyle || {};
  const desiredTheme = state.settings.popupStyle.theme;
  const themeExists = themes.some((theme) => theme.id === desiredTheme);
  state.settings.popupStyle.theme = themeExists ? desiredTheme : themes[0]?.id || 'noir';
}

function renderAppearanceControls() {
  const container = document.getElementById('themeOptions');
  if (!container) return;
  container.innerHTML = '';
  const themes = TXtensionConfig.popupThemes || [];
  const current = state.settings.popupStyle?.theme;

  themes.forEach((theme) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tx-appearance-btn';
    button.dataset.value = theme.id;
    button.setAttribute('role', 'option');
    if (theme.id === current) {
      button.classList.add('active');
      button.setAttribute('aria-pressed', 'true');
    } else {
      button.setAttribute('aria-pressed', 'false');
    }

    const swatch = document.createElement('span');
    swatch.className = 'tx-appearance-swatch';
    swatch.style.setProperty('--tx-swatch-bg', theme.background || '#111827');
    swatch.style.setProperty('--tx-swatch-border', theme.border || 'rgba(255, 255, 255, 0.08)');

    const label = document.createElement('span');
    label.className = 'tx-appearance-meta';
    label.textContent = theme.label;

    button.appendChild(swatch);
    button.appendChild(label);
    button.addEventListener('click', () => {
      state.settings.popupStyle.theme = theme.id;
      persistSettings();
      renderAppearanceControls();
    });

    container.appendChild(button);
  });
}

function renderReplySettings() {
  const replyPromptField = document.getElementById('replyPrompt');
  if (replyPromptField) {
    if (TXtensionConfig.reply?.placeholder) {
      replyPromptField.placeholder = TXtensionConfig.reply.placeholder;
    }
    replyPromptField.value = state.settings.reply?.prompt || '';
  }
  const replyContextField = document.getElementById('replyContext');
  if (replyContextField) {
    replyContextField.value = state.settings.reply?.context || '';
  }
  const replyAvoidField = document.getElementById('replyAvoid');
  if (replyAvoidField) {
    replyAvoidField.value = state.settings.reply?.avoid || '';
  }
  const replyMinField = document.getElementById('replyMinWords');
  if (replyMinField) {
    replyMinField.value = Number.isFinite(state.settings.reply?.minWords) ? state.settings.reply.minWords : '';
  }
  const replyMaxField = document.getElementById('replyMaxWords');
  if (replyMaxField) {
    replyMaxField.value = Number.isFinite(state.settings.reply?.maxWords) ? state.settings.reply.maxWords : '';
  }
  const replyAutoCopyToggle = document.getElementById('replyAutoCopy');
  if (replyAutoCopyToggle) {
    replyAutoCopyToggle.checked = !!state.settings.reply?.autoCopy;
  }
}

function renderDiscordSettings() {
  const contextField = document.getElementById('discordReplyContext');
  if (contextField) {
    const placeholder = TXtensionConfig.discordReply?.contextPlaceholder;
    if (placeholder) contextField.placeholder = placeholder;
    contextField.value = state.settings.discordReply?.context || '';
  }

  const promptField = document.getElementById('discordReplyPrompt');
  if (promptField) {
    const placeholder = TXtensionConfig.discordReply?.promptPlaceholder;
    if (placeholder) promptField.placeholder = placeholder;
    promptField.value = state.settings.discordReply?.prompt || '';
  }

  const avoidField = document.getElementById('discordReplyAvoid');
  if (avoidField) {
    avoidField.value = state.settings.discordReply?.avoid || '';
  }
  const minField = document.getElementById('discordReplyMinWords');
  if (minField) {
    minField.value = Number.isFinite(state.settings.discordReply?.minWords) ? state.settings.discordReply.minWords : '';
  }
  const maxField = document.getElementById('discordReplyMaxWords');
  if (maxField) {
    maxField.value = Number.isFinite(state.settings.discordReply?.maxWords) ? state.settings.discordReply.maxWords : '';
  }

  const autoCopyToggle = document.getElementById('discordReplyAutoCopy');
  if (autoCopyToggle) {
    autoCopyToggle.checked = !!state.settings.discordReply?.autoCopy;
  }
}

function renderTones() {
  const list = document.getElementById('toneList');
  list.innerHTML = '';
  state.tonePresets.forEach((preset) => {
    const node = state.toneTemplate.content.firstElementChild.cloneNode(true);
    node.dataset.toneId = preset.id;
    node.querySelector('.tx-tone-name').textContent = preset.label;
    node.querySelector('.tx-tone-description').textContent = preset.description;
    if (state.settings.tonePreset === preset.id) {
      node.classList.add('active');
    }
    node.addEventListener('click', async () => {
      state.settings.tonePreset = preset.id;
      renderTones();
      await persistSettings();
    });
    list.appendChild(node);
  });
}

function renderProviders() {
  const select = document.getElementById('providerSelect');
  const container = document.getElementById('providerForms');
  select.innerHTML = '';
  container.innerHTML = '';
  state.providerForms.clear();

  Object.values(state.providerCatalog).forEach((provider) => {
    const option = document.createElement('option');
    option.value = provider.id;
    option.textContent = provider.label;
    select.appendChild(option);

    const form = buildProviderForm(provider);
    container.appendChild(form);
    state.providerForms.set(provider.id, form);
  });

  select.value = state.settings.provider;
  updateProviderVisibility(state.settings.provider);
  select.addEventListener('change', async (event) => {
    state.settings.provider = event.target.value;
    updateProviderVisibility(event.target.value);
    updateHeaderSummary();
    await persistSettings();
  });
}

function buildProviderForm(provider) {
  const form = state.providerTemplate.content.firstElementChild.cloneNode(true);
  form.dataset.provider = provider.id;
  form.querySelector('.tx-provider-title').textContent = provider.label;
  form.querySelector('.tx-provider-description').textContent = provider.endpoint
    ? `Endpoint: ${provider.endpoint}`
    : 'Bring your own OpenAI-compatible endpoint.';

  const settings = state.settings.providerSettings[provider.id] || {};
  form.querySelector('[data-field="apiKey"]').value = settings.apiKey || '';
  form.querySelector('[data-field="model"]').value = settings.model || provider.defaultModel || '';
  form.querySelector('[data-field="baseUrl"]').value = settings.baseUrl || provider.endpoint || '';
  form.querySelector('[data-field="temperature"]').value = settings.temperature ?? 0.2;
  form.querySelector('[data-field="maxTokens"]').value = settings.maxTokens ?? settings.maxOutputTokens ?? 400;

  const extra = form.querySelector('.tx-extra');
  extra.innerHTML = '';
  if (provider.id === 'custom') {
    extra.appendChild(buildInputField('Friendly label', 'label', settings.label || ''));
    extra.appendChild(
      buildInputField(
        'Extra headers (JSON)',
        'extraHeaders',
        settings.extraHeaders || '',
        'text',
        'Optional header map merged into requests.'
      )
    );
  }

  return form;
}

function buildInputField(label, field, value, type = 'text', hint = '') {
  const wrapper = document.createElement('label');
  wrapper.className = 'tx-field';
  const span = document.createElement('span');
  span.className = 'tx-label';
  span.textContent = label;
  const input = document.createElement('input');
  input.type = type;
  input.value = value;
  input.dataset.field = field;
  wrapper.appendChild(span);
  wrapper.appendChild(input);
  if (hint) {
    const help = document.createElement('span');
    help.className = 'tx-help';
    help.textContent = hint;
    wrapper.appendChild(help);
  }
  return wrapper;
}

function bindActions() {
  document.getElementById('workspaceForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    state.settings.targetLanguage = document.getElementById('languageSelect').value;
    state.settings.pinWindow = document.getElementById('pinWindow').checked;
    state.settings.autoCopy = document.getElementById('autoCopy').checked;
    await persistSettings();
    flashButton(event.submitter);
  });

  const replyForm = document.getElementById('replyForm');
  if (replyForm) {
    replyForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      state.settings.reply = state.settings.reply || {};
      state.settings.reply.prompt = document.getElementById('replyPrompt').value.trim();
      state.settings.reply.context = document.getElementById('replyContext').value.trim();
      state.settings.reply.avoid = document.getElementById('replyAvoid').value.trim();
      state.settings.reply.minWords = normalizeWordCount(document.getElementById('replyMinWords').value);
      state.settings.reply.maxWords = normalizeWordCount(document.getElementById('replyMaxWords').value);
      enforceWordBounds(state.settings.reply, TXtensionConfig.defaultSettings.reply);
      state.settings.reply.autoCopy = document.getElementById('replyAutoCopy').checked;
      await persistSettings();
      renderReplySettings();
      flashButton(event.submitter);
    });
  }

  const discordForm = document.getElementById('discordForm');
  if (discordForm) {
    discordForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      state.settings.discordReply = state.settings.discordReply || {};
      state.settings.discordReply.context = document.getElementById('discordReplyContext').value.trim();
      state.settings.discordReply.prompt = document.getElementById('discordReplyPrompt').value.trim();
      state.settings.discordReply.avoid = document.getElementById('discordReplyAvoid').value.trim();
      state.settings.discordReply.minWords = normalizeWordCount(document.getElementById('discordReplyMinWords').value);
      state.settings.discordReply.maxWords = normalizeWordCount(document.getElementById('discordReplyMaxWords').value);
      enforceWordBounds(state.settings.discordReply, TXtensionConfig.defaultSettings.discordReply);
      state.settings.discordReply.autoCopy = document.getElementById('discordReplyAutoCopy').checked;
      await persistSettings();
      renderDiscordSettings();
      flashButton(event.submitter);
    });
  }

  document.getElementById('saveProviders').addEventListener('click', async () => {
    state.providerForms.forEach((form, providerId) => {
      const inputs = form.querySelectorAll('[data-field]');
      const snapshot = { ...(state.settings.providerSettings[providerId] || {}) };
      inputs.forEach((input) => {
        let value = input.value;
        if (input.type === 'number') {
          value = Number(value);
        }
        snapshot[input.dataset.field] = value;
      });
      state.settings.providerSettings[providerId] = snapshot;
    });

    await persistSettings();
    updateHeaderSummary();
    flashButton(document.getElementById('saveProviders'));
  });
}

function updateProviderVisibility(activeId) {
  state.providerForms.forEach((form, id) => {
    form.style.display = id === activeId ? 'flex' : 'none';
  });
}

async function persistSettings() {
  await chrome.storage.local.set({ [STORAGE_KEY]: state.settings });
}

function wireTabs() {
  const tabs = document.querySelectorAll('.tx-tab');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((other) => {
        other.classList.toggle('active', other === tab);
        other.setAttribute('aria-selected', other === tab);
      });
      document.querySelectorAll('.tx-panel').forEach((panel) => {
        panel.classList.toggle('active', panel.id === tab.dataset.tab);
      });
    });
  });
}

function updateHeaderSummary() {
  const provider = state.providerCatalog[state.settings.provider];
  const providerSettings = state.settings.providerSettings[state.settings.provider] || {};
  document.getElementById('providerLabel').textContent = `Provider: ${provider?.label || '—'}`;
  document.getElementById('modelLabel').textContent = `Model: ${providerSettings.model || provider?.defaultModel || '—'}`;
}

function flashButton(button) {
  if (!button) return;
  const original = button.textContent;
  button.textContent = 'Saved ✓';
  button.disabled = true;
  setTimeout(() => {
    button.textContent = original;
    button.disabled = false;
  }, 1400);
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

function normalizeWordCount(value) {
  if (value === '' || value === null || value === undefined) return 0;
  const num = Math.floor(Number(value));
  if (!Number.isFinite(num) || num <= 0) return 0;
  return Math.min(250, num);
}

function enforceWordBounds(config, defaults = {}) {
  if (!config) return;
  const clamp = (input) => {
    if (!Number.isFinite(input) || input <= 0) return 0;
    return Math.min(250, Math.max(1, Math.floor(input)));
  };
  config.minWords = clamp(config.minWords);
  config.maxWords = clamp(config.maxWords);
  if (!config.minWords && !config.maxWords) {
    const fallbackMin = clamp(defaults?.minWords);
    const fallbackMax = clamp(defaults?.maxWords);
    config.minWords = fallbackMin;
    config.maxWords = fallbackMax;
  }
  if (config.minWords && config.maxWords && config.minWords > config.maxWords) {
    const swap = config.minWords;
    config.minWords = config.maxWords;
    config.maxWords = swap;
  }
}
