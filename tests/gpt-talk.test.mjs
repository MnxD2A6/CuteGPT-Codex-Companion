import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function api(){const ctx={module:{exports:{}}};vm.runInNewContext(fs.readFileSync(new URL('../desktop/ui/gpt-talk.js',import.meta.url),'utf8'),ctx);return ctx.module.exports;}
test('talk keeps requested phrases and never immediately repeats a line',()=>{
  const {defaultLines,pickLine}=api();
  for(const s of ['傻子Tibo','给我买充值卡','你怎么来了'])assert.ok(defaultLines.includes(s));
  assert.equal(pickLine(['A','B'],'A',()=>0),'B');
  assert.equal(pickLine(['A'],'A',()=>0),'A');
  assert.equal(pickLine([],'',()=>0),'');
});
test('automatic talk skips busy surfaces, stops when disabled and does not replay missed ticks',()=>{
  const {createTalk}=api();let job=null,busy=true;const said=[];
  const t=createTalk({schedule:(f,ms)=>{job={f,ms};return 1;},cancel:()=>{job=null;},random:()=>0,lines:()=>['A','B'],canSpeak:()=>!busy,speak:s=>{said.push(s);return true;}});
  t.start();assert.equal(job.ms,2000);job.f();assert.equal(said.length,0);assert.equal(job.ms,30000);
  busy=false;job.f();assert.deepEqual(said,['A']);job.f();assert.deepEqual(said,['A','B']);
  t.stop();assert.equal(job,null);assert.equal(t.say(),false);
});
test('failed presentation does not consume the next random phrase',()=>{
  const {createTalk}=api();let success=false;const said=[];
  const t=createTalk({schedule:()=>1,cancel:()=>{},random:()=>0,lines:()=>['A','B'],canSpeak:()=>true,speak:s=>{said.push(s);return success;}});
  t.start();assert.equal(t.say(),false);success=true;assert.equal(t.say(),true);assert.deepEqual(said,['A','A']);t.stop();
});
