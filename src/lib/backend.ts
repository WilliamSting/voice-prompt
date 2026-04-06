import { invoke } from '@tauri-apps/api/core'
import type {
  BackendBridge,
  PromptFieldName,
  PromptMode,
  PromptRecord,
  PromptSchema,
  SettingsState,
  VoicePromptResponse,
} from './types'
import { schemaToText, transcriptToSchema } from './utils'

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

export function isTauriRuntime() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

function optimizeMockField(schema: PromptSchema, fieldName: PromptFieldName, mode: PromptMode) {
  const current = schema[fieldName].trim()
  const label = {
    goal: '任务目标',
    context: '背景',
    input: '输入信息',
    constraints: '约束',
    output_format: '输出格式',
  }[fieldName]

  return {
    ...schema,
    [fieldName]: current
      ? `【${mode.toUpperCase()} 已优化${label}】${current}`
      : `【${mode.toUpperCase()} 已生成${label}】请根据 transcript 补足这部分内容。`,
  }
}

export const mockBackend: BackendBridge = {
  async startRecording() {
    await wait(120)
  },
  async stopRecordingAndTranscribe() {
    await wait(1200)
    return {
      transcript: '请把这个新功能做成一个清晰的 Prompt 工作台，左边保留语音转写草稿，右边改成结构化 Prompt 编辑器。',
      schema: transcriptToSchema(
        '请把这个新功能做成一个清晰的 Prompt 工作台，左边保留语音转写草稿，右边改成结构化 Prompt 编辑器。',
        'codex',
      ),
    }
  },
  async optimizePrompt({ mode, transcript, schema, fieldToOptimize, fieldLocks }) {
    await wait(900)

    let nextSchema = { ...schema }

    if (fieldToOptimize && fieldToOptimize !== 'all') {
      if (!fieldLocks[fieldToOptimize]) {
        nextSchema = optimizeMockField(nextSchema, fieldToOptimize, mode)
      }
    } else {
      ;(Object.keys(nextSchema) as PromptFieldName[]).forEach((fieldName) => {
        if (!fieldLocks[fieldName]) {
          nextSchema = optimizeMockField(nextSchema, fieldName, mode)
        }
      })
    }

    return {
      transcript,
      schema: nextSchema,
    }
  },
  async copyToClipboard(value: string) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value)
      return
    }
    void value
    await wait(120)
  },
  async insertIntoActiveField(value: string) {
    if (isTauriRuntime()) {
      await invoke('insert_text_into_active_input', { text: value })
      return
    }
    await this.copyToClipboard(value)
    await wait(140)
  },
  async saveHistory(record: PromptRecord) {
    void record
    await wait(120)
  },
}

export async function startRecording(settings: SettingsState): Promise<void> {
  if (isTauriRuntime()) {
    await invoke('start_recording', { payload: { settings } })
    return
  }

  await mockBackend.startRecording(settings)
}

export async function stopRecordingAndTranscribe(payload: {
  mode: PromptMode
  duration: number
  settings: SettingsState
}): Promise<VoicePromptResponse> {
  if (isTauriRuntime()) {
    return invoke<VoicePromptResponse>('stop_recording_and_transcribe', { payload })
  }

  return mockBackend.stopRecordingAndTranscribe(payload)
}

export async function optimizePrompt(payload: {
  mode: PromptMode
  settings: SettingsState
  transcript: string
  schema: PromptSchema
  fieldLocks: Record<PromptFieldName, boolean>
  fieldToOptimize?: PromptFieldName | 'all'
  revisionMode?: boolean
}): Promise<VoicePromptResponse> {
  if (isTauriRuntime()) {
    return invoke<VoicePromptResponse>('rewrite_prompt', {
      payload: {
        ...payload,
        duration: 0,
      },
    })
  }

  return mockBackend.optimizePrompt(payload)
}

export function renderSchemaForExport(schema: PromptSchema) {
  return schemaToText(schema)
}
