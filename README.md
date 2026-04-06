# 语音提示增强器

语音提示增强器是一个面向 macOS 的 **语音驱动 Prompt IDE**。

它的核心不是“把语音转成文字”，而是：

- 把 Prompt 组织成结构化对象
- 支持字段级编辑与局部优化
- 支持锁定字段，避免整段重写
- 支持继续补充语音并持续迭代

一句话概括：

**让用户用语音编程 Prompt，而不是说一段话让模型帮你整理。**

## 这个项目不是在解决什么

语音转文字本身不是这个项目的护城河。

在 macOS 上：

- 系统自带语音输入
- 搜狗输入法等第三方输入法

都可以实现“音转文”。

所以这个项目的重点不是单纯的 STT，而是：

- 结构化
- 可局部控制
- 可语音驱动
- 可持续迭代

也就是一个真正的 Prompt IDE，而不是一次性生成器。

## 当前产品形态

首页是一个左右双栏工作台：

- 左侧：输入层
- 右侧：Prompt IDE

### 左侧输入层

- 实时转写
- 手动编辑 transcript
- 继续补充语音
- 语音修订开关

### 右侧 Prompt IDE

右侧不是大段文本，而是 `PromptSchema`：

```ts
{
  goal,
  context,
  input,
  constraints,
  output_format
}
```

每个字段都支持：

- 单独编辑
- 单独优化
- 单独锁定

## 当前核心能力

- Tauri 桌面应用壳
- React + TypeScript + Tailwind 前端
- 本地录音
- whisper.cpp 中文转写
- MiniMax 结构化优化
- PromptSchema 驱动的结构化编辑器
- 字段级优化
- 字段锁定
- 历史记录

## 技术栈

- Tauri
- React
- TypeScript
- TailwindCSS
- Rust
- Python
- Swift
- whisper.cpp
- MiniMax API

## 本地开发

### 1. 安装依赖

```bash
npm install
```

### 2. 准备本地依赖

你需要自己准备：

- `whisper.cpp` 可执行文件
- Whisper 模型文件
- MiniMax API Key

这些信息可以在应用设置页中填写。

默认占位配置不会带任何真实隐私信息。

### 3. 启动开发版

```bash
source "$HOME/.cargo/env"
npm run tauri dev
```

### 4. 构建前端

```bash
npm run build
```

### 5. 代码检查

```bash
npm run lint
source "$HOME/.cargo/env"
cargo check --manifest-path src-tauri/Cargo.toml
python3 -m py_compile backend/process_voice_prompt.py
```

## 目录结构

```text
src/
  App.tsx
  components/
  hooks/
  lib/

src-tauri/
  src/lib.rs
  tauri.conf.json

backend/
  process_voice_prompt.py
  record_audio.swift
```

## 核心文件

- `src/components/MainPanelView.tsx`
  - 主工作台 UI
- `src/hooks/useVoicePromptMachine.ts`
  - 前端状态机与交互逻辑
- `src/lib/types.ts`
  - PromptSchema 和应用核心类型
- `src/lib/backend.ts`
  - 前端与 Tauri/Rust 的桥接
- `src-tauri/src/lib.rs`
  - 桌面壳层、菜单、录音桥接、后端调用
- `backend/process_voice_prompt.py`
  - 本地转写与结构化优化
- `backend/record_audio.swift`
  - macOS 录音器

## 当前仍在推进的能力

以下能力已经在设计方向中，但仍会继续完善：

- 更强的语音命令编辑
  - 比如“第三段加验收标准”
  - “把输出格式改成 JSON”
- Prompt 版本流
  - 回退
  - 对比
  - 分支
- 更强约束的模式模板系统
  - Codex
  - 产品
  - 分析
  - 写作
  - 自定义

## 为什么它不是 GPT 语音的简单替代品

如果一个产品只是：

`说一句 -> 出一段文本 -> 结束`

那它非常容易被 GPT 语音或系统输入法替代。

这个项目的目标不是这样。

它真正要实现的是：

`说 -> 出结构 -> 点优化 -> 局部改 -> 再说一句 -> 自动应用 -> 成最终 Prompt`

重点在于：

- 不重写全部
- 只改需要改的字段
- 保持结构稳定
- 让 Prompt 像代码一样可迭代

## 开源说明

本仓库是一个可继续演进的开源原型，欢迎围绕以下方向贡献：

- PromptSchema 设计
- 模式模板系统
- 版本流
- 语音编辑命令
- macOS 体验优化
- 本地模型 / API 兼容层

## License

MIT
