use serde::{Deserialize, Serialize};
use std::fs;
use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use std::process::{Child, Command};
use std::sync::Mutex;
use std::thread;
use tauri::{
  menu::{AboutMetadataBuilder, Menu, MenuItem, PredefinedMenuItem, Submenu},
  tray::TrayIconBuilder,
  AppHandle, Emitter, Manager, State,
};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

#[derive(Debug, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct BackendSettings {
  whisper_path: String,
  model_path: String,
  base_url: String,
  api_key: String,
  model: String,
}

#[derive(Debug, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct StartRecordingPayload {
  settings: BackendSettings,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct VoicePromptPayload {
  mode: String,
  duration: u32,
  skip_recording: Option<bool>,
  settings: BackendSettings,
  transcript: Option<String>,
  revision_mode: Option<bool>,
  schema: Option<PromptSchema>,
  field_locks: Option<PromptFieldLocks>,
  field_to_optimize: Option<String>,
  action: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct PromptSchema {
  goal: String,
  context: String,
  input: String,
  constraints: String,
  output_format: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct PromptFieldLocks {
  goal: bool,
  context: bool,
  input: bool,
  constraints: bool,
  output_format: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct VoicePromptResponse {
  transcript: String,
  schema: PromptSchema,
  audio_path: Option<String>,
}

#[derive(Debug, Deserialize)]
struct VoicePromptScriptResponse {
  transcript: String,
  schema: PromptSchema,
  #[serde(rename = "audioPath")]
  audio_path: Option<String>,
}

struct RecorderState {
  child: Mutex<Option<Child>>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct TranscriptChunkEvent {
  text: String,
  segment_path: String,
}

fn backend_script_path(app: &AppHandle) -> Result<PathBuf, String> {
  if let Ok(resource_dir) = app.path().resource_dir() {
    let bundled = resource_dir.join("backend").join("process_voice_prompt.py");
    if bundled.exists() {
      return Ok(bundled);
    }
  }

  let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
  let dev_path = manifest_dir
    .parent()
    .ok_or_else(|| "Failed to resolve project root".to_string())?
    .join("backend")
    .join("process_voice_prompt.py");

  if dev_path.exists() {
    Ok(dev_path)
  } else {
    Err(format!("Backend script not found: {}", dev_path.display()))
  }
}

fn show_main_window(app: &AppHandle) -> Result<(), String> {
  let window = app
    .get_webview_window("main")
    .ok_or_else(|| "Main window not found".to_string())?;

  window.show().map_err(|error| error.to_string())?;
  window.unminimize().map_err(|error| error.to_string())?;
  window.set_focus().map_err(|error| error.to_string())?;
  Ok(())
}

fn backend_dir(app: &AppHandle) -> Result<PathBuf, String> {
  if let Ok(resource_dir) = app.path().resource_dir() {
    let bundled = resource_dir.join("backend");
    if bundled.exists() {
      return Ok(bundled);
    }
  }

  let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
  manifest_dir
    .parent()
    .ok_or_else(|| "Failed to resolve project root".to_string())
    .map(|path| path.join("backend"))
}

fn trigger_quick_input(app: &AppHandle) -> Result<(), String> {
  show_main_window(app)?;
  app
    .emit("voice-prompt://quick-input", ())
    .map_err(|error| error.to_string())
}

fn build_app_menu(app: &AppHandle) -> Result<Menu<tauri::Wry>, tauri::Error> {
  let about = PredefinedMenuItem::about(
    app,
    Some("关于语音 Prompt 增强器"),
    Some(
      AboutMetadataBuilder::new()
        .name(Some("语音提示增强器".to_string()))
        .version(Some("0.1.0".to_string()))
        .build(),
    ),
  )?;
  let services = PredefinedMenuItem::services(app, Some("服务"))?;
  let hide = PredefinedMenuItem::hide(app, Some("隐藏语音提示增强器"))?;
  let hide_others = PredefinedMenuItem::hide_others(app, Some("隐藏其他"))?;
  let show_all = PredefinedMenuItem::show_all(app, Some("全部显示"))?;
  let quit = PredefinedMenuItem::quit(app, Some("退出语音提示增强器"))?;

  let close_window = PredefinedMenuItem::close_window(app, Some("关闭窗口"))?;
  let minimize = PredefinedMenuItem::minimize(app, Some("最小化"))?;
  let maximize = PredefinedMenuItem::maximize(app, Some("缩放"))?;
  let fullscreen = PredefinedMenuItem::fullscreen(app, Some("进入全屏"))?;

  let undo = PredefinedMenuItem::undo(app, Some("撤销"))?;
  let redo = PredefinedMenuItem::redo(app, Some("重做"))?;
  let cut = PredefinedMenuItem::cut(app, Some("剪切"))?;
  let copy = PredefinedMenuItem::copy(app, Some("复制"))?;
  let paste = PredefinedMenuItem::paste(app, Some("粘贴"))?;
  let select_all = PredefinedMenuItem::select_all(app, Some("全选"))?;

  let show_main = MenuItem::with_id(app, "show_main_panel", "显示主面板", true, None::<&str>)?;
  let quick_input = MenuItem::with_id(app, "menu_quick_input", "快捷输入", true, Some("Option+Space"))?;
  let start_recording = MenuItem::with_id(app, "menu_start_recording", "开始录音", true, None::<&str>)?;

  let app_submenu = Submenu::with_items(app, "应用", true, &[&about, &services, &hide, &hide_others, &show_all, &quit])?;
  let file_submenu = Submenu::with_items(app, "文件", true, &[&show_main, &quick_input, &start_recording, &close_window])?;
  let edit_submenu = Submenu::with_items(app, "文本", true, &[&undo, &redo, &cut, &copy, &paste, &select_all])?;
  let view_submenu = Submenu::with_items(app, "视图", true, &[&fullscreen])?;
  let window_submenu = Submenu::with_items(app, "窗口", true, &[&minimize, &maximize])?;
  let help_submenu = Submenu::with_items(app, "帮助", true, &[&about])?;

  Menu::with_items(
    app,
    &[
      &app_submenu,
      &file_submenu,
      &edit_submenu,
      &view_submenu,
      &window_submenu,
      &help_submenu,
    ],
  )
}

fn transcribe_chunk(whisper_path: &str, model_path: &str, audio_path: &str) -> Result<String, String> {
  let output = Command::new(whisper_path)
    .arg("-m")
    .arg(model_path)
    .arg("-f")
    .arg(audio_path)
    .arg("-l")
    .arg("zh")
    .arg("-nt")
    .arg("-np")
    .arg("--suppress-regex")
    .arg("(字幕|製作|制作|subtitle|caption|j\\s*chong|bwd6|貝爾|贝尔)")
    .output()
    .map_err(|error| format!("Failed to transcribe chunk: {error}"))?;

  if !output.status.success() {
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    return Err(if stderr.is_empty() {
      "Chunk transcription failed".to_string()
    } else {
      stderr
    });
  }

  Ok(clean_transcript_chunk(String::from_utf8_lossy(&output.stdout).trim()))
}

fn clean_transcript_chunk(raw: &str) -> String {
  let banned_terms = [
    "字幕", "製作", "制作", "subtitle", "caption", "j chong", "bwd6", "貝爾", "贝尔", "transcri",
  ];

  let mut seen = std::collections::HashSet::new();
  let mut cleaned = Vec::new();

  for line in raw.lines() {
    let normalized = line.split_whitespace().collect::<Vec<_>>().join(" ");
    let trimmed = normalized.trim();
    if trimmed.is_empty() {
      continue;
    }

    let lowered = trimmed.to_lowercase();
    if banned_terms.iter().any(|term| lowered.contains(term)) {
      continue;
    }

    let has_cjk = trimmed.chars().any(|ch| ('\u{4e00}'..='\u{9fff}').contains(&ch));
    if !has_cjk {
      let letters_only: String = trimmed.chars().filter(|ch| ch.is_ascii_alphabetic()).collect();
      if !letters_only.is_empty() && letters_only.len() <= 24 {
        continue;
      }
    }

    if seen.insert(trimmed.to_string()) {
      cleaned.push(trimmed.to_string());
    }
  }

  cleaned.join("\n")
}

fn spawn_segment_listener(app: AppHandle, settings: BackendSettings, stdout: impl std::io::Read + Send + 'static) {
  thread::spawn(move || {
    let reader = BufReader::new(stdout);

    for line in reader.lines() {
      let Ok(line) = line else {
        continue;
      };

      if let Some(path) = line.strip_prefix("SEGMENT_READY:") {
        match transcribe_chunk(&settings.whisper_path, &settings.model_path, path.trim()) {
          Ok(text) if !text.trim().is_empty() => {
            let _ = app.emit(
              "voice-prompt://transcript-chunk",
              TranscriptChunkEvent {
                text,
                segment_path: path.trim().to_string(),
              },
            );
          }
          _ => {}
        }
      }
    }
  });
}

#[tauri::command]
fn start_recording(
  app: AppHandle,
  recorder: State<'_, RecorderState>,
  payload: StartRecordingPayload,
) -> Result<(), String> {
  let backend = backend_dir(&app)?;
  let recorder_binary = backend.join("record_audio");
  let recorder_source = backend.join("record_audio.swift");
  let wav_path = "/tmp/voice-prompt-input.wav";
  let control_path = "/tmp/voice-prompt-stop";
  let segments_dir = "/tmp/voice-prompt-segments";

  if let Some(mut child) = recorder.child.lock().map_err(|error| error.to_string())?.take() {
    let _ = child.kill();
    let _ = child.wait();
  }

  let _ = fs::remove_file(wav_path);
  let _ = fs::remove_file(control_path);
  let _ = fs::remove_dir_all(segments_dir);

  let compile = Command::new("swiftc")
    .arg(&recorder_source)
    .arg("-o")
    .arg(&recorder_binary)
    .output()
    .map_err(|error| format!("Failed to compile recorder: {error}"))?;

  if !compile.status.success() {
    return Err(String::from_utf8_lossy(&compile.stderr).trim().to_string());
  }

  let mut child = Command::new(&recorder_binary)
    .arg("--output")
    .arg(wav_path)
    .arg("--control")
    .arg(control_path)
    .arg("--segments-dir")
    .arg(segments_dir)
    .arg("--segment-ms")
    .arg("1800")
    .stdout(std::process::Stdio::piped())
    .spawn()
    .map_err(|error| format!("Failed to start recorder: {error}"))?;

  if let Some(stdout) = child.stdout.take() {
    spawn_segment_listener(app, payload.settings.clone(), stdout);
  }

  *recorder.child.lock().map_err(|error| error.to_string())? = Some(child);
  Ok(())
}

fn run_voice_prompt_blocking(app: &AppHandle, payload: VoicePromptPayload) -> Result<VoicePromptResponse, String> {
  let script_path = backend_script_path(&app)?;
  let python = "/usr/bin/python3";

  let payload_json = serde_json::json!({
    "action": payload.action,
    "mode": payload.mode,
    "duration": payload.duration,
    "skipRecording": payload.skip_recording,
    "transcript": payload.transcript,
    "revisionMode": payload.revision_mode,
    "schema": payload.schema,
    "fieldLocks": payload.field_locks,
    "fieldToOptimize": payload.field_to_optimize,
    "settings": {
      "whisperPath": payload.settings.whisper_path,
      "modelPath": payload.settings.model_path,
      "baseUrl": payload.settings.base_url,
      "apiKey": payload.settings.api_key,
      "model": payload.settings.model,
    }
  })
  .to_string();

  let output = Command::new(python)
    .arg(script_path)
    .arg("--payload")
    .arg(payload_json)
    .output()
    .map_err(|error| format!("Failed to launch backend script: {error}"))?;

  if !output.status.success() {
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    return Err(if stderr.is_empty() {
      "Voice processing failed".to_string()
    } else {
      stderr
    });
  }

  let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
  let parsed: VoicePromptScriptResponse =
    serde_json::from_str(&stdout).map_err(|error| format!("Invalid backend response: {error}\n{stdout}"))?;

  Ok(VoicePromptResponse {
    transcript: parsed.transcript,
    schema: parsed.schema,
    audio_path: parsed.audio_path,
  })
}

#[tauri::command]
async fn run_voice_prompt(app: AppHandle, payload: VoicePromptPayload) -> Result<VoicePromptResponse, String> {
  tauri::async_runtime::spawn_blocking(move || run_voice_prompt_blocking(&app, payload))
    .await
    .map_err(|error| format!("后台任务执行失败: {error}"))?
}

#[tauri::command]
async fn stop_recording_and_transcribe(
  app: AppHandle,
  recorder: State<'_, RecorderState>,
  payload: VoicePromptPayload,
) -> Result<VoicePromptResponse, String> {
  {
    fs::write("/tmp/voice-prompt-stop", "stop").map_err(|error| format!("Failed to stop recorder: {error}"))?;
    let child = recorder.child.lock().map_err(|error| error.to_string())?.take();
    if let Some(mut child) = child {
      child.wait().map_err(|error| format!("Failed waiting recorder: {error}"))?;
    }
  }

  let mut next_payload = payload;
  next_payload.duration = 0;
  next_payload.skip_recording = Some(true);
  next_payload.action = Some("transcribe_only".to_string());

  tauri::async_runtime::spawn_blocking(move || {
    let mut transcribe_payload = next_payload;
    transcribe_payload.action = Some("transcribe_only".to_string());
    run_voice_prompt_blocking(&app, transcribe_payload)
  })
  .await
  .map_err(|error| format!("后台任务执行失败: {error}"))?
}

#[tauri::command]
async fn rewrite_prompt(app: AppHandle, mut payload: VoicePromptPayload) -> Result<VoicePromptResponse, String> {
  payload.action = Some("rewrite_prompt".to_string());

  tauri::async_runtime::spawn_blocking(move || run_voice_prompt_blocking(&app, payload))
    .await
    .map_err(|error| format!("后台任务执行失败: {error}"))?
}

#[tauri::command]
async fn rewrite_selection(app: AppHandle, mut payload: VoicePromptPayload) -> Result<VoicePromptResponse, String> {
  payload.action = Some("rewrite_selection".to_string());

  tauri::async_runtime::spawn_blocking(move || run_voice_prompt_blocking(&app, payload))
    .await
    .map_err(|error| format!("后台任务执行失败: {error}"))?
}

#[tauri::command]
fn insert_text_into_active_input(text: String) -> Result<(), String> {
  let escaped = text.replace('\\', "\\\\").replace('"', "\\\"");
  let script = format!(
    r#"
set the clipboard to "{escaped}"
tell application "System Events"
  keystroke "v" using command down
end tell
"#
  );

  let output = Command::new("osascript")
    .arg("-e")
    .arg(script)
    .output()
    .map_err(|error| format!("Failed to run osascript: {error}"))?;

  if output.status.success() {
    Ok(())
  } else {
    Err(String::from_utf8_lossy(&output.stderr).trim().to_string())
  }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .manage(RecorderState {
      child: Mutex::new(None),
    })
    .invoke_handler(tauri::generate_handler![
      start_recording,
      run_voice_prompt,
      stop_recording_and_transcribe,
      rewrite_prompt,
      rewrite_selection,
      insert_text_into_active_input
    ])
    .setup(|app| {
      #[cfg(desktop)]
      {
        let app_menu = build_app_menu(app.handle())?;
        app.set_menu(app_menu)?;

        let show_item = MenuItem::with_id(app, "show", "显示主面板", true, None::<&str>)?;
        let quick_item = MenuItem::with_id(app, "quick_input", "快捷输入", true, None::<&str>)?;
        let record_item = MenuItem::with_id(app, "start_recording", "开始录音", true, None::<&str>)?;
        let quit_item = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
        let tray_menu = Menu::with_items(app, &[&show_item, &quick_item, &record_item, &quit_item])?;

        let app_handle = app.handle().clone();
        TrayIconBuilder::new()
          .icon(app.default_window_icon().unwrap().clone())
          .tooltip("语音提示增强器")
          .menu(&tray_menu)
          .show_menu_on_left_click(true)
          .on_menu_event(move |app, event| match event.id.as_ref() {
            "show" | "show_main_panel" => {
              let _ = show_main_window(app);
            }
            "quick_input" | "menu_quick_input" | "start_recording" | "menu_start_recording" => {
              let _ = trigger_quick_input(app);
            }
            "quit" => app.exit(0),
            _ => {}
          })
          .build(app)?;

        let shortcut = Shortcut::new(Some(Modifiers::ALT), Code::Space);
        let shortcut_for_handler = shortcut.clone();

        app.handle().plugin(
          tauri_plugin_global_shortcut::Builder::new()
            .with_handler(move |app, pressed_shortcut, event| {
              if pressed_shortcut == &shortcut_for_handler && event.state() == ShortcutState::Pressed {
                let _ = trigger_quick_input(app);
              }
            })
            .build(),
        )?;

        if !app_handle.global_shortcut().is_registered(shortcut) {
          app_handle.global_shortcut().register(shortcut)?;
        }
      }

      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
