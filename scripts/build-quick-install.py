"""Package an existing release with a verified private Node runtime for Windows x64."""
import argparse
import hashlib
import json
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parents[1]
NODE_NAME = 'node-v24.19.0-win-x64.zip'
NODE_SHA = '57f71ab3652e797d84acddc79c81cc9ff1c6ddb2a1974cdb83f00fee9bff4c73'

def digest(data):
    return hashlib.sha256(data).hexdigest()

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--payload', type=Path, required=True)
    parser.add_argument('--node-zip', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    payload, node = args.payload.read_bytes(), args.node_zip.read_bytes()
    if digest(node) != NODE_SHA:
        raise ValueError('Official Node archive checksum mismatch')
    with zipfile.ZipFile(args.payload) as package:
        manifest = json.loads(package.read('gpt-codex-companion/.codex-plugin/plugin.json'))
        if manifest['name'] != 'gpt-codex-companion' or manifest['version'] != '0.1.0':
            raise ValueError('Expected the reviewed v0.1.0 Windows payload')
        product_license = package.read('gpt-codex-companion/LICENSE')
    with zipfile.ZipFile(args.node_zip) as runtime:
        node_license = runtime.read('node-v24.19.0-win-x64/LICENSE')
    guide = '''CuteGPT Windows x64 简易安装包

1. 请先安装并登录 Codex 桌面应用。
2. 将整个 ZIP 解压到一个普通文件夹，不要直接在压缩包里运行。
3. 双击「安装CuteGPT.cmd」，保持网络连接，等待提示安装完成。
4. 打开新的 Codex 对话；挂件会跟随 Codex 窗口。

无需手动安装 Node.js。本包附带官方 Node.js 24.19.0，仅供 CuteGPT 使用，
存放在当前用户的 LocalAppData/CuteGPT 中，不修改系统 PATH。
首次安装仍需联网下载 Electron 桌面组件；这不是离线安装包。
仅支持 Windows x64。额度显示的是 Codex 订阅额度快照。
气泡为本地随机台词，不会为台词调用模型。

安装会沿用原版安装器，保留用户设置并创建私有回滚记录。
安装失败时，请按控制台显示的回滚指令恢复，不要删除备份。
卸载/暂停/恢复的入口位于用户目录 plugins/gpt-codex-companion。
LocalAppData/CuteGPT/runtime 为插件所需的 Node；使用期间请保留。

开源项目：https://github.com/MnxD2A6/gpt-codex-companion
社区项目，与 OpenAI 无官方关联。
原挂件与依赖许可见 payload.zip 内 LICENSE、THIRD_PARTY_NOTICES.md 和 vendor。
Node.js 的许可单独保留在 THIRD_PARTY/Node-LICENSE.txt。
'''
    entry = r'''@echo off
chcp 65001 >nul
echo CuteGPT 简易安装：请保持网络连接，并等待此窗口提示完成。
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\quick-install.ps1"
if errorlevel 1 (
  echo 安装未完成。请保留上方错误和备份路径。
  pause
  exit /b 1
)
pause
'''
    files = {
        'payload.zip': payload,
        NODE_NAME: node,
        'scripts/quick-install.ps1': (ROOT / 'scripts/quick-install.ps1').read_bytes(),
        '安装CuteGPT.cmd': entry.replace('\n', '\r\n').encode('utf-8'),
        '先读我.txt': guide.replace('\n', '\r\n').encode('utf-8-sig'),
        'LICENSE': product_license,
        'THIRD_PARTY/Node-LICENSE.txt': node_license,
        'quick-install-manifest.json': (json.dumps({
            'name': 'CuteGPT', 'version': '0.1.0', 'platform': 'windows-x64',
            'payloadSha256': digest(payload), 'nodeSha256': NODE_SHA,
            'nodeSource': 'https://nodejs.org/download/release/v24.19.0/' + NODE_NAME,
        }, indent=2) + '\n').encode(),
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    if args.output.exists():
        raise FileExistsError('Refusing to replace an existing release asset')
    with zipfile.ZipFile(args.output, 'w', compression=zipfile.ZIP_STORED) as archive:
        for name, data in sorted(files.items()):
            info = zipfile.ZipInfo('CuteGPT-quick-install/' + name, (2026, 10, 4, 0, 0, 0))
            archive.writestr(info, data)
    sha = digest(args.output.read_bytes())
    args.output.with_suffix(args.output.suffix + '.sha256').write_text(sha + '  ' + args.output.name + '\n', encoding='ascii')
    print(json.dumps({'file': str(args.output), 'sha256': sha, 'bytes': args.output.stat().st_size, 'files': len(files)}, ensure_ascii=False))

if __name__ == '__main__':
    main()
