import type { PromptRecord, SessionState, SettingsState, TemplateOption } from '../lib/types'
import { createDefaultFieldLocks, createPromptVersion, transcriptToSchema, schemaToText } from '../lib/utils'

const initialTranscript =
  '把这个菜单栏工具的前端界面做出来，先做 UI，不接真实后端，但是要把状态和接口先预留好。'
const initialSchema = transcriptToSchema(initialTranscript, 'codex')
const seedVersion = createPromptVersion({
  label: '初始草稿',
  source: 'seed',
  transcript: initialTranscript,
  schema: initialSchema,
})

export const templateOptions: TemplateOption[] = [
  { id: 'general', label: '通用', description: '整理为通用 AI 指令格式' },
  { id: 'codex', label: 'Codex', description: '强调执行步骤、文件范围与验收标准' },
  { id: 'product', label: '产品', description: '突出需求、背景、目标用户与交付项' },
  { id: 'writing', label: '写作', description: '偏向文案改写、润色与结构整理' },
  { id: 'custom', label: '自定义', description: '保留可自定义模板占位，后续接后端' },
]

export const initialSession: SessionState = {
  status: 'idle',
  connection: 'connected',
  mode: 'codex',
  countdown: 0,
  revisionMode: false,
  recordingContext: 'fresh',
  transcript: initialTranscript,
  schema: initialSchema,
  fieldLocks: createDefaultFieldLocks(),
  versions: [seedVersion],
  selectedVersionId: seedVersion.id,
}

export const mockHistory: PromptRecord[] = [
  {
    id: 'rec-001',
    createdAt: '2026-04-04T12:10:00.000Z',
    mode: 'codex',
    status: 'success',
    summary: '把需求描述整理成适合 Codex 执行的 prompt',
    transcript:
      '帮我把这个需求变成给 Codex 的 prompt，重点放在状态机、视图结构和本地 mock 数据。',
    result: schemaToText(
      transcriptToSchema(
        '帮我把这个需求变成给 Codex 的 prompt，重点放在状态机、视图结构和本地 mock 数据。',
        'codex',
      ),
    ),
  },
  {
    id: 'rec-002',
    createdAt: '2026-04-04T11:26:00.000Z',
    mode: 'product',
    status: 'success',
    summary: '生成产品需求摘要与交互优先级',
    transcript: '把刚才会议里的需求重点提炼成一个可执行 PRD 摘要。',
    result: schemaToText(transcriptToSchema('把刚才会议里的需求重点提炼成一个可执行 PRD 摘要。', 'product')),
  },
  {
    id: 'rec-003',
    createdAt: '2026-04-04T10:54:00.000Z',
    mode: 'writing',
    status: 'error',
    summary: '失败示例：网络波动导致 prompt 整理超时',
    transcript: '把这段口播改成一个简短但是有节奏感的活动文案。',
    result: 'MiniMax 请求超时，已建议回退到仅展示 transcript。',
  },
]

export const defaultSettings: SettingsState = {
  shortcut: '⌥ Space',
  recordingDuration: 0,
  launchAtLogin: true,
  autoCopy: true,
  autoSaveHistory: true,
  fallbackOnFailure: true,
  whisperPath: '/path/to/whisper-cli',
  modelPath: '/path/to/ggml-small.bin',
  baseUrl: 'https://api.minimaxi.com/v1',
  apiKey: 'sk-cn-demo-placeholder',
  model: 'MiniMax-M2.7',
  selectedTemplate: 'codex',
}

export const mockTranscriptChunks = [
  '这是一个 Mac 菜单栏工具，名字叫 Voice Prompt。',
  '它不是聊天应用，而是把语音整理成高质量 Prompt 的工作台。',
  '首页需要改成左右双栏，左边负责语音输入和转写草稿，右边负责优化后的 Prompt。',
  '录音时要实时显示转写进度，录完后用户自己决定什么时候点击优化。',
]

export const mockSupplementChunks = [
  '补充一点，左边的转写区需要支持后续继续语音输入。',
  '右边编辑器要支持选中局部内容后做局部优化，不影响全文。',
]
