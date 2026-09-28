# Three.js Music Video Skill

**用歌词设计空间动作，再用代码渲染成音乐动画。**

面向 Codex 的可复用 Skill，带 TypeScript / Three.js 场景模块、Vite 示例、Python 渲染工具和 FFmpeg 导出流程。可以使用自己的歌曲做中英文歌词 MV，也可以只运行不含音乐的演示。

这是一个需要 Agent 编写分镜和代码的创作工具包，**不是自动把任意 MP3 转成高质量 MV 的一键产品**。起源项目完成了全曲导出，但用户指出文字与画面含义脱节；本包把这一反馈改为明确的制作和审查要求。不能据此宣称下一首歌的审美已经改善。

## 安装 Skill

在 Codex 中使用自带的 skill-installer，提供本仓库 URL，并指定根目录 `.`、名称 `threejs-music-video`。

也可以手动把仓库复制到自己的 Codex skills 目录下的 `threejs-music-video` 文件夹，确保直接包含 `SKILL.md`。不要覆盖已有同名文件夹；先检查版本。当前仓库未自动修改任何全局配置。

首次使用：

> 使用 $threejs-music-video。用我提供的歌曲和歌词制作三维音乐动画。先读取真实音频时长和起唱位置，让关键歌词的文字与场景共同完成动作；按授权交付可播放的视频，并如实报告时序、可读性和试听检查。

## 先运行演示

要求 Node.js 22.12+、npm；渲染额外需要 Python 3.10+、FFmpeg / ffprobe 和 Playwright Chromium。

```sh
cd assets/starter
npm ci
npm run dev
```

浏览器打开终端给出的本地地址。演示为 12 秒静音：折叠、散开、生长三个词的简单空间动作。另有原项目提取的十种场景机制，可由 Agent 按含义组合。字体使用本机字体，不附带商业字体。

仓库根目录另开终端：

```sh
python -m pip install -r requirements.txt
python -m playwright install chromium
python scripts/validate_plan.py examples/plan.json
python scripts/render.py --url http://127.0.0.1:8879 --output output/demo.mp4
```

首次安装依赖需要联网；浏览器下载量随平台和版本变化，可能达数百 MB。无需下载语音模型即可运行静音示例。示例服务只能供本机使用。

完整说明见 [starter README](assets/starter/README.md)。添加自己的音乐前先建立真实时间轴，更新示例配置，并核对音乐授权。

## 工具各司其职

| 工作 | 工具 | 本包状态 |
|---|---|---|
| 三维场景与动画 | TypeScript + Three.js | 带可运行源代码 |
| 构建预览 | Vite，npm 或兼容 Bun | 锁定 npm 依赖 |
| 人声/节拍辅助分析 | Python + Demucs | 可选，见参考；不自动下载模型 |
| 识别与时间估计 | Whisper / CTC | 可选，不能替代混唱试听 |
| 本地逐帧渲染 | Playwright Chromium | 带脚本 |
| 音视频编码 | FFmpeg | 系统依赖，不捆绑二进制 |

## 复用与检查

```sh
python -m unittest discover -s tests -v
python scripts/audit_package.py
cd assets/starter
npm run build
```

启动示例开发服务后，可额外运行 `python scripts/check_starter_gaps.py`，复测歌词空档前后跳转是否保持同时间像素一致。

运行验证记录见 [VALIDATION.md](VALIDATION.md)。结构测试、静音演示导出与真实歌曲的唱词/审美是不同证据；不要混称。没有对其他客户端做原生安装验证。

## 内容边界

仓库仅包含作者工程代码的可复用部分、新写示例及文档。原歌曲、成片、私人运行记录和参考作者媒体均未上传。新作品输出和依赖目录默认被 Git 忽略。

本项目原创代码与文档使用 [MIT](LICENSE)。Three.js 等依赖遵守各自许可；音乐、字体和第三方资产的权利不由本许可证授予。来源与依赖说明见 [source-notes.md](references/source-notes.md)。
