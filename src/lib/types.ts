export type ViewId = 'panel' | 'history' | 'settings'

export type ConnectionStatus = 'connected' | 'degraded' | 'offline'

export type PromptMode = 'general' | 'codex' | 'product' | 'writing' | 'custom'

export type PromptFieldName = 'goal' | 'context' | 'input' | 'constraints' | 'output_format'

export type ProcessStatus =
  | 'idle'
  | 'recording'
  | 'transcribing'
  | 'rewriting'
  | 'success'
  | 'error'

export interface PromptRecord {
  id: string
  createdAt: string
  mode: PromptMode
  status: Extract<ProcessStatus, 'success' | 'error'>
  transcript: string
  result: string
  summary: string
}

export interface TemplateOption {
  id: PromptMode
  label: string
  description: string
}

export type PromptVersionSource =
  | 'seed'
  | 'optimize_all'
  | 'optimize_field'
  | 'voice_command'
  | 'manual_snapshot'
  | 'reset'
  | 'restore'

export interface PromptVersion {
  id: string
  createdAt: string
  label: string
  source: PromptVersionSource
  transcript: string
  schema: PromptSchema
  summary: string
}

export interface SettingsState {
  shortcut: string
  recordingDuration: number
  launchAtLogin: boolean
  autoCopy: boolean
  autoSaveHistory: boolean
  fallbackOnFailure: boolean
  whisperPath: string
  modelPath: string
  baseUrl: string
  apiKey: string
  model: string
  selectedTemplate: PromptMode
}

export interface PromptSchema {
  goal: string
  context: string
  input: string
  constraints: string
  output_format: string
}

export type PromptFieldLocks = Record<PromptFieldName, boolean>

export interface SessionState {
  status: ProcessStatus
  connection: ConnectionStatus
  mode: PromptMode
  countdown: number
  transcript: string
  schema: PromptSchema
  fieldLocks: PromptFieldLocks
  revisionMode: boolean
  recordingContext: 'fresh' | 'supplement'
  versions: PromptVersion[]
  selectedVersionId?: string
  lastVoiceCommand?: string
  errorMessage?: string
}

export interface VoicePromptResponse {
  transcript: string
  schema: PromptSchema
  audioPath?: string
}

export interface BackendBridge {
  startRecording: (settings: SettingsState) => Promise<void>
  stopRecordingAndTranscribe: (payload: {
    mode: PromptMode
    duration: number
    settings: SettingsState
    transcript?: string
    revisionMode?: boolean
    currentPrompt?: string
  }) => Promise<VoicePromptResponse>
  optimizePrompt: (payload: {
    mode: PromptMode
    settings: SettingsState
    transcript: string
    schema: PromptSchema
    fieldLocks: PromptFieldLocks
    fieldToOptimize?: PromptFieldName | 'all'
    revisionMode?: boolean
  }) => Promise<VoicePromptResponse>
  copyToClipboard: (value: string) => Promise<void>
  insertIntoActiveField: (value: string) => Promise<void>
  saveHistory: (record: PromptRecord) => Promise<void>
}
