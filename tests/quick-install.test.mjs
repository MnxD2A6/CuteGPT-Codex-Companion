import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const root=process.cwd();
const shell=path.join(process.env.WINDIR || 'C:/Windows','System32/WindowsPowerShell/v1.0/powershell.exe');
const official=process.env.CUTEGPT_NODE_ZIP || path.join(root,'.superpowers/bootstrap-cache/node-v24.19.0-win-x64.zip');
const unavailable=process.platform!=='win32'||!fs.existsSync(official);
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const invoke=(file,args=[],env={})=>spawnSync(shell,['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',file,...args],{env:{...process.env,...env},encoding:'utf8',timeout:90000});

function fixture(t){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cutegpt-安装 空格-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  fs.mkdirSync(path.join(dir,'scripts'));fs.mkdirSync(path.join(dir,'payload/gpt-codex-companion/scripts'),{recursive:true});
  fs.copyFileSync(path.join(root,'scripts/quick-install.ps1'),path.join(dir,'scripts/quick-install.ps1'));
  const p=path.join(dir,'payload/gpt-codex-companion');
  fs.writeFileSync(path.join(p,'.mcp.json'),JSON.stringify({mcpServers:{'gpt-companion':{command:'node',args:['${CLAUDE_PLUGIN_ROOT}/runtime/mcp.mjs']}}}));
  fs.writeFileSync(path.join(p,'启动.cmd'),'@echo off\r\nnode --version\r\n');
  fs.writeFileSync(path.join(p,'scripts/install-package.ps1'),"param([string]$Source,[string]$DataDir)\n$node=(Get-Command node.exe).Source\n$null=New-Item -ItemType Directory -Path $DataDir -Force\n[IO.File]::WriteAllText((Join-Path $DataDir 'actual-node.txt'),$node)\n& $node --version\nif($LASTEXITCODE -ne 0){throw 'Node failed'}\n");
  const zipScript=path.join(dir,'zip.ps1');
  fs.writeFileSync(zipScript,"param($Root)\nCompress-Archive -LiteralPath (Join-Path $Root 'payload/gpt-codex-companion') -DestinationPath (Join-Path $Root 'payload.zip')\n");
  const z=invoke(zipScript,['-Root',dir]);assert.equal(z.status,0,z.stderr);
  fs.copyFileSync(official,path.join(dir,'node-v24.19.0-win-x64.zip'));
  fs.writeFileSync(path.join(dir,'quick-install-manifest.json'),JSON.stringify({payloadSha256:sha(path.join(dir,'payload.zip'))}));
  const data=path.join(dir,'home/data');
  const local=path.join(dir,'home/local');
  const env={PATH:path.join(process.env.WINDIR,'System32'),LOCALAPPDATA:local,GPT_WIDGET_HOME:data};
  return {dir,data,local,env,script:path.join(dir,'scripts/quick-install.ps1')};
}

test('quick installer works without Node on PATH and binds MCP and command launchers to its private runtime', {skip:unavailable},t=>{
  const s=fixture(t);const result=invoke(s.script,[],s.env);
  assert.equal(result.status,0,result.stdout+result.stderr);
  const actual=fs.readFileSync(path.join(s.data,'actual-node.txt'),'utf8');
  assert.ok(actual.startsWith(s.local));
  const receipt=JSON.parse(fs.readFileSync(path.join(s.local,'CuteGPT/quick-install-prepared.json'),'utf8'));
  assert.equal(JSON.parse(fs.readFileSync(path.join(receipt.source,'.mcp.json'),'utf8')).mcpServers['gpt-companion'].command,actual);
  assert.ok(fs.readFileSync(path.join(receipt.source,'启动.cmd'),'utf8').includes('"'+actual+'" --version'));
});

for(const file of ['payload.zip','node-v24.19.0-win-x64.zip']){
  test(`quick installer rejects a corrupted ${file} before preparing executable code`,{skip:unavailable},t=>{
    const s=fixture(t);fs.appendFileSync(path.join(s.dir,file),'corrupt');
    const result=invoke(s.script,[],s.env);assert.notEqual(result.status,0);
    assert.match(result.stderr,/checksum mismatch/);
    assert.equal(fs.existsSync(path.join(s.data,'actual-node.txt')),false);
  });
}
