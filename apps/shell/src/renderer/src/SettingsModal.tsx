import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useI18n } from './locale'
import type { StringKey } from './locale'
import type { AccountStatus, UiTheme } from '../../shared/home-api'
import type { AiSettings, AiProviderId } from '@genoffice/ai-provider'
import { AI_PROVIDERS, CUSTOM_PRESETS, defaultAiSettings } from '@genoffice/ai-provider'
import './settings.css'

// ── Settings modal (opened from the account menu) ─────────
// Zoom-style two-pane dialog: section nav on the left, fields on the right.
// All values go through the existing home IPC; nothing is stored locally.

// sorted by ISO 639 language code — native-script labels have no natural
// shared alphabet, so the code is the ordering key
const LANG_OPTIONS = [
  { value: 'ar', label: 'العربية' },
  { value: 'de', label: 'Deutsch' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'he', label: 'עברית' },
  { value: 'hi', label: 'हिन्दी' },
  { value: 'id', label: 'Bahasa Indonesia' },
  { value: 'it', label: 'Italiano' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
  { value: 'ms', label: 'Bahasa Melayu' },
  { value: 'nl', label: 'Nederlands' },
  { value: 'pl', label: 'Polski' },
  { value: 'pt', label: 'Português' },
  { value: 'ru', label: 'Русский' },
  { value: 'th', label: 'ไทย' },
  { value: 'zh', label: '简体中文' },
  { value: 'zh-TW', label: '繁體中文' },
] as const

const THEME_OPTIONS = [
  { value: 'light', labelKey: 'themeLight' },
  { value: 'dark', labelKey: 'themeDark' },
  { value: 'system', labelKey: 'themeSystem' },
] as const satisfies readonly { value: UiTheme; labelKey: StringKey }[]

const CHANNEL_OPTIONS = [
  { value: 'stable', labelKey: 'channelStable' },
  { value: 'beta', labelKey: 'channelBeta' },
] as const satisfies readonly { value: 'stable' | 'beta'; labelKey: StringKey }[]

type SectionId = 'account' | 'general' | 'ai' | 'about'

const SECTIONS: readonly { id: SectionId; labelKey: StringKey }[] = [
  { id: 'account', labelKey: 'setSecAccount' },
  { id: 'general', labelKey: 'setSecGeneral' },
  { id: 'ai', labelKey: 'setSecAi' },
  { id: 'about', labelKey: 'setSecAbout' },
]

function SectionIcon({ id }: { id: SectionId }) {
  if (id === 'account') {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="5.2" r="2.9" stroke="currentColor" strokeWidth="1.3" />
        <path
          d="M2.7 13.6a5.5 5.5 0 0 1 10.6 0"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>
    )
  }
  if (id === 'general') {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M2 5h8M13 5h1M2 11h1M6 11h8"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
        <circle cx="11.5" cy="5" r="1.7" stroke="currentColor" strokeWidth="1.3" />
        <circle cx="4.5" cy="11" r="1.7" stroke="currentColor" strokeWidth="1.3" />
      </svg>
    )
  }
  // 2026-08-11 ZCode: AI 栏图标(四芒星/火花样式)
  if (id === 'ai') {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M8 1.5l1.6 4.2 4.2 1.6-4.2 1.6L8 13.1l-1.6-4.2L2.2 7.3l4.2-1.6L8 1.5z"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinejoin="round"
          fill="none"
        />
        <circle cx="12.8" cy="3.2" r="0.9" fill="currentColor" />
      </svg>
    )
  }
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.3" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8 7.4v3.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="8" cy="5.1" r="0.8" fill="currentColor" />
    </svg>
  )
}

/** label-over-value field row with an optional right-aligned action */
function Field({
  label,
  value,
  valueTitle,
  action,
}: {
  label: string
  value: string
  valueTitle?: string
  action?: ReactNode
}) {
  return (
    <div className="set-field">
      <div className="set-field-text">
        <div className="set-field-label">{label}</div>
        <div className="set-field-value" data-tip={valueTitle}>
          {value}
        </div>
      </div>
      {action}
    </div>
  )
}

export interface SettingsModalProps {
  status: AccountStatus | null
  loggingOut: boolean
  /** browser sign-in in progress (spinner shows on the account entry) */
  loginWaiting: boolean
  /** device auth URL while waiting — rescue actions when the browser did not auto-open */
  loginUrl: string | null
  urlCopied: boolean
  onOpenLoginUrl: () => void
  onCopyLoginUrl: () => void
  onClose: () => void
  /** closes the modal and launches the Genspark login flow (progress shows on the account entry) */
  onLogin: () => void
  onLogout: () => void
}

export function SettingsModal({
  status,
  loggingOut,
  loginWaiting,
  loginUrl,
  urlCopied,
  onOpenLoginUrl,
  onCopyLoginUrl,
  onClose,
  onLogin,
  onLogout,
}: SettingsModalProps) {
  const { lang, setLang, t } = useI18n()
  const [section, setSection] = useState<SectionId>('account')
  const [theme, setTheme] = useState<UiTheme>('system')
  const [saveDir, setSaveDir] = useState('')
  const [channel, setChannel] = useState<'stable' | 'beta'>('stable')
  const [appVersion, setAppVersion] = useState('')
  // 2026-08-11 ZCode: AI provider 设置(provider/key/baseUrl/model)
  const [aiSettings, setAiSettingsState] = useState<AiSettings>(() => defaultAiSettings())
  const [aiSaved, setAiSaved] = useState(false)
  // 2026-08-11 ZCode: 连接测试状态
  const [aiTesting, setAiTesting] = useState(false)
  const [aiTestResult, setAiTestResult] = useState<{ ok: boolean; detail: string } | null>(null)

  useEffect(() => {
    let alive = true
    void window.aiOffice.getTheme?.().then((th) => {
      if (alive) setTheme(th)
    })
    void window.aiOffice.getDefaultSaveDir?.().then((dir) => {
      if (alive && dir) setSaveDir(dir)
    })
    void window.aiOffice.getUpdateChannel?.().then((ch) => {
      if (alive) setChannel(ch)
    })
    void window.aiOffice.getAppVersion?.().then((v) => {
      if (alive && v) setAppVersion(v)
    })
    void window.aiOffice.getAiSettings?.().then((s) => {
      if (alive && s) setAiSettingsState(s)
    })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const applyTheme = (next: UiTheme) => {
    setTheme(next)
    void window.aiOffice.setTheme(next)
    if (next === 'system') document.documentElement.removeAttribute('data-theme')
    else document.documentElement.setAttribute('data-theme', next)
  }

  const changeSaveDir = () => {
    void window.aiOffice.pickDefaultSaveDir?.().then((dir) => {
      if (dir) setSaveDir(dir)
    })
  }

  // 2026-08-11 ZCode: AI 设置保存(provider/key/baseUrl/model),保存后显示"已保存"提示
  const saveAi = (next: AiSettings) => {
    setAiSettingsState(next)
    void window.aiOffice.setAiSettings(next).then(() => {
      setAiSaved(true)
      setTimeout(() => setAiSaved(false), 2000)
    })
  }
  const currentProvider = aiSettings.provider
  const currentConfig = aiSettings.providers[currentProvider] ?? { apiKey: '', model: '' }
  const updateProvider = (pid: AiProviderId) => {
    saveAi({ ...aiSettings, provider: pid })
  }
  const updateField = (field: 'apiKey' | 'model' | 'baseUrl', value: string) => {
    saveAi({
      ...aiSettings,
      providers: {
        ...aiSettings.providers,
        [currentProvider]: { ...currentConfig, [field]: value },
      },
    })
  }
  // 2026-08-11 ZCode: 测试当前 provider 连接
  const testConnection = () => {
    setAiTesting(true)
    setAiTestResult(null)
    void window.aiOffice.testAiConnection(aiSettings).then((r) => {
      setAiTesting(false)
      setAiTestResult(r)
    })
  }

  const loggedIn = status?.loggedIn ?? false
  const email = status?.email ?? ''

  return (
    <div
      className="set-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="set-dialog" role="dialog" aria-modal="true" aria-label={t('settings')}>
        <div className="set-header">
          <h2 className="set-title">{t('settings')}</h2>
          <button className="set-close" onClick={onClose} aria-label={t('cancel')}>
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <path
                d="M2 2l10 10M12 2L2 12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <div className="set-body">
          <nav className="set-nav" aria-label={t('settings')}>
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                className={`set-nav-item${section === s.id ? ' active' : ''}`}
                aria-current={section === s.id}
                onClick={() => setSection(s.id)}
              >
                <SectionIcon id={s.id} />
                {t(s.labelKey)}
              </button>
            ))}
          </nav>
          <div className="set-pane">
            {section === 'account' && (
              <>
                <h3 className="set-pane-title">{t('setSecAccount')}</h3>
                <Field label={t('setEmail')} value={loggedIn ? email : t('setNotLoggedIn')} />
                {loggedIn && (
                  <Field
                    label={t('credits')}
                    value={
                      status?.creditBalance === undefined
                        ? '—'
                        : Math.floor(status.creditBalance).toLocaleString('en-US')
                    }
                    action={
                      <button
                        className="set-btn"
                        data-tip={t('creditsTip')}
                        onClick={() => void window.aiOffice.openCreditUsage?.()}
                      >
                        {t('setViewUsage')}
                      </button>
                    }
                  />
                )}
                <div className="set-pane-footer">
                  {loggedIn ? (
                    <button className="set-btn danger" disabled={loggingOut} onClick={onLogout}>
                      {loggingOut ? t('loggingOut') : t('logout')}
                    </button>
                  ) : (
                    <>
                      {loginWaiting && loginUrl && (
                        <>
                          <button className="set-btn" onClick={onOpenLoginUrl}>
                            {t('loginOpenManually')}
                          </button>
                          <button className="set-btn" onClick={onCopyLoginUrl}>
                            {urlCopied ? t('loginCopied') : t('loginCopyUrl')}
                          </button>
                        </>
                      )}
                      <button className="set-btn primary" onClick={onLogin}>
                        {loginWaiting ? t('waitingShort') : t('loginGenspark')}
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
            {section === 'general' && (
              <>
                <h3 className="set-pane-title">{t('setSecGeneral')}</h3>
                <div className="set-field">
                  <div className="set-field-text">
                    <label className="set-field-label" htmlFor="set-lang">
                      {t('language')}
                    </label>
                  </div>
                  <select
                    id="set-lang"
                    className="set-select"
                    value={lang}
                    onChange={(e) => setLang(e.target.value as typeof lang)}
                  >
                    {LANG_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="set-field">
                  <div className="set-field-text">
                    <label className="set-field-label" htmlFor="set-theme">
                      {t('theme')}
                    </label>
                  </div>
                  <select
                    id="set-theme"
                    className="set-select"
                    value={theme}
                    onChange={(e) => applyTheme(e.target.value as UiTheme)}
                  >
                    {THEME_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {t(opt.labelKey)}
                      </option>
                    ))}
                  </select>
                </div>
                <Field
                  label={t('saveLocation')}
                  value={saveDir || '—'}
                  valueTitle={saveDir}
                  action={
                    <button className="set-btn" onClick={changeSaveDir}>
                      {t('setChange')}
                    </button>
                  }
                />
              </>
            )}
            {section === 'ai' && (
              <>
                <h3 className="set-pane-title">{t('setSecAi')}</h3>
                <p className="set-pane-help">{t('setAiHelp')}</p>
                <div className="set-field">
                  <div className="set-field-text">
                    <label className="set-field-label" htmlFor="set-ai-provider">
                      {t('setAiProvider')}
                    </label>
                  </div>
                  <select
                    id="set-ai-provider"
                    className="set-select"
                    value={currentProvider}
                    onChange={(e) => updateProvider(e.target.value as AiProviderId)}
                  >
                    {AI_PROVIDERS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
                {/* API Key 输入 */}
                <div className="set-field">
                  <div className="set-field-text">
                    <label className="set-field-label" htmlFor="set-ai-key">
                      {t('setAiApiKey')}
                    </label>
                  </div>
                  <input
                    id="set-ai-key"
                    type="password"
                    className="set-input"
                    placeholder={t('setAiKeyHint')}
                    value={currentConfig.apiKey}
                    onChange={(e) => updateField('apiKey', e.target.value)}
                  />
                </div>
                {/* Custom provider: 快速预设模板(学 OpenCode 的 provider 目录) */}
                {currentProvider === 'custom' && (
                  <div className="set-field">
                    <div className="set-field-text">
                      <label className="set-field-label" htmlFor="set-ai-preset">
                        {t('setAiPreset')}
                      </label>
                    </div>
                    <select
                      id="set-ai-preset"
                      className="set-select"
                      value=""
                      onChange={(e) => {
                        const p = CUSTOM_PRESETS.find((x) => x.id === e.target.value)
                        if (p) {
                          // 选预设 → 自动填 baseUrl + model,并更新 key 占位提示
                          saveAi({
                            ...aiSettings,
                            providers: {
                              ...aiSettings.providers,
                              custom: {
                                ...currentConfig,
                                baseUrl: p.baseUrl,
                                model: p.defaultModel,
                              },
                            },
                          })
                        }
                      }}
                    >
                      <option value="">{t('setAiPresetChoose')}</option>
                      {CUSTOM_PRESETS.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {/* Custom provider 需要 Base URL */}
                {currentProvider === 'custom' && (
                  <div className="set-field">
                    <div className="set-field-text">
                      <label className="set-field-label" htmlFor="set-ai-baseurl">
                        {t('setAiBaseUrl')}
                      </label>
                    </div>
                    <input
                      id="set-ai-baseurl"
                      type="text"
                      className="set-input"
                      placeholder={t('setAiCustomHint')}
                      value={currentConfig.baseUrl ?? ''}
                      onChange={(e) => updateField('baseUrl', e.target.value)}
                    />
                  </div>
                )}
                {/* 模型名(自定义输入或预设下拉) */}
                <div className="set-field">
                  <div className="set-field-text">
                    <label className="set-field-label" htmlFor="set-ai-model">
                      {t('setAiModel')}
                    </label>
                  </div>
                  {(() => {
                    const meta = AI_PROVIDERS.find((p) => p.id === currentProvider)
                    if (meta && meta.models.length > 0) {
                      const isInList = meta.models.includes(currentConfig.model)
                      return (
                        <>
                          <select
                            id="set-ai-model"
                            className="set-select"
                            value={isInList ? currentConfig.model : '__custom'}
                            onChange={(e) => {
                              if (e.target.value !== '__custom') updateField('model', e.target.value)
                            }}
                          >
                            {meta.models.map((m) => (
                              <option key={m} value={m}>
                                {m}
                              </option>
                            ))}
                            {!isInList && currentConfig.model && (
                              <option value="__custom">{currentConfig.model}</option>
                            )}
                          </select>
                          {!isInList && (
                            <input
                              type="text"
                              className="set-input set-input-mt"
                              placeholder={t('setAiModelHint')}
                              value={currentConfig.model}
                              onChange={(e) => updateField('model', e.target.value)}
                            />
                          )}
                        </>
                      )
                    }
                    // custom 或无预设模型的 provider:自由输入
                    return (
                      <input
                        id="set-ai-model"
                        type="text"
                        className="set-input"
                        placeholder={t('setAiModelHint')}
                        value={currentConfig.model}
                        onChange={(e) => updateField('model', e.target.value)}
                      />
                    )
                  })()}
                </div>
                {aiSaved && <div className="set-pane-saved">{t('setAiSaved')}</div>}
                <div className="set-pane-footer">
                  <button
                    className="set-btn primary"
                    disabled={aiTesting || !currentConfig.apiKey}
                    onClick={testConnection}
                  >
                    {aiTesting ? t('setAiTesting') : t('setAiTestBtn')}
                  </button>
                  {aiTestResult && (
                    <span className={aiTestResult.ok ? 'set-test-ok' : 'set-test-fail'}>
                      {aiTestResult.ok ? t('setAiTestOk') : t('setAiTestFail')} {aiTestResult.detail}
                    </span>
                  )}
                </div>
              </>
            )}
            {section === 'about' && (
              <>
                <h3 className="set-pane-title">{t('setSecAbout')}</h3>
                <Field label={t('versionLabel')} value={appVersion || '—'} />
                <Field label={t('forkBasedOn')} value="GenOffice" />
                <div className="set-field">
                  <div className="set-field-text">
                    <label className="set-field-label" htmlFor="set-channel">
                      {t('updateChannel')}
                    </label>
                  </div>
                  <select
                    id="set-channel"
                    className="set-select"
                    value={channel}
                    onChange={(e) => {
                      const next = e.target.value === 'beta' ? 'beta' : 'stable'
                      setChannel(next)
                      void window.aiOffice.setUpdateChannel(next)
                    }}
                  >
                    {CHANNEL_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {t(opt.labelKey)}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
