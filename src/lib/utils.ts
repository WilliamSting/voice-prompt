import clsx from 'clsx'
import type {
  ConnectionStatus,
  ProcessStatus,
  PromptFieldLocks,
  PromptFieldName,
  PromptMode,
  PromptSchema,
  PromptVersion,
  PromptVersionSource,
} from './types'

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

export function schemaHasContent(schema: PromptSchema) {
  return Object.values(schema).some((value) => value.trim().length > 0)
}

export function buildSchemaSummary(schema: PromptSchema) {
  const primary = schema.goal.trim() || schema.input.trim() || schema.context.trim() || schema.constraints.trim()
  return buildSummary(primary || '未命名版本')
}

export function createPromptVersion(params: {
  label: string
  source: PromptVersionSource
  transcript: string
  schema: PromptSchema
}): PromptVersion {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    label: params.label,
    source: params.source,
    transcript: params.transcript,
    schema: { ...params.schema },
    summary: buildSchemaSummary(params.schema),
  }
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

function normalizeText(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function appendSentence(base: string, addition: string) {
  const cleanAddition = addition.trim()
  if (!cleanAddition) return base
  if (!base.trim()) return cleanAddition
  return `${base.trim()}\n${cleanAddition}`
}

function extractInstructionPayload(command: string) {
  return command
    .replace(/^(请|帮我|麻烦|然后|再|把)\s*/u, '')
    .replace(/^(将|给|对)\s*/u, '')
    .trim()
}

function resolveFieldFromCommand(command: string): PromptFieldName | null {
  if (/任务目标|目标|第一段/u.test(command)) return 'goal'
  if (/背景|上下文|第二段/u.test(command)) return 'context'
  if (/输入|素材|第三段/u.test(command)) return 'input'
  if (/约束|限制|验收|第四段/u.test(command)) return 'constraints'
  if (/输出格式|格式|json|第五段/u.test(command)) return 'output_format'
  return null
}

export function applyVoiceCommandToSchema(command: string, schema: PromptSchema) {
  const normalized = normalizeText(command)
  const nextSchema = { ...schema }

  if (!normalized) {
    return { applied: false, nextSchema, summary: '', affectedFields: [] as PromptFieldName[] }
  }

  if (/输出成?\s*json|改成?\s*json|json输出/u.test(normalized)) {
    nextSchema.output_format = '请输出为结构化 JSON，字段名保持英文 snake_case，并补充必要说明。'
    return {
      applied: true,
      nextSchema,
      summary: '已把输出格式调整为 JSON。',
      affectedFields: ['output_format'] as PromptFieldName[],
    }
  }

  if (/加验收标准|补充验收标准/u.test(normalized)) {
    nextSchema.constraints = appendSentence(nextSchema.constraints, '补充明确的验收标准，说明完成条件与检查方式。')
    return {
      applied: true,
      nextSchema,
      summary: '已补充验收标准要求。',
      affectedFields: ['constraints'] as PromptFieldName[],
    }
  }

  if (/改成工程说明|语气改成工程说明/u.test(normalized)) {
    nextSchema.context = appendSentence(nextSchema.context, '整体语气调整为工程说明风格，表达准确、克制、可执行。')
    nextSchema.output_format = appendSentence(nextSchema.output_format, '输出风格偏工程说明，避免营销化表达。')
    return {
      applied: true,
      nextSchema,
      summary: '已把整体语气调整为工程说明。',
      affectedFields: ['context', 'output_format'] as PromptFieldName[],
    }
  }

  if (/更简洁|简洁一点|删掉冗余|精简/u.test(normalized)) {
    nextSchema.constraints = appendSentence(nextSchema.constraints, '删除冗余表述，保留必要信息，整体更简洁。')
    return {
      applied: true,
      nextSchema,
      summary: '已加入“更简洁、删掉冗余”的要求。',
      affectedFields: ['constraints'] as PromptFieldName[],
    }
  }

  const field = resolveFieldFromCommand(normalized)
  if (field && /加|补充|增加/u.test(normalized)) {
    const payload = extractInstructionPayload(normalized)
    const addition = payload.replace(/^(第[一二三四五]段|任务目标|背景|输入信息|输入|约束|输出格式)\s*/u, '')
    nextSchema[field] = appendSentence(nextSchema[field], addition || '请根据这条语音命令补充内容。')
    return {
      applied: true,
      nextSchema,
      summary: `已把补充内容应用到${promptFieldMeta.find((item) => item.key === field)?.label ?? field}。`,
      affectedFields: [field] as PromptFieldName[],
    }
  }

  return { applied: false, nextSchema, summary: '', affectedFields: [] as PromptFieldName[] }
}
