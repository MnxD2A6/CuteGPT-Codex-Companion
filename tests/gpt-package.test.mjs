import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

test('release package includes accepted GPT art and excludes private and development inputs',t=>{
  const output=fs.mkdtempSync(path.join(os.tmpdir(),'gpt-package-build-'));
  t.after(()=>fs.rmSync(output,{recursive:true,force:true}));
  const child=spawnSync('python',['-X','utf8','scripts/build-release.py','--output',output],{encoding:'utf8',timeout:30000});
  assert.equal(child.status,0,child.stdout+child.stderr);
  const report=JSON.parse(fs.readFileSync(path.join(output,'release-manifest.json'),'utf8'));
  assert.equal(report.internalVersion,'0.1.0');assert.equal(report.archiveIntegrity,'passed');
  assert.ok(report.artifacts.some(x=>x.name==='gpt-codex-companion-0.1.0-windows.zip'));
  assert.ok(Object.hasOwn(report.contentHashes,'assets/gpt-companion-r01.png'));
  assert.ok(Object.hasOwn(report.contentHashes,'assets/gpt-companion-r02.png'));
  assert.ok(Object.hasOwn(report.contentHashes,'desktop/ui/gpt-talk.js'));
  for(const file of Object.keys(report.contentHashes)) assert.doesNotMatch(file,/(?:^|\/)(?:\.superpowers|superpowers|auth\.json|runtime\.json|config\.toml)|clipboard|qa-output|docs\/art/);
});
