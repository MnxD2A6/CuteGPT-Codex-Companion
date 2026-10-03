import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {EventEmitter} from 'node:events';
import {createInsightsService} from '../runtime/insights.mjs';

test('account changes during a scan are rejected without a second get',async t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gpt-switch-'));
  const writeAuth=account=>fs.writeFileSync(path.join(dir,'auth.json'),JSON.stringify({auth_mode:'chatgpt',tokens:{account_id:account}}));
  writeAuth('A');
  const w=new EventEmitter();w.terminate=async()=>{};
  const config={codexHome:dir,resolve:()=>({id:'openai',key:'',accountId:'subscription',setting:{monitorSessions:true},baseUrl:'https://api.openai.com/v1'})};
  const service=createInsightsService(config,{workerFactory:()=>w});
  t.after(()=>{service.close();fs.rmSync(dir,{recursive:true,force:true});});
  const request=service.get();writeAuth('B');
  w.emit('message',{observedAt:Date.now()+1000,windows:[{windowDurationMins:300,usedPercent:10}],tokens:{total:10}});
  const result=await request;assert.equal(result.subscription.available,false);assert.equal(result.tokens,null);
});

test('an old account worker cannot supply or clear the new account snapshot',async t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gpt-insights-'));
  let account='A';
  const writeAuth=()=>fs.writeFileSync(path.join(dir,'auth.json'),JSON.stringify({auth_mode:'chatgpt',tokens:{account_id:account}}));
  writeAuth();
  const workers=[];
  const config={codexHome:dir,resolve:()=>({id:'openai',key:'',accountId:account,setting:{monitorSessions:true},baseUrl:'https://api.openai.com/v1'})};
  const service=createInsightsService(config,{workerFactory:()=>{const w=new EventEmitter();w.terminate=async()=>{};workers.push(w);return w;}});
  t.after(()=>{service.close();fs.rmSync(dir,{recursive:true,force:true});});
  const oldRequest=service.get();
  assert.equal(workers.length,1,'the first scan uses the worker factory');
  account='B';writeAuth();const newRequest=service.get();
  assert.equal(workers.length,2,'a new identity gets its own scan');
  const observedAt=Date.now()+1000;
  workers[1].emit('message',{observedAt,windows:[{windowDurationMins:300,usedPercent:60}],tokens:{total:30}});
  const current=await newRequest;assert.equal(current.subscription.windows[0].usedPercent,60);
  workers[0].emit('message',{observedAt,windows:[{windowDurationMins:300,usedPercent:10}],tokens:{total:10}});
  const stale=await oldRequest;assert.equal(stale.subscription.available,false);assert.equal(stale.tokens,null);
  assert.equal((await service.get()).subscription.windows[0].usedPercent,60);
  config.resolve=()=>({id:'openai',key:'test-key',accountId:'api',setting:{monitorSessions:true},baseUrl:'https://api.openai.com/v1'});
  const apiRequest=service.get();workers[2].emit('message',{observedAt,windows:[{windowDurationMins:300,usedPercent:10}]});
  assert.equal((await apiRequest).subscription.available,false);
});
