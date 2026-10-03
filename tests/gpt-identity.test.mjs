import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {pipeName} from '../runtime/bridge.mjs';

const root = path.resolve(import.meta.dirname, '..');
function dataHome(env) {
  const child = spawnSync(process.execPath, ['--input-type=module', '-e', "import {DATA_HOME} from './runtime/paths.mjs'; console.log(DATA_HOME)"],
    {cwd:root,env:{...process.env,CODEX_HOME:'',GPT_WIDGET_HOME:'',WHALE_HOME:'',...env},encoding:'utf8'});
  assert.equal(child.status,0,child.stderr);return child.stdout.trim();
}
test('GPT data defaults and override stay independent from whale data',()=>{
  const codex = path.join(os.tmpdir(),'GPT 中文目录 with spaces');
  assert.equal(dataHome({CODEX_HOME:codex}),path.join(codex,'gpt-codex-companion'));
  assert.equal(dataHome({CODEX_HOME:codex,WHALE_HOME:path.join(codex,'old-whale')}),path.join(codex,'gpt-codex-companion'));
  assert.equal(dataHome({CODEX_HOME:codex,GPT_WIDGET_HOME:path.join(codex,'custom')}),path.join(codex,'custom'));
});
test('GPT IPC, manifest and installer have separate ownership identities',()=>{
  assert.match(pipeName(root),/codex-gpt-companion/);
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'.codex-plugin/plugin.json'),'utf8'));
  assert.equal(manifest.name,'gpt-codex-companion');assert.equal(manifest.version,'0.1.0');
  for(const file of ['scripts/install-follow.ps1','scripts/install-package.ps1','scripts/rollback-package.ps1','scripts/uninstall-follow.ps1']) {
    const text=fs.readFileSync(path.join(root,file),'utf8');
    assert.doesNotMatch(text,/Codex API Balance Whale|plugins\\api-balance-whale|env:WHALE_HOME/);
  }
});

test('launcher verifier uses the GPT data directory and environment overrides',()=>{
  const text=fs.readFileSync(path.join(root,'scripts/verify-launcher.py'),'utf8');
  assert.doesNotMatch(text,/\.codex\/whale-widget/);
  assert.match(text,/GPT_WIDGET_HOME/);assert.match(text,/CODEX_HOME/);assert.match(text,/gpt-codex-companion/);
});

test('Windows supervisor reads UTF-8 JSON without BOM under a Chinese path', {skip:process.platform!=='win32'},t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gpt-中文路径-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const configFile=path.join(dir,'follow-config.json'), expected=path.join(dir,'工作室');
  fs.writeFileSync(configFile,JSON.stringify({pluginRoot:expected}),'utf8');
  const quote=value=>"'"+value.replaceAll("'","''")+"'";
  const harness=path.join(dir,'inspect.ps1');
  fs.writeFileSync(harness,`\uFEFF$ErrorActionPreference='Stop'\n$source=Get-Content -LiteralPath ${quote(path.join(root,'desktop/supervisor.ps1'))} -Raw -Encoding UTF8\n$start=$source.IndexOf('function Read-WhaleJson');$end=$source.IndexOf('function Send-WhaleHost')\nInvoke-Expression $source.Substring($start,$end-$start)\n$v=Read-WhaleJson ${quote(configFile)}\n[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes([string]$v.pluginRoot))\n`);
  const result=spawnSync('powershell.exe',['-NoProfile','-File',harness],{encoding:'utf8',windowsHide:true});
  assert.equal(result.status,0,result.stderr);assert.equal(Buffer.from(result.stdout.trim(),'base64').toString('utf8'),expected);
});
