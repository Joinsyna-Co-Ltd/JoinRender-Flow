# JoinRender-Flow

可视化节点编程工具，面向创意工作者，兼容 ComfyUI 插件系统。

## 项目背景

ComfyUI 功能强大，但学习成本较高。对于设计师和内容创作者来说，理解 Latent、VAE、CLIP 这些底层概念需要不少时间。

JoinRender-Flow 的目标是降低这个门槛——将复杂的 AI 生成流程封装成易用的节点模块，通过拖拽连线的方式构建工作流。

## 设计思路

**节点分类**

将节点简化为几类：
- **输入节点** — 文本、图像、视频、音频的入口
- **LLM 节点** — 负责理解用户意图，将自然语言转换为结构化提示词
- **媒体节点** — 调用生成模型，输出图像或视频
- **音频节点** — 语音合成、语音识别、音乐生成
- **3D 节点** — 3D 模型生成、贴图、动画
- **自定义节点** — HTTP 请求、代码执行、数据处理
- **输出节点** — 预览和导出结果

**角色一致性**

通过「角色参考」机制解决多镜头角色一致性问题：先生成一张标准参考图（T-Pose），后续生成节点通过专用输入端口（🔒 标记）引用该图像，确保角色外观统一。

## 主要功能

### API 集成

支持主流 AI 服务商，按需配置：

**文本模型**
- OpenAI (GPT-4, GPT-4o)
- Anthropic (Claude)
- Google (Gemini)
- DeepSeek
- Moonshot (Kimi)
- 智谱 (GLM)
- 通义千问
- MiniMax
- Ollama (本地)

**图像生成**
- OpenAI (DALL-E 3)
- Stability AI (SDXL)
- Midjourney (代理)
- Ideogram
- Leonardo AI
- ComfyUI (本地)
- SD WebUI (本地)

**视频生成**
- Runway (Gen-3, Gen-4)
- Pika Labs
- 可灵 AI
- Luma Dream Machine
- MiniMax 视频

**音频处理**
- OpenAI (Whisper, TTS)
- ElevenLabs
- Fish Audio
- Suno (音乐)
- Udio (音乐)

**3D 生成**
- Meshy
- Tripo AI
- Rodin (Hyper3D)
- CSM AI
- Luma Genie

### 自定义节点

内置多种工具节点，支持扩展：

| 节点 | 用途 |
|------|------|
| HTTP 请求 | 调用任意 REST API |
| Webhook 触发器 | 接收外部系统调用 |
| JavaScript 代码 | 自定义数据处理逻辑 |
| JSON 解析/序列化 | 处理 JSON 数据 |
| 数据映射 | 字段转换和重组 |
| 条件判断 | 流程分支控制 |
| 循环处理 | 批量数据处理 |
| OpenAI 兼容 API | 调用 Ollama、vLLM 等 |
| SD WebUI API | 本地 Stable Diffusion |
| ComfyUI API | 本地 ComfyUI |

支持用户创建自定义节点，封装常用 API 调用。

### 工作流管理

- 保存和加载工作流
- 导入 ComfyUI 工作流（自动格式转换）
- 导出为 ComfyUI 格式
- 预设模板快速开始

### 预设模板

- 文本生成图像
- 图像生成视频
- 提示词增强
- 风格迁移
- 图像变体
- 首尾帧插值
- 角色一致性流水线

## 节点列表

| 类别 | 节点 |
|------|------|
| 输入 | 文本输入、图像上传、视频上传、音频上传、3D模型上传 |
| LLM | GPT、Claude、Gemini、DeepSeek、Kimi、通义千问、GLM、提示词增强、图像分析、JSON 分离器 |
| 图像 | DALL-E、Stability、Midjourney、Ideogram、Leonardo、角色参考生成、图像变体、风格迁移、背景移除、图像放大 |
| 视频 | Runway、Pika、可灵、Luma、MiniMax、首尾帧插值 |
| 音频 | 语音合成 (TTS)、语音识别 (STT)、音乐生成 (Suno/Udio)、ElevenLabs、Fish Audio |
| 3D | 文字生成3D、图片生成3D、Meshy、Tripo、Rodin、CSM、Luma Genie、贴图生成、骨骼绑定、动画生成、3D渲染、转盘视频 |
| 自定义 | HTTP 请求、Webhook、JavaScript 代码、JSON 处理、数据映射、条件判断、循环、延迟、OpenAI 兼容 API、SD WebUI、ComfyUI API |
| 输出 | 图像输出、视频输出、音频输出、3D模型输出、分镜板输出 |

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

访问 http://localhost:3000

**基本操作**
1. 从左侧面板拖拽节点到画布
2. 连接节点（从输出端口拖向输入端口）
3. 点击工具栏运行按钮执行工作流

### API 配置

**方式一：界面配置**

点击侧边栏底部「设置」按钮，在分类导航中找到对应服务，填入 API Key。

**方式二：配置文件**

复制 `public/api.config.example.json` 为 `public/api.config.json`，填入需要使用的服务密钥：

```json
{
  "openai": { "apiKey": "sk-xxx" },
  "anthropic": { "apiKey": "sk-ant-xxx" },
  "stability": { "apiKey": "sk-xxx" }
}
```

只需配置实际使用的服务，其他留空即可。

### 自定义节点

点击侧边栏底部「自定义」按钮，可以：
- 从模板创建 HTTP 请求节点
- 编写 JavaScript 代码节点
- 封装常用 API 为可复用节点

## 技术栈

- React 18
- TypeScript
- Vite
- Zustand

纯前端项目，无需后端服务。API 调用直接从浏览器发起。

## 项目结构

```
src/
├── components/   # UI 组件
├── store/        # 状态管理
├── nodes/        # 节点定义
├── plugins/      # 插件系统
├── services/     # API 服务、执行器
├── templates/    # 工作流模板
├── types/        # 类型定义
└── styles/       # 样式文件

public/
├── api.config.json          # API 配置（需自行创建）
└── api.config.example.json  # 配置示例
```

## 与 ComfyUI 的区别

| | JoinRender-Flow | ComfyUI |
|---|---|---|
| 定位 | 面向创意工作者 | 面向技术用户 |
| 学习曲线 | 较低 | 较高 |
| 节点数量 | 精简 | 丰富 |
| 角色一致性 | 内置支持 | 需手动配置 |
| 运行环境 | 浏览器 | Python |
| API 集成 | 云端服务为主 | 本地模型为主 |

两者定位不同，ComfyUI 更灵活，JoinRender-Flow 更易用。项目支持导入导出 ComfyUI 工作流，可以配合使用。

## License

Apache-2.0
