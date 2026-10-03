# 安全策略

当前版本为 gpt-codex-companion 0.1.0。Windows x64 已完成本机验证；macOS 代码保留但尚未实机验收。上游来源见 PROVENANCE.md。

## 报告安全问题

如果仓库 Security 页面提供“Report a vulnerability”，请使用私密报告入口。若尚未开通，可在普通 issue 中仅请求维护者提供私密报告渠道，不要公开漏洞利用细节或凭据。本项目不承诺固定响应时限。

请提供受影响版本、操作系统、最小复现步骤和影响范围。不要提交 API 密钥、auth.json、config.toml、完整会话日志、未脱敏账号截图或 runtime.json；runtime.json 含本地 IPC 凭据。

## 安全边界

- 本插件使用当前用户的本地 IPC、配置和会话额度快照；不需要上传聊天内容。
- 路径穿越、越权读取、IPC 无凭据访问和素材导入绕过校验属于应报告的问题。
- 订阅额度与本机 token 统计口径不同，过期和缺失快照会披露。
- API 模式使用用户配置的服务商地址；原生窗口跟随使用用户态权限。

升级前可备份自己的插件设置和素材。默认数据目录为 CODEX_HOME/gpt-codex-companion；无 CODEX_HOME 时为用户目录下 .codex/gpt-codex-companion。
