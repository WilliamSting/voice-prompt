import clsx from 'clsx'
import type { ConnectionStatus, ProcessStatus, PromptFieldLocks, PromptFieldName, PromptMode, PromptSchema } from './types'

export function cn(...values: Array<string | false | null | undefined>) {
  return clsx(values)
}

export function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function statusTone(status: ProcessStatus) {
  switch (status) {
    case 'idle':
      return 'text-mist-light dark:text-mist-dark'
    case 'recording':
      return 'text-danger'
    case 'transcribing':
      return 'text-info'
    case 'rewriting':
      return 'text-warning'
    case 'success':
      return 'text-success'
    case 'error':
      return 'text-danger'
  }
}

export function connectionTone(status: ConnectionStatus) {
  switch (status) {
    case 'connected':
      return 'bg-success'
    case 'degraded':
      return 'bg-warning'
    case 'offline':
      return 'bg-danger'
  }
}

export function statusLabel(status: ProcessStatus) {
  switch (status) {
    case 'idle':
      return '准备开始录音'
    case 'recording':
      return '正在录音，转写内容会持续追加'
    case 'transcribing':
      return '正在完成本轮转写'
    case 'rewriting':
      return '正在优化 Prompt'
    case 'success':
      return '已准备继续编辑'
    case 'error':
      return '处理失败'
  }
}

export function connectionLabel(status: ConnectionStatus) {
  switch (status) {
    case 'connected':
      return '已连接'
    case 'degraded':
      return '连接波动'
    case 'offline':
      return '离线'
  }
}

export function buildSummary(text: string) {
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length > 56 ? `${clean.slice(0, 56)}...` : clean
}

export const promptFieldMeta: Array<{ key: PromptFieldName; label: string; placeholder: string }> = [
  { key: 'goal', label: '任务目标', placeholder: '明确要让 AI 完成什么。' },
  { key: 'context', label: '背景', placeholder: '补充上下文、场景、受众与前提。' },
  { key: 'input', label: '输入信息', placeholder: '列出已有资料、原始内容、依赖输入。' },
  { key: 'constraints', label: '约束', placeholder: '写清限制条件、不能做什么、验收要求。' },
  { key: 'output_format', label: '输出格式', placeholder: '指定输出结构、格式、风格、语言。' },
]

export function createEmptyPromptSchema(): PromptSchema {
  return {
    goal: '',
    context: '',
    input: '',
    constraints: '',
    output_format: '',
  }
}

export function createDefaultFieldLocks(): PromptFieldLocks {
  return {
    goal: false,
    context: false,
    input: false,
    constraints: false,
    output_format: false,
  }
}

export function schemaToText(schema: PromptSchema) {
  return [
    '1. 任务目标',
    schema.goal || '未提供',
    '',
    '2. 背景',
    schema.context || '未提供',
    '',
    '3. 输入信息',
    schema.input || '未提供',
    '',
    '4. 约束',
    schema.constraints || '未提供',
    '',
    '5. 输出格式',
    schema.output_format || '未提供',
  ].join('\n')
}

export function transcriptToSchema(transcript: string, mode: PromptMode) {
  const clean = transcript.trim()
  const base = createEmptyPromptSchema()

  if (!clean) {
    return base
  }

  const modeHints: Record<PromptMode, Pick<PromptSchema, 'constraints' | 'output_format'>> = {
    general: {
      constraints: '保留原意，不编造事实，优先输出简体中文。',
      output_format: '使用清晰分段，方便直接复制给 AI。',
    },
    codex: {
      constraints: '说明目标、范围、约束、验收方式，避免歧义。',
      output_format: '按任务目标、上下文、修改范围、验收标准输出。',
    },
    product: {
      constraints: '强调用户价值、业务背景和交付边界。',
      output_format: '按目标、背景、需求、约束、交付物输出。',
    },
    writing: {
      constraints: '保持表达自然、准确、简洁。',
      output_format: '输出适合直接用于写作或改写的结构化说明。',
    },
    custom: {
      constraints: '根据用户后续要求继续细化。',
      output_format: '保留结构化字段，便于继续编辑。',
    },
  }

  return {
    goal: clean.split(/[。！？\n]/).find(Boolean)?.trim() || clean,
    context: '这是通过语音输入生成的 Prompt 草稿，后续还会继续编辑和修订。',
    input: clean,
    constraints: modeHints[mode].constraints,
    output_format: modeHints[mode].output_format,
  }
}
