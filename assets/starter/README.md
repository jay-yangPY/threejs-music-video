# Starter 使用

把本目录复制到作品目录再改。不要在已安装 Skill 中保存歌曲或成片。

```sh
npm ci
npm run dev
```

默认地址 http://127.0.0.1:8879 。若被占用，用 `npm run dev -- --port 8881` 并在渲染器中传同一个 URL。预览服务只绑定本机。

`src/config.json` 是这个示例实际读取的配置：尺寸、帧率、时长、音频和 cues。修改后 Vite 会更新。`examples/plan.json` 是 Skill 的分镜合同，不自动生成此配置；需 Agent 根据合同实现镜头，再设置配置。

当前 cue 字段：start/end（秒）、text、scene（0..9）、action（fold/scatter/rise）。文字是有透明字形贴图的三维平面，未做字形挤出或物理布料求解。场景 ID 对应：0 双星，1 声波，2 城市，3 纸页，4 钟盘，5 编织，6 服务器，7 粒子，8 折叠结构，9 碗。

可编辑 `main.ts` 增加语义动作。字体来自本机；颜色和灯光在 `world.ts`，空间机制在 `expanded.ts`。示例的节奏能量为合成数值，没有冒充音频分析。旧场景库以绝对 t>75/t>100 为重复段变化条件，移植全曲时应改为明确的章节参数，不直接沿用旧时间阈值。

## 使用本地歌曲

1. 在作品目录的 `public/audio/` 放已获使用权的歌曲，例如 song.mp3。
2. 将 config.audio 改为 `/audio/song.mp3`；真实时长填 config.duration，调整 cues，保证不越界。
3. 浏览器点击播放。音频加载失败会显示错误。
4. 在仓库根目录运行渲染器，并给 `--audio` 指定同一文件的本地路径。渲染器不会读取配置的音频 URL。

```sh
python scripts/render.py --url http://127.0.0.1:8879 --audio assets/starter/public/audio/song.mp3 --output output/song.mp4
```

默认导出完整配置时长。测试片段可加 `--duration 3`（取开头三秒）；不要把片段当成完整作品。脚本拒绝覆盖已有文件。默认 PNG 逐帧输入可降低文字压缩误差，但全曲速度取决于场景和 GPU；先用短片估时。

```sh
python scripts/smoke_check.py --url http://127.0.0.1:8879 --output output/smoke.json
```

此命令检查相同时间点经跳转后的像素哈希相同，保留几个 PNG 供查看。不会自动判断歌词语义或给审美打分。

`npm run build` 生成 dist。用 `npm run preview` 可查看构建结果。生产项目应另行组织字幕、音频分析、可读性/语义/试听检查与最终输出；静音 demo 本身不是全曲作品模板。
