# 语音提示增强器

一个面向 macOS 的 **语音驱动 Prompt IDE**。

它的重点不是“把语音转成文字”，而是把 Prompt 做成一个**可编辑、可局部控制、可持续迭代的结构化对象**。

一句话描述：

**让用户用语音编程 Prompt，而不是说一段话让模型帮你整理。**

## 这个项目解决的不是 STT

语音转文字本身不是这个项目的护城河。

在 macOS 上，系统自带语音输入、搜狗输入法等工具都能完成“音转文”。  
这个项目真正想做的是：

- 结构化 PromptSchema，而不是一整段文本
- 字段级优化，而不是整段重写
- 锁定字段，保证局部可控
- 语音修订，把语音当成编辑命令而不只是输入内容
- 版本流，让 Prompt 像代码一样迭代

所以它更接近 Prompt IDE，而不是语音整理器。

## 当前产品形态

首页是一个左右双栏工作台。

### 左侧：输入层

- 开始录音 / 停止录音 / 继续补充
- 实时转写草稿区
- 手动编辑 transcript
- “本次补充用于修订当前 Prompt” 开关

### 右侧：Prompt IDE

右侧不是大段结果文本，而是结构化 `PromptSchema`：

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

- 手动编辑
- 单独优化
- 单独锁定

右侧同时带有：

- 版本流快照
- 手动保存版本
- 回退到指定版本

## 当前已经实现的能力

- Tauri macOS 桌面应用壳
- React + TypeScript + TailwindCSS 前端
- 原生 macOS 窗口标题栏
- 本地录音
- whisper.cpp 中文转写
- MiniMax 结构化优化
- PromptSchema 驱动的结构化编辑器
- 字段级优化
- 字段锁定
- 版本快照
- 基础语音命令修订
- 历史记录
- 一键同步到 GitHub 的脚本

## 当前支持的语音修订方向

当前版本已经支持一批高频修订命令的第一版，例如：

- “加验收标准”
- “输出成 JSON”
- “改成工程说明”
- “删掉冗余”
- “第三段加……”
- “背景补充……”

这些命令会优先尝试**直接修改 schema 字段**，而不是只把内容追加到 transcript。

## 还在继续推进的能力

下面这些方向已经进入产品路线，但还没有完全做完：

- 更强的语音命令理解
  - 先判断“这是补充内容”还是“这是编辑命令”
  - 再决定是追加 transcript 还是修改 schema
- 更成熟的版本流
  - 版本对比
  - 分支
  - 标记可用版本
- 更强约束的模板系统
  - Codex
  - 产品
  - 分析
  - 写作
  - 自定义
- 更稳定的局部优化体验
  - 不同字段使用不同优化策略
  - 更细粒度的局部重写

## 为什么它不该被理解成“GPT 语音替代品”

如果一个产品只是：

`说一句 -> 出一段文本 -> 结束`

那它很容易被 GPT 语音、macOS 语音输入或输入法语音功能替代。

这个项目的目标不是这样。

它要实现的是：

`说 -> 出结构 -> 点优化 -> 局部改 -> 再说一句 -> 自动应用 -> 成最终 Prompt`

关键不是“能不能说”，而是：

- 能不能只改一段
- 能不能锁住不该动的部分
- 能不能用语音直接编辑结构
- 能不能保留版本感

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
仓库默认不会携带真实路径、真实模型文件或真实密钥。

### 3. 启动开发版

```bash
source "$HOME/.cargo/env"
npm run tauri dev
```

### 4. 构建应用

```bash
npm run build
source "$HOME/.cargo/env"
npm run tauri build
```

### 5. 代码检查

```bash
npm run lint
source "$HOME/.cargo/env"
cargo check --manifest-path src-tauri/Cargo.toml
python3 -m py_compile backend/process_voice_prompt.py
```

## 同步到 GitHub

项目内置了一条同步脚本，目标是把：

`本地修改 -> 检查 -> 提交 -> 推送`

收敛成一条命令。

### 一键同步

```bash
npm run sync:repo -- "feat: update prompt ide"
```

如果本地还没有 `origin`，第一次可以把仓库地址作为第二个参数传入：

```bash
npm run sync:repo -- "feat: first publish" "https://github.com/<your-name>/<repo>.git"
```

这条脚本会自动执行：

- 检查 `origin`
- 检查明显敏感文件名
- 执行 `build`
- 执行 `lint`
- 执行 `cargo check`
- 执行 Python 语法检查
- 自动提交
- 自动推送当前分支

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

scripts/
  sync_repo.sh
```

## 核心文件

- `src/components/MainPanelView.tsx`
  - 主工作台 UI
- `src/hooks/useVoicePromptMachine.ts`
  - 前端状态机、版本流、语音修订逻辑
- `src/lib/types.ts`
  - PromptSchema、PromptVersion 等核心类型
- `src/lib/utils.ts`
  - schema 转换、语音命令应用、版本摘要
- `src/lib/backend.ts`
  - 前端与 Tauri/Rust 的桥接
- `src-tauri/src/lib.rs`
  - 桌面壳层、菜单、录音桥接、后端调用
- `backend/process_voice_prompt.py`
  - 本地转写与结构化优化
- `backend/record_audio.swift`
  - macOS 录音器

## 开源说明

这是一个仍在快速演进中的开源原型。

如果你也在关注：

- PromptSchema 设计
- 局部控制与字段锁定
- 语音编辑命令
- Prompt 版本流
- macOS 上更自然的语音 IDE 体验

欢迎一起继续推进。

## License

MIT
