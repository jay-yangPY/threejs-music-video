# 来源与证据边界

本包由一次本地 Three.js 音乐动画项目提取，原工程已导出 133 秒 1080p/60fps 视频；技术回读与用户审美判断分开。用户认为歌词文字仍与画面脱节，因此本包明确要求关键短语的语义动作与结果。这个要求尚不构成下一首完整歌曲已经更好的证据。

保留：原作者在本地项目编写的 `world.ts`、`expanded.ts`，确定性时间接口、三类真实返修教训（切句混字、物体穿镜、遮字）。新编：通用入口、示例配置、安装说明、渲染器、机械验证和语义合同。

未包含：原歌曲/演唱音轨、歌词全文、最终成片、参考作者视频或代码、商业字体、机器模型目录和聊天记录。

## 可核查公开规范

- [Agent Skills specification](https://agentskills.io/specification)：名称/描述 frontmatter、按需加载和相对资源。
- [OpenAI skills](https://github.com/openai/skills)：Skill 目录分发形式。
- [Three.js](https://github.com/mrdoob/three.js)：三维运行库；依赖使用自身 MIT 许可，本包不分发其源码副本。
- [Vite](https://github.com/vitejs/vite)、[Playwright](https://github.com/microsoft/playwright)、[FFmpeg](https://ffmpeg.org/)：构建/浏览器/编码工具，保留各自许可证。

本包 MIT 仅覆盖原创代码与文档。包管理器取得的依赖及其传递依赖不因本包许可证改变权利。用户歌曲、字体及外部资产需要各自使用权。

代码示例首先在 Windows 上核验。跨平台使用相对路径且不固定 ANGLE 后端，但 macOS/Linux、其他 Agent 客户端原生安装和大型全曲性能尚需实测。默认系统字体会随机器变化；正式项目应选择允许使用的字体并等待加载后渲染。
