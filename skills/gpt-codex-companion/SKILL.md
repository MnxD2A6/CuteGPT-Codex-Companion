---
name: gpt-codex-companion
description: 显示 GPT 娘 Codex 桌面挂件、查询订阅额度快照与本机用量、检查自动跟随。
---

# GPT 娘 · Codex 额度挂件

优先使用本插件 MCP 工具：`gpt_open` 显示角色；`gpt_quota` 查询 Codex 订阅额度快照、重置时间和本机 token；`gpt_status` 查询运行状态；`gpt_usage` 查询挂件用量记录。只有用户明确查询 API 余额时使用 `gpt_balance`。

额度百分比来自本机记录的官方窗口快照。报告快照观测时间、过期和缺失状态；未观测不等于满额度，不能把 token 统计换算为官方剩余 token。日常订阅模式不需要额外 API key。

角色、大小、拖动吸附、气泡、声音与素材管理在挂件控制面板中操作。Windows Ctrl+Alt+G 恢复显示；托盘可切换独立桌面/跟随 Codex。尊重用户隐藏或停止的选择。

安装使用 scripts/install-package.ps1，可先 -CheckOnly。停止自动跟随使用 scripts/uninstall-follow.ps1；回滚使用 scripts/rollback-package.ps1 读取本次私有回执。只修改 gpt-codex-companion 的目录、市场条目和 Codex GPT Companion 任务。

不得在报告中输出密钥、IPC 令牌、原始聊天、账号标识或私人路径。不要为显示额度修改 Codex 的账号、模型或 API 配置。Windows 测试不能证明 macOS 实机运行。
