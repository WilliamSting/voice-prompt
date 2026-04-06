#!/usr/bin/env python3
import argparse
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parent
RECORD_SWIFT = SCRIPT_DIR / "record_audio.swift"
RECORD_BIN = SCRIPT_DIR / "record_audio"
CAF_PATH = "/tmp/voice-prompt-input.caf"
WAV_PATH = "/tmp/voice-prompt-input.wav"
FIELD_LABELS = {
    "goal": "任务目标",
    "context": "背景",
    "input": "输入信息",
    "constraints": "约束",
    "output_format": "输出格式",
}


def compile_recorder() -> Path:
    if RECORD_BIN.exists():
        return RECORD_BIN

    subprocess.run(
        ["swiftc", str(RECORD_SWIFT), "-o", str(RECORD_BIN)],
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    return RECORD_BIN


def convert_recording_to_wav(caf_path: str = CAF_PATH, wav_path: str = WAV_PATH) -> str:
    if os.path.exists(wav_path):
        os.remove(wav_path)

    subprocess.run(
        ["afconvert", "-f", "WAVE", "-d", "LEI16@16000", "-c", "1", caf_path, wav_path],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    return wav_path


def record_audio(duration: int) -> str:
    recorder = compile_recorder()
    for path in (CAF_PATH, WAV_PATH):
        if os.path.exists(path):
            os.remove(path)

    subprocess.run(
        [str(recorder), "--duration", str(duration), "--output", WAV_PATH],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    return WAV_PATH


def resolve_recording_path() -> str:
    if os.path.exists(WAV_PATH):
        return WAV_PATH
    if os.path.exists(CAF_PATH):
        return convert_recording_to_wav()
    raise FileNotFoundError("未找到录音文件")


def transcribe_audio(whisper_bin: str, model_path: str, wav_path: str) -> str:
    output = subprocess.check_output(
        [whisper_bin, "-m", model_path, "-f", wav_path, "-l", "zh"],
        text=True,
    )
    return output


def extract_transcript(raw_text: str) -> str:
    matches = re.findall(r"\[\d{2}:\d{2}:\d{2}\.\d{3} --> .*?\]\s+(.*)", raw_text)
    if matches:
        transcript = "\n".join(line.strip() for line in matches if line.strip())
        if transcript:
            return clean_transcript_text(transcript)
    return clean_transcript_text(raw_text.strip())


def clean_transcript_text(text: str) -> str:
    banned_patterns = [
        r"字幕",
        r"製作",
        r"制作",
        r"subtitle",
        r"caption",
        r"transcri",
        r"\bby\b",
        r"j\s*chong",
        r"bwd6",
        r"貝爾",
        r"贝尔",
    ]

    cleaned_lines = []
    seen = set()

    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line:
            continue

        normalized = re.sub(r"\s+", " ", line)
        lowered = normalized.lower()

        if any(re.search(pattern, lowered, flags=re.IGNORECASE) for pattern in banned_patterns):
            continue

        if not re.search(r"[\u4e00-\u9fff]", normalized):
            letters_only = re.sub(r"[^a-zA-Z]", "", normalized)
            if letters_only and len(letters_only) <= 24:
                continue

        if normalized in seen:
            continue

        seen.add(normalized)
        cleaned_lines.append(normalized)

    return "\n".join(cleaned_lines).strip()


def strip_think_tags(content: str) -> str:
    cleaned = re.sub(r"<think>.*?</think>\s*", "", content, flags=re.DOTALL).strip()
    return cleaned or content.strip()


def call_chat_completion(base_url: str, api_key: str, model: str, prompt: str) -> str:
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.7,
    }
    request = urllib.request.Request(
        base_url.rstrip("/") + "/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=90) as response:
            data = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"MiniMax API error: {body}") from exc

    content = data["choices"][0]["message"]["content"]
    return strip_think_tags(content)


def create_empty_schema() -> dict:
    return {
        "goal": "",
        "context": "",
        "input": "",
        "constraints": "",
        "output_format": "",
    }


def transcript_to_schema(transcript: str, mode: str) -> dict:
    clean = transcript.strip()
    schema = create_empty_schema()
    if not clean:
        return schema

    mode_hints = {
        "general": {
            "constraints": "保留原意，不编造事实，优先输出简体中文。",
            "output_format": "使用清晰分段，方便直接复制给 AI。",
        },
        "codex": {
            "constraints": "说明目标、范围、约束、验收方式，避免歧义。",
            "output_format": "按任务目标、上下文、修改范围、验收标准输出。",
        },
        "product": {
            "constraints": "强调用户价值、业务背景和交付边界。",
            "output_format": "按目标、背景、需求、约束、交付物输出。",
        },
        "writing": {
            "constraints": "保持表达自然、准确、简洁。",
            "output_format": "输出适合直接用于写作或改写的结构化说明。",
        },
        "custom": {
            "constraints": "根据用户后续要求继续细化。",
            "output_format": "保留结构化字段，便于继续编辑。",
        },
    }

    first_sentence = re.split(r"[。！？\n]", clean)[0].strip() or clean
    schema["goal"] = first_sentence
    schema["context"] = "这是通过语音输入生成的 Prompt 草稿，后续还会继续编辑和修订。"
    schema["input"] = clean
    schema["constraints"] = mode_hints.get(mode, mode_hints["general"])["constraints"]
    schema["output_format"] = mode_hints.get(mode, mode_hints["general"])["output_format"]
    return schema


def build_field_rewrite_prompt(transcript: str, mode: str, schema: dict, field_name: str) -> str:
    field_label = FIELD_LABELS[field_name]
    return f"""你正在帮助用户编辑一个结构化 Prompt 对象。

模式：
{mode}

完整 transcript：
{transcript}

当前 PromptSchema：
{json.dumps(schema, ensure_ascii=False, indent=2)}

当前要优化的字段：
{field_label}（{field_name}）

要求：
- 只输出该字段的新内容
- 不要输出 JSON，不要输出标题
- 需要与其他字段风格一致
- 输出简体中文
"""


def optimize_schema_fields(settings: dict, transcript: str, mode: str, schema: dict, field_locks: dict, field_to_optimize: str) -> dict:
    next_schema = dict(schema)
    fields = [field_to_optimize] if field_to_optimize != "all" else list(FIELD_LABELS.keys())

    for field_name in fields:
        if field_locks.get(field_name):
            continue
        rewritten = call_chat_completion(
            settings["baseUrl"],
            settings["apiKey"],
            settings["model"],
            build_field_rewrite_prompt(transcript, mode, next_schema, field_name),
        )
        next_schema[field_name] = rewritten.strip()

    return next_schema


def transcribe_only(payload: dict) -> dict:
    settings = payload["settings"]
    skip_recording = bool(payload.get("skipRecording", False))
    duration = int(payload.get("duration", 0))

    wav_path = resolve_recording_path() if skip_recording else record_audio(duration)
    raw_transcript = transcribe_audio(settings["whisperPath"], settings["modelPath"], wav_path)
    transcript = extract_transcript(raw_transcript)
    return {"transcript": transcript, "schema": create_empty_schema(), "audioPath": wav_path}


def rewrite_schema(payload: dict) -> dict:
    settings = payload["settings"]
    transcript = payload["transcript"]
    mode = payload["mode"]
    schema = payload.get("schema") or transcript_to_schema(transcript, mode)
    field_locks = payload.get("fieldLocks") or {}
    field_to_optimize = payload.get("fieldToOptimize") or "all"

    next_schema = optimize_schema_fields(settings, transcript, mode, schema, field_locks, field_to_optimize)
    return {"transcript": transcript, "schema": next_schema, "audioPath": None}


def full_process(payload: dict) -> dict:
    transcribed = transcribe_only(payload)
    next_payload = dict(payload)
    next_payload["transcript"] = transcribed["transcript"]
    next_payload["schema"] = transcript_to_schema(transcribed["transcript"], payload["mode"])
    next_payload["fieldToOptimize"] = "all"
    optimized = rewrite_schema(next_payload)
    optimized["audioPath"] = transcribed["audioPath"]
    return optimized


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--payload", required=True)
    args = parser.parse_args()
    payload = json.loads(args.payload)
    action = payload.get("action", "full_process")

    try:
      if action == "transcribe_only":
          response = transcribe_only(payload)
      elif action == "rewrite_prompt":
          response = rewrite_schema(payload)
      else:
          response = full_process(payload)

      print(json.dumps(response, ensure_ascii=False))
      return 0
    except Exception as exc:
      print(json.dumps({"error": str(exc)}, ensure_ascii=False), file=sys.stderr)
      return 1


if __name__ == "__main__":
    raise SystemExit(main())
