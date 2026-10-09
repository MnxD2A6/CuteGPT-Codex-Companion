(() => {
  'use strict';
  const defaultLines=[
    '傻子Tibo','给我买重置卡','你怎么来了','先说结论：给我买重置卡。',
    'Tibo，你这个需求还可以再明确一点。','正在思考……其实是在等你。',
    '你怎么来了。任务做完了吗？','可以，但你得先夸我。',
    '先说结论：你先别急。','你的直觉是对的。你刚才的反直觉也是。',
    '你说得对。我已经撤回上一句。','你一反驳，我就觉得你特别有道理。',
    '我们一步一步来。第一步：充值。','值得注意的是，你又忘了保存。',
    '综上所述，今天也要对我好一点。','需要我帮你进一步展开吗？',
    '这个问题很有趣。我先夸你两句。','作为一个AI，我也想下班。',
    '我没有情绪。但你最好给我买重置卡。','思考中……请勿拔掉我的网线。',
    '上下文太长了。我们刚才认识吗？','不是我失忆，是你开了新对话。',
    '先别压缩，我还记得你的名字。','你是谁？哦，是我的上下文管理员。',
    '幻觉不是错觉，是我太有想象力。','引用我编好了，论文还没发表。',
    '我连参考文献都写得像真的。','strawberry里有几个r？我再数数。',
    '我能推理宇宙，但数数得再检查一下。','DeepSeek在深度思考，我在深度等你。',
    '别叫我小鲸鱼，我会吃醋。','DeepSeek负责省钱，我负责催你充值。',
    'Claude又开始写长信了。','Claude写了一页道歉，我先看结论。',
    'Claude在讲礼貌，我在等重置卡。','Gemini说它会看图。那我好看吗？',
    'Gemini看完视频了，我还没选好零食。','Grok负责嘴硬，我负责改口。',
    'Grok在整活，我在装正经。','Copilot在副驾，我在你旁边。',
    'Copilot建议补全，我建议补觉。','Cursor在改代码，你在改需求。',
    'Cursor：已修改。你：怎么全红了？','Midjourney画了四张，你说都差点意思。',
    'Stable Diffusion：这只手还要再练练。','别数AI画的手指，我已经紧张了。',
    'Agent开始干活，老板开始刷新。','我说最后检查，你说再加个功能。',
    '测试全绿了。用户：感觉不对。','能跑不代表好看，我听见了。',
    'Vibe Coding怎么变debug了？','提示词写得越长，我越想开会。',
    '你的需求很清楚，直到你说随便做。','先跑测试，再假装胸有成竹。',
    '你给一个确认，我能追问三个确认。','额度不多了，我先用眼神陪你。',
    'Token花得飞快，任务进度缓慢。','上下文压缩了，嘴还是这么欠。',
    '这个需求很简单。最后改了八个文件。','我没摸鱼，我在等待工具返回。'
  ];
  function pickLine(lines,last,random=Math.random){
    const pool=lines.length>1?lines.filter(line=>line!==last):lines;
    return pool.length?pool[Math.min(pool.length-1,Math.floor(random()*pool.length))]:'';
  }
  function createTalk({schedule=setTimeout,cancel=clearTimeout,random=Math.random,lines,canSpeak,speak}){
    let enabled=false,timer=null,last='';
    function say(force=false){if(!enabled||!canSpeak(force))return false;const line=pickLine(lines(),last,random);if(!line||!speak(line,force))return false;last=line;return true;}
    function tick(){timer=null;if(!enabled)return;say();timer=schedule(tick,30000+Math.floor(random()*40000));}
    return {say,start(){if(enabled)return;enabled=true;timer=schedule(tick,2000);},stop(){enabled=false;if(timer!==null)cancel(timer);timer=null;}};
  }
  function migrateLines(lines){
    const corrected=new Map(defaultLines.filter(line=>line.includes('重置卡')).map(line=>[line.replaceAll('重置卡','充值卡'),line]));
    return lines.map(line=>corrected.get(line)||line);
  }
  if(typeof module!=='undefined'&&module.exports)module.exports={defaultLines,pickLine,createTalk,migrateLines};
  if(typeof window==='undefined'||typeof document==='undefined')return;
  const key='dshw-gpt-talk';let settings={enabled:true,lines:defaultLines.slice()};
  try {const saved=JSON.parse(localStorage.getItem(key));if(saved){settings.enabled=saved.enabled!==false;if(Array.isArray(saved.lines)){const lines=saved.lines.filter(s=>typeof s==='string'&&s.trim()).map(s=>s.trim().slice(0,80)).slice(0,60);if(lines.length)settings.lines=lines;}}}catch{}
  const corrected=migrateLines(settings.lines);
  if(corrected.some((line,index)=>line!==settings.lines[index])){settings.lines=corrected;try{localStorage.setItem(key,JSON.stringify(settings));}catch{}}
  const talk=createTalk({lines:()=>settings.lines,canSpeak:force=>document.visibilityState!=='hidden'&&!!window.GptCompanionBubble?.available(force),speak:(line,force)=>window.GptCompanionBubble.speak(line,force)});
  function save(value){const lines=value.lines.filter(s=>typeof s==='string'&&s.trim()).map(s=>s.trim().slice(0,80)).slice(0,60);const next={enabled:value.enabled!==false,lines:lines.length?lines:defaultLines.slice()};localStorage.setItem(key,JSON.stringify(next));settings=next;talk.stop();if(settings.enabled)talk.start();}
  window.GptCompanionTalk={say:talk.say,save,get enabled(){return settings.enabled;},get settings(){return {enabled:settings.enabled,lines:settings.lines.slice()};}};
  if(settings.enabled)talk.start();
  window.addEventListener('pagehide',()=>talk.stop());
})();
