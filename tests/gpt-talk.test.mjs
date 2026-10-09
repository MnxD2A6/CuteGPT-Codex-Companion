import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function api(){const ctx={module:{exports:{}}};vm.runInNewContext(fs.readFileSync(new URL('../desktop/ui/gpt-talk.js',import.meta.url),'utf8'),ctx);return ctx.module.exports;}
test('talk keeps requested phrases and never immediately repeats a line',()=>{
  const {defaultLines,pickLine}=api();
  for(const s of ['傻子Tibo','给我买重置卡','你怎么来了'])assert.ok(defaultLines.includes(s));
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

test('saved built-in card phrases migrate while custom lines and disabled state survive',()=>{
  const saved={enabled:false,lines:['给我买充值卡','先说结论：给我买充值卡。','我没有情绪。但你最好给我买充值卡。','Claude在讲礼貌，我在等充值卡。','我的自定义充值卡台词','你怎么来了']};
  let written=null;let scheduled=false;
  const ctx={window:{addEventListener(){}},document:{},localStorage:{getItem:()=>JSON.stringify(saved),setItem:(_key,value)=>{written=JSON.parse(value);}},setTimeout:()=>{scheduled=true;return 1;},clearTimeout(){}};
  vm.runInNewContext(fs.readFileSync(new URL('../desktop/ui/gpt-talk.js',import.meta.url),'utf8'),ctx);
  assert.deepEqual(written,{enabled:false,lines:['给我买重置卡','先说结论：给我买重置卡。','我没有情绪。但你最好给我买重置卡。','Claude在讲礼貌，我在等重置卡。','我的自定义充值卡台词','你怎么来了']});
  assert.equal(ctx.window.GptCompanionTalk.enabled,false);
  assert.equal(scheduled,false);
});
