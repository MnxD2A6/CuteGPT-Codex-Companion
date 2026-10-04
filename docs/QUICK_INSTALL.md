# CuteGPT Windows x64 简易安装包

下载 Release 中的 `CuteGPT-0.1.0-quick-install-windows-x64.zip`，完整解压，双击 `安装CuteGPT.cmd`。需要 Codex 桌面应用，首次安装需要网络下载 Electron；无需手动安装 Node.js。

包内原始插件 ZIP 和官方 Node.js 24.19.0 ZIP 保持原文件，安装前验证 SHA-256。Node 解压到当前用户的 LocalAppData/CuteGPT/runtime；MCP 与命令入口使用该私有运行时的绝对路径，系统 PATH 不变。插件依旧使用原安装器的备份、注册和自动跟随流程。

Node 来源：https://nodejs.org/download/release/v24.19.0/

2026-10-04 验证：256/256 项测试通过，0 跳过。新增集成测试在 PATH 只有 Windows System32 的环境中运行 Windows PowerShell 5.1，验证私有 Node 启动、MCP/命令入口绑定，以及损坏的两种 ZIP 在执行安装代码前被拒绝。另将实际完整简易包解压到含中文路径的独立测试目录，用 `-PrepareOnly` 验证官方 Node、npm 11.17.0 和真实插件依赖导入。

验证边界：实际简易包检查止于准备阶段；本次没有再次替换日常挂件或创建第二个自启任务。原安装器的安装、升级、注册失败与回滚流程继续由原有测试覆盖，首版 Windows 运行与窗口跟随验证见 W15_VERIFICATION.md。

源码构建：

```text
python scripts/build-quick-install.py --payload <reviewed-windows.zip> --node-zip <official-node-v24.19.0-win-x64.zip> --output <new-output.zip>
```

测试可用环境变量 `CUTEGPT_NODE_ZIP` 指向该官方 ZIP。未提供本地官方运行时或非 Windows 时，新增三个集成测试会跳过；无需为了普通测试联网下载。

卸载、暂停和回滚沿用用户目录 plugins/gpt-codex-companion 中原有入口。私有运行时在卸载后不会自动删除，避免破坏仍在使用它的注册入口或回滚状态。
