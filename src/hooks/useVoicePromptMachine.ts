import { useEffect, useMemo, useRef, useState } from 'react'
import { initialSession, mockSupplementChunks, mockTranscriptChunks } from '../data/mock'
import { isTauriRuntime, mockBackend, optimizePrompt, startRecording, stopRecordingAndTranscribe } from '../lib/backend'
import { buildSummary, createDefaultFieldLocks, schemaToText, transcriptToSchema } from '../lib/utils'
import type { ProcessStatus, PromptFieldName, PromptRecord, SessionState, SettingsState } from '../lib/types'

export function useVoicePromptMachine(
  settings: SettingsState,
  onSaveRecord: (record: PromptRecord) => void,
) {
  const [session, setSession] = useState<SessionState>(initialSession)
  const streamTimerRef = useRef<number | null>(null)
  const stopRequestedRef = useRef(false)
  const transcriptSnapshotRef = useRef('')

  const statusSequence: ProcessStatus[] = useMemo(
    () => ['idle', 'recording', 'transcribing', 'rewriting', 'success', 'error'],
    [],
  )

  useEffect(() => {
    return () => {
      if (streamTimerRef.current) {
        window.clearInterval(streamTimerRef.current)
      }
    }
  }, [])

  function clearStreamTimer() {
    if (streamTimerRef.current) {
      window.clearInterval(streamTimerRef.current)
      streamTimerRef.current = null
    }
  }

  function startMockStream(supplement: boolean) {
    const chunks = supplement ? mockSupplementChunks : mockTranscriptChunks
    let index = 0

    clearStreamTimer()
    streamTimerRef.current = window.setInterval(() => {
      if (index >= chunks.length || stopRequestedRef.current) {
        clearStreamTimer()
        return
      }

      const chunk = chunks[index]
      index += 1
      setSession((current) => ({
        ...current,
        transcript: appendTranscript(current.transcript, chunk),
      }))
    }, 700)
  }

  async function startStreamingRecording(supplement = false, mode = session.mode) {
    if (session.status === 'recording' || session.status === 'transcribing' || session.status === 'rewriting') {
      return
    }

    stopRequestedRef.current = false
    transcriptSnapshotRef.current = session.transcript

    setSession((current) => ({
      ...current,
      mode,
      status: 'recording',
      errorMessage: undefined,
      recordingContext: supplement ? 'supplement' : 'fresh',
      revisionMode: supplement ? true : current.revisionMode,
    }))

    try {
      await startRecording(settings)
      if (!isTauriRuntime()) {
        startMockStream(supplement)
      }
    } catch (error) {
      clearStreamTimer()
      setSession((current) => ({
        ...current,
        status: 'error',
        errorMessage: error instanceof Error ? error.message : '启动录音失败',
      }))
    }
  }

  async function stopRecording(mode = session.mode) {
    if (session.status !== 'recording') {
      return
    }

    stopRequestedRef.current = true
    clearStreamTimer()

    setSession((current) => ({
      ...current,
      status: 'transcribing',
      errorMessage: undefined,
    }))

    try {
      const response = await stopRecordingAndTranscribe({
        mode,
        duration: settings.recordingDuration,
        settings,
      })

      setSession((current) => {
        const baseTranscript = transcriptSnapshotRef.current.trim()
        const nextTranscript =
          current.recordingContext === 'supplement'
            ? appendTranscript(baseTranscript, response.transcript)
            : response.transcript

        return {
          ...current,
          mode,
          transcript: nextTranscript,
          status: 'success',
          errorMessage: undefined,
        }
      })
    } catch (error) {
      setSession((current) => ({
        ...current,
        status: settings.fallbackOnFailure && current.transcript.trim() ? 'success' : 'error',
        errorMessage: error instanceof Error ? error.message : '转写失败',
      }))
    }
  }

  async function runOptimize(fieldToOptimize: PromptFieldName | 'all', mode = session.mode) {
    if (!session.transcript.trim() || session.status === 'recording' || session.status === 'rewriting') {
      return
    }

    const schema = sessionHasSchemaContent(session.schema) ? session.schema : transcriptToSchema(session.transcript, mode)

    setSession((current) => ({
      ...current,
      mode,
      status: 'rewriting',
      errorMessage: undefined,
      schema,
    }))

    try {
      const response = await optimizePrompt({
        mode,
        settings,
        transcript: session.transcript,
        schema,
        fieldLocks: session.fieldLocks,
        fieldToOptimize,
        revisionMode: session.revisionMode,
      })

      setSession((current) => ({
        ...current,
        mode,
        schema: response.schema,
        status: 'success',
        errorMessage: undefined,
        recordingContext: 'fresh',
      }))

      if (settings.autoSaveHistory) {
        onSaveRecord({
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          mode,
          status: 'success',
          transcript: session.transcript,
          result: schemaToText(response.schema),
          summary: buildSummary(schemaToText(response.schema)),
        })
      }
    } catch (error) {
      setSession((current) => ({
        ...current,
        status: settings.fallbackOnFailure && sessionHasSchemaContent(current.schema) ? 'success' : 'error',
        errorMessage: error instanceof Error ? error.message : '优化 Prompt 失败',
      }))
    }
  }

  function optimizeAllFields(mode = session.mode) {
    setSession((current) => ({
      ...current,
      schema: transcriptToSchema(current.transcript, mode),
    }))
    void runOptimize('all', mode)
  }

  function optimizeField(fieldName: PromptFieldName, mode = session.mode) {
    if (!sessionHasSchemaContent(session.schema)) {
      setSession((current) => ({
        ...current,
        schema: transcriptToSchema(current.transcript, mode),
      }))
    }
    void runOptimize(fieldName, mode)
  }

  function forceStatus(status: ProcessStatus) {
    setSession((current) => ({
      ...current,
      status,
      countdown: status === 'recording' ? settings.recordingDuration : 0,
      errorMessage: status === 'error' ? 'MiniMax 请求超时，已回退到仅展示转写结果。' : undefined,
    }))
  }

  function setMode(mode: typeof session.mode) {
    setSession((current) => ({ ...current, mode }))
  }

  function setTranscript(transcript: string) {
    setSession((current) => ({
      ...current,
      transcript,
    }))
  }

  function appendRealtimeChunk(chunk: string) {
    setSession((current) => ({
      ...current,
      transcript: appendTranscript(current.transcript, chunk),
    }))
  }

  function updateSchemaField(fieldName: PromptFieldName, value: string) {
    setSession((current) => ({
      ...current,
      schema: {
        ...current.schema,
        [fieldName]: value,
      },
    }))
  }

  function toggleFieldLock(fieldName: PromptFieldName) {
    setSession((current) => ({
      ...current,
      fieldLocks: {
        ...current.fieldLocks,
        [fieldName]: !current.fieldLocks[fieldName],
      },
    }))
  }

  function setRevisionMode(value: boolean) {
    setSession((current) => ({
      ...current,
      revisionMode: value,
    }))
  }

  function continueSupplement() {
    void startStreamingRecording(true, session.mode)
  }

  function clearTranscript() {
    clearStreamTimer()
    stopRequestedRef.current = false
    setSession((current) => ({
      ...initialSession,
      mode: current.mode,
      schema: current.schema,
      fieldLocks: current.fieldLocks,
      revisionMode: current.revisionMode,
    }))
  }

  function resetSchema() {
    setSession((current) => ({
      ...current,
      schema: transcriptToSchema(current.transcript, current.mode),
      fieldLocks: createDefaultFieldLocks(),
      status: current.status === 'rewriting' ? 'success' : current.status,
    }))
  }

  async function saveCurrentResult() {
    const rendered = schemaToText(session.schema)
    const record: PromptRecord = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      mode: session.mode,
      status: session.status === 'error' ? 'error' : 'success',
      transcript: session.transcript,
      result: rendered,
      summary: buildSummary(rendered || session.transcript),
    }

    onSaveRecord(record)
    await mockBackend.saveHistory(record)
  }

  return {
    session,
    statusSequence,
    setMode,
    startStreamingRecording,
    stopRecording,
    optimizeAllFields,
    optimizeField,
    forceStatus,
    setTranscript,
    appendRealtimeChunk,
    updateSchemaField,
    toggleFieldLock,
    setRevisionMode,
    continueSupplement,
    clearTranscript,
    resetSchema,
    saveCurrentResult,
  }
}

function appendTranscript(current: string, chunk: string) {
  const trimmedCurrent = current.trim()
  return trimmedCurrent ? `${trimmedCurrent}\n${chunk}` : chunk
}

function sessionHasSchemaContent(schema: SessionState['schema']) {
  return Object.values(schema).some((value) => value.trim().length > 0)
}
