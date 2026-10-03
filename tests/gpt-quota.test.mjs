import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {quotaWindows} from '../runtime/insights-worker.mjs';
const source=fs.readFileSync(new URL('../desktop/ui/account-view.js',import.meta.url),'utf8');
const exported={module:{exports:{}}};vm.runInNewContext(source,exported);
const {windowText,missingWindowLabels}=exported.module.exports;
test('real snapshot parser clamps finite values through display',()=>{
  for(const [value,used,remaining] of [[110,100,0],[-10,0,100]]) {
    const [w]=quotaWindows({primary:{used_percent:value,window_minutes:300,resets_at:2000}},1000,1000);
    assert.ok(w);assert.equal(w.usedPercent,used);assert.equal(w.remainingPercent,remaining);
    assert.match(windowText(w),new RegExp(`剩余 ${remaining}\\.0%`));
  }
  for(const value of [null,NaN,Infinity,'20']) assert.deepEqual(quotaWindows({primary:{used_percent:value,window_minutes:300}},1000,1000),[]);
});
test('remaining quota is first and stays bounded',()=>{
  assert.equal(windowText({usedPercent:25}),'剩余 75.0% · 已用 25.0%');
  assert.equal(windowText({usedPercent:0}),'剩余 100.0% · 已用 0.0%');
  assert.equal(windowText({usedPercent:100}),'剩余 0.0% · 已用 100.0%');
  assert.equal(windowText({usedPercent:110}),'剩余 0.0% · 已用 100.0%');
  assert.equal(windowText({usedPercent:-10}),'剩余 100.0% · 已用 0.0%');
  for(const value of [null,undefined,NaN,Infinity,'20']) assert.equal(windowText({usedPercent:value}),'额度比例未知');
  assert.match(windowText({usedPercent:25,stale:true}),/剩余 75.0%.*快照已过期/);
});
test('a missing weekly snapshot is named instead of displayed as full quota',()=>{
  assert.deepEqual(Array.from(missingWindowLabels([{windowDurationMins:300}])),['每周额度']);
  assert.deepEqual(Array.from(missingWindowLabels([])),['5 小时额度','每周额度']);
  assert.deepEqual(Array.from(missingWindowLabels([{windowDurationMins:300},{windowDurationMins:10080}])),[]);
});
