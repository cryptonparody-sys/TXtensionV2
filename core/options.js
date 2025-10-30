const TXtensionConfig = {
  version: '1.0.0',
  branding: {
    productName: 'TXtension',
    shortName: 'TX',
    tagline: 'Translate every tweet instantly.',
    socials: {}
  },
  theme: {
    fontStack: `'Inter', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif`,
    accent: '#1DD3F8'
  },
  buttonStates: {
    idle: 'TX',
    loading: '…',
    success: 'done',
    error: 'retry'
  },
  tonePresets: [
    {
      id: 'simple',
      label: 'Simple',
      description: 'Conversational and brief.',
      prompt: `rewrite the tweet in the requested language using short, conversational sentences. keep every idea, stay relaxed and friendly, and never slip into formal register.`
    },
    {
      id: 'professional',
      label: 'Professional',
      description: 'Precise and polished.',
      prompt: `rewrite the tweet in the requested language with clear, confident sentences that feel natural in everyday conversation. keep terminology accurate, but explain tricky jargon in plain words and avoid stiff or academic phrasing.`
    },
    {
      id: 'comprehensive',
      label: 'Comprehensive',
      description: 'Thorough yet smooth.',
      prompt: `rewrite the tweet in the requested language covering every nuance in flowing, easy-to-read paragraphs. unpack implied ideas in a friendly way, stay conversational, and keep technical details approachable.`
    },
    {
      id: 'point',
      label: 'Point',
      description: 'Direct and explicit.',
      prompt: `summarise the tweet's intent in the requested language only. keep it under three short sentences, cover every key point, and explain the meaning in a casual, easy-to-understand voice. do not switch languages or add meta commentary.`
    }
  ],
  reply: {
    title: 'Reply',
    description: 'Save personal instructions, project context, and constraints RX must follow whenever it drafts a reply.',
    placeholder:
      'Explain the tone, structure, and context RX should apply. The tweet text is appended after your instructions.'
  },
  discordReply: {
    title: 'Discord Reply',
    description: 'Provide context, desired prompt, and banned phrases for generating responses inside Discord.',
    promptPlaceholder: 'Describe how RD should respond to Discord messages.',
    contextPlaceholder: 'Share background context or project notes that should guide replies.'
  },
  popupThemes: [
    {
      id: 'noir',
      label: 'Noir',
      background: 'rgba(8, 12, 20, 0.93)',
      border: 'rgba(255, 255, 255, 0.08)',
      text: '#f2f6ff',
      subtext: '#8c97b3',
      shadow: '0 32px 68px rgba(4, 6, 12, 0.52)'
    },
    {
      id: 'pearl',
      label: 'Pearl',
      background: '#ffffff',
      border: 'rgba(10, 22, 40, 0.1)',
      text: '#0f172a',
      subtext: '#475569',
      shadow: '0 28px 60px rgba(15, 23, 42, 0.16)'
    },
    {
      id: 'ember',
      label: 'Ember',
      background: '#11161f',
      border: 'rgba(255, 255, 255, 0.12)',
      text: '#fdf5ff',
      subtext: '#b9c2dd',
      shadow: '0 32px 80px rgba(10, 14, 22, 0.58)'
    }
  ],
  rtlLanguages: ['ar', 'fa', 'he', 'ur', 'ps'],
  languages: [
    { code: 'en', label: 'English' },
    { code: 'fa', label: 'Persian' },
    { code: 'tr', label: 'Turkish' },
    { code: 'ru', label: 'Russian' },
    { code: 'zh', label: 'Chinese' },
    { code: 'es', label: 'Spanish' },
    { code: 'fr', label: 'French' },
    { code: 'de', label: 'German' },
    { code: 'ja', label: 'Japanese' },
    { code: 'pt', label: 'Portuguese' }
  ],
  providerCatalog: {
    openai: {
      id: 'openai',
      label: 'OpenAI',
      defaultModel: 'gpt-4.1-mini',
      endpoint: 'https://api.openai.com/v1'
    },
    anthropic: {
      id: 'anthropic',
      label: 'Anthropic Claude',
      defaultModel: 'claude-3-5-sonnet-20241022',
      endpoint: 'https://api.anthropic.com/v1'
    },
    gemini: {
      id: 'gemini',
      label: 'Google Gemini',
      defaultModel: 'gemini-2.0-flash',
      endpoint: 'https://generativelanguage.googleapis.com/v1beta'
    },
    deepseek: {
      id: 'deepseek',
      label: 'DeepSeek',
      defaultModel: 'deepseek-chat',
      endpoint: 'https://api.deepseek.com/v1'
    },
    openrouter: {
      id: 'openrouter',
      label: 'OpenRouter',
      defaultModel: 'openrouter/deepseek-chat',
      endpoint: 'https://openrouter.ai/api/v1'
    },
    custom: {
      id: 'custom',
      label: 'Custom REST',
      defaultModel: '',
      endpoint: ''
    }
  },
  defaultSettings: {
    tonePreset: 'simple',
    targetLanguage: 'en',
    pinWindow: true,
    autoCopy: false,
    popupStyle: {
      theme: 'noir'
    },
    reply: {
      prompt: '',
      context: '',
      avoid: '',
      minWords: 3,
      maxWords: 20,
      autoCopy: false
    },
    discordReply: {
      prompt: '',
      context: '',
      avoid: '',
      minWords: 3,
      maxWords: 20,
      autoCopy: false
    },
    provider: 'gemini',
    providerSettings: {
      openai: {
        apiKey: '',
        model: 'gpt-4.1-mini',
        baseUrl: 'https://api.openai.com/v1',
        temperature: 0.2,
        maxTokens: 400
      },
      anthropic: {
        apiKey: '',
        model: 'claude-3-5-sonnet-20241022',
        baseUrl: 'https://api.anthropic.com/v1',
        temperature: 0.2,
        maxTokens: 400
      },
      gemini: {
        apiKey: '',
        model: 'gemini-2.0-flash',
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
        temperature: 0.2,
        maxOutputTokens: 400
      },
      deepseek: {
        apiKey: '',
        model: 'deepseek-chat',
        baseUrl: 'https://api.deepseek.com/v1',
        temperature: 0.2,
        maxTokens: 400
      },
      openrouter: {
        apiKey: '',
        model: 'openrouter/deepseek-chat',
        baseUrl: 'https://openrouter.ai/api/v1',
        temperature: 0.2,
        maxTokens: 400
      },
      custom: {
        label: '',
        apiKey: '',
        model: '',
        baseUrl: '',
        extraHeaders: '',
        temperature: 0.2,
        maxTokens: 400
      }
    }
  }
};

export { TXtensionConfig };
