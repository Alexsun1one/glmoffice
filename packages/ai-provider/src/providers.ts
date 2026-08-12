import type { AiProviderId, AiProviderMeta, AiSettings, LegacyAiSettings } from './types'

/**
 * Genspark server-side LLM proxy endpoints. All three protocols share the
 * api_key from the gsk login; model ids follow the proxy's own naming scheme,
 * which differs from the official vendor ids.
 */
export const GENSPARK_LLM_BASE_URLS = {
  anthropic: 'https://www.genspark.ai/api/anthropic',
  gemini: 'https://www.genspark.ai/api/llm_proxy/gemini/v1beta',
  openai: 'https://www.genspark.ai/api/llm_proxy/v1',
} as const

/**
 * Splits GenOffice usage out of the proxy's default "Claw" billing bucket
 * (the backend attributes gsk-key traffic by X-Agent-Type). Only sent to the
 * Genspark proxy — never to direct vendor APIs.
 */
export const GENSPARK_AGENT_TYPE = 'genoffice'

export function gensparkAttributionHeaders(baseUrl?: string): Record<string, string> {
  return baseUrl?.startsWith('https://www.genspark.ai')
    ? { 'X-Agent-Type': GENSPARK_AGENT_TYPE }
    : {}
}

export const AI_PROVIDERS: AiProviderMeta[] = [
  {
    id: 'genspark',
    label: 'Genspark',
    models: [
      'claude-opus-4-7',
      'claude-opus-4-8',
      'claude-sonnet-4-6',
      'claude-haiku-4-5',
      'gpt-5.2',
      'gemini-3.1-pro-preview',
      'gemini-3-flash-preview',
    ],
    defaultModel: 'claude-opus-4-7',
    keyPlaceholder: 'Not required - sign in to Genspark',
  },
  {
    id: 'anthropic',
    label: 'Claude',
    models: [
      'claude-sonnet-5',
      'claude-opus-4-8',
      'claude-opus-4-7',
      'claude-sonnet-4-6',
      'claude-opus-4-6',
      'claude-opus-4-5-20251101',
      'claude-haiku-4-5-20251001',
      'claude-sonnet-4-5-20250929',
    ],
    defaultModel: 'claude-opus-4-7',
    keyPlaceholder: 'sk-ant-api03-...',
  },
  {
    id: 'gemini',
    label: 'Gemini',
    models: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash'],
    defaultModel: 'gemini-2.5-flash',
    keyPlaceholder: 'AIza...',
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    defaultModel: 'deepseek-chat',
    keyPlaceholder: 'sk-...',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    models: ['gpt-4.1', 'gpt-4.1-mini', 'gpt-4o', 'gpt-4o-mini'],
    defaultModel: 'gpt-4.1-mini',
    keyPlaceholder: 'sk-...',
  },
  {
    id: 'custom',
    label: 'Custom',
    models: [],
    defaultModel: '',
    keyPlaceholder: 'API Key',
    needsBaseUrl: true,
  },
]

/**
 * 2026-08-11 ZCode: Custom provider 快速模板——选一下自动填好 baseUrl + 推荐模型。
 * 学 OpenCode 的 provider 目录思路:国内常用 OpenAI 兼容服务预置好,用户只填 key。
 * 所有都是 OpenAI 兼容协议(/v1/chat/completions),走 custom provider 通路。
 */
export interface CustomPreset {
  id: string
  label: string
  baseUrl: string
  models: string[]
  defaultModel: string
  keyPlaceholder: string
  keyHint?: string
}

export const CUSTOM_PRESETS: readonly CustomPreset[] = [
  {
    id: 'zhipu',
    label: '智谱 GLM (Zhipu)',
    baseUrl: 'https://open.bigmodel.cn/api/coding/paas/v4',
    models: ['glm-5.2', 'glm-4.6', 'glm-4-plus', 'glm-4-air', 'glm-4v-plus'],
    defaultModel: 'glm-5.2',
    keyPlaceholder: 'xxxxxxxx.xxxxxxxx',
    keyHint: 'open.bigmodel.cn 控制台获取(Coding Plan 或标准 API)',
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    defaultModel: 'deepseek-chat',
    keyPlaceholder: 'sk-...',
    keyHint: 'platform.deepseek.com 控制台获取',
  },
  {
    id: 'kimi',
    label: 'Kimi (月之暗面)',
    baseUrl: 'https://api.moonshot.cn/v1',
    models: ['moonshot-v1-128k', 'moonshot-v1-32k', 'moonshot-v1-8k'],
    defaultModel: 'moonshot-v1-128k',
    keyPlaceholder: 'sk-...',
    keyHint: 'platform.moonshot.cn 控制台获取',
  },
  {
    id: 'qwen',
    label: '通义千问 (Qwen)',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    models: ['qwen-max', 'qwen-plus', 'qwen-turbo', 'qwen-long'],
    defaultModel: 'qwen-max',
    keyPlaceholder: 'sk-...',
    keyHint: 'dashscope.aliyun.com 控制台获取',
  },
  {
    id: 'siliconflow',
    label: '硅基流动 (SiliconFlow)',
    baseUrl: 'https://api.siliconflow.cn/v1',
    models: ['Qwen/Qwen2.5-72B-Instruct', 'deepseek-ai/DeepSeek-V3', 'Pro/Qwen/Qwen2.5-Coder-32B-Instruct'],
    defaultModel: 'Qwen/Qwen2.5-72B-Instruct',
    keyPlaceholder: 'sk-...',
    keyHint: 'siliconflow.cn 控制台获取(聚合多家模型,有免费额度)',
  },
  {
    id: 'baichuan',
    label: '百川 (Baichuan)',
    baseUrl: 'https://api.baichuan-ai.com/v1',
    models: ['Baichuan4-Turbo', 'Baichuan3-Turbo'],
    defaultModel: 'Baichuan4-Turbo',
    keyPlaceholder: 'sk-...',
    keyHint: 'platform.baichuan-ai.com 控制台获取',
  },
  {
    id: 'minimax',
    label: 'MiniMax',
    baseUrl: 'https://api.minimax.chat/v1',
    models: ['abab6.5s-chat', 'abab6.5-chat'],
    defaultModel: 'abab6.5s-chat',
    keyPlaceholder: '...',
    keyHint: 'platform.minimaxi.com 控制台获取',
  },
  {
    id: 'ollama',
    label: 'Ollama (本地)',
    baseUrl: 'http://localhost:11434/v1',
    models: ['llama3.1', 'qwen2.5', 'deepseek-r1'],
    defaultModel: 'llama3.1',
    keyPlaceholder: 'ollama(无需 key)',
    keyHint: '本地 Ollama 服务,无需 API key(填任意字符即可)',
  },
]

/**
 * Fresh settings with every provider's default model and an empty key,
 * except providers listed in `defaultApiKeys` (e.g. an app-specific
 * preconfigured Anthropic key). Callers own that policy; this package
 * has no hardcoded keys.
 */
export function defaultAiSettings(
  defaultApiKeys?: Partial<Record<AiProviderId, string>>,
): AiSettings {
  const providers = {} as AiSettings['providers']
  for (const meta of AI_PROVIDERS) {
    providers[meta.id] = {
      apiKey: defaultApiKeys?.[meta.id] ?? '',
      model: meta.defaultModel,
      baseUrl: meta.needsBaseUrl ? '' : undefined,
    }
  }
  return { provider: 'genspark', providers }
}

/**
 * Merge on-disk settings over freshly computed defaults, migrating the
 * pre-provider shape (a single OpenAI-compatible endpoint) into the
 * "custom" provider slot. `stored` is whatever the caller read from its
 * settings file (already JSON-parsed); this function does no file I/O.
 */
export function resolveAiSettings(
  stored: Partial<AiSettings> & LegacyAiSettings,
  defaults: AiSettings,
): AiSettings {
  if (!stored.providers) {
    if (stored.apiKey) {
      defaults.providers.custom = {
        apiKey: stored.apiKey,
        model: stored.model ?? '',
        baseUrl: stored.baseUrl ?? 'https://api.openai.com/v1',
      }
    }
    return defaults
  }
  return {
    provider: stored.provider ?? defaults.provider,
    providers: { ...defaults.providers, ...stored.providers },
  }
}
