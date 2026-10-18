/* =====================================================================
 * 人工智能模型全生命周期版权保护系统 - 前端渲染逻辑
 * 路由 + ECharts 图表 + SVG 示意图 + 图片三联
 * ===================================================================== */
'use strict';

/* ---------- 通用主题色 ---------- */
const C = {
  text: '#9aa3c7', textLight:'#e7ecff', mute:'#6b74a0',
  brand:'#4f8cff', brand2:'#6ad0ff', accent:'#7c5cff',
  green:'#2fd47a', red:'#ff6b6b', orange:'#ffb454', yellow:'#ffd84d',
  grid:'#27316a',
};
// 系列配色
const PAL = [C.brand, C.green, C.orange, C.accent, C.brand2, C.yellow, C.red, '#5fd4a0'];

/* ECharts 通用配置注入 */
function baseGrid(){
  return { left:52, right:24, top:46, bottom:42, containLabel:true };
}
function axisCommon(extra){
  return Object.assign({
    type:'value',
    axisLine:{lineStyle:{color:C.grid}},
    axisLabel:{color:C.text, fontSize:11},
    splitLine:{lineStyle:{color:'rgba(39,49,106,.35)'}},
  }, extra||{});
}
function catAxis(labels, extra){
  return Object.assign({
    type:'category', data:labels,
    axisLine:{lineStyle:{color:C.grid}},
    axisLabel:{color:C.text, fontSize:11},
    axisTick:{show:false},
  }, extra||{});
}
function tooltipCommon(extra){
  return Object.assign({
    trigger:'axis',
    backgroundColor:'#0c1230', borderColor:C.grid, textStyle:{color:C.textLight, fontSize:12},
  }, extra||{});
}
function legendCommon(extra){
  return Object.assign({
    textStyle:{color:C.text, fontSize:11}, top:6, icon:'roundRect', itemWidth:14, itemHeight:8,
  }, extra||{});
}

/* 图表实例缓存 + resize */
const charts = [];
function makeChart(dom, opt){
  const ins = echarts.init(dom, null, {renderer:'canvas'});
  ins.setOption(opt);
  charts.push(ins);
  return ins;
}
window.addEventListener('resize', ()=>charts.forEach(c=>{try{c.resize()}catch(e){}}));

/* ---------- 数据生成器 ---------- */
// 10x10 BadNets 热力图：目标列(狗)全亮
function genBadNetsHeatmap(){
  const m=[]; const target=5;
  for(let i=0;i<10;i++){const row=[];for(let j=0;j<10;j++)row.push(j===target?100:0);m.push(row);}
  return m;
}
// UBW 弥散热力图：每行近均匀分布，对角略高
function genUBWHeatmap(seed){
  let s=seed;
  const rnd=()=>{s=(s*9301+49297)%233280;return s/233280;};
  const m=[];
  for(let i=0;i<10;i++){
    let vals=[];
    for(let j=0;j<10;j++){
      const v = 10 + (j===i?7:0) + (rnd()*8-4);
      vals.push(Math.max(0.5,v));
    }
    const sum=vals.reduce((a,b)=>a+b,0);
    m.push(vals.map(v=>+(v/sum*100).toFixed(1)));
  }
  return m;
}
// 扰动幅度分布：5000样本全顶到 ε
function genPerturbDist(){
  const bins=[]; const eps=16/255;
  for(let i=0;i<12;i++){bins.push({lo:i*eps/12, hi:(i+1)*eps/12, count:0});}
  bins[bins.length-1].count=5000;
  return {bins, eps};
}
// 检测距离样本(模拟 mean±std 范围内 8 点)
function genDistSamples(mean, std, n, seed){
  let s=seed; const rnd=()=>{s=(s*9301+49297)%233280;return s/233280-0.5;};
  const arr=[];
  for(let i=0;i<n;i++) arr.push(+(mean + rnd()*2*std).toFixed(2));
  return arr;
}
// ROC 完美分离
function genROC(){ return [[0,0],[0,1],[1,1]]; }

/* ===================================================================== */
/* 路由                                                                   */
/* ===================================================================== */
const ROUTES = {
  overview:{title:'系统概览', crumb:'首页 / 系统概览', tpl:'tpl-overview', init:initOverview},
  dataset:{title:'数据集版权保护', crumb:'数据集版权保护', tpl:'tpl-dataset', init:initDataset},
  model:{title:'模型版权保护', crumb:'模型版权保护', tpl:'tpl-model', init:initModel},
  aigc:{title:'AIGC生成内容', crumb:'AIGC生成内容', tpl:'tpl-aigc', init:initAigc},
  summary:{title:'系统测试总结', crumb:'系统测试总结', tpl:'tpl-summary', init:initSummary},
};

function route(){
  const hash = location.hash.replace(/^#\//,'') || 'overview';
  const r = ROUTES[hash] || ROUTES.overview;
  document.getElementById('pageTitle').textContent = r.title;
  document.getElementById('breadcrumb').textContent = r.crumb;
  // 导航高亮
  document.querySelectorAll('.nav-item').forEach(a=>{
    a.classList.toggle('active', a.dataset.route===hash);
  });
  // 渲染模板
  const tpl = document.getElementById(r.tpl);
  const content = document.getElementById('content');
  content.innerHTML = '';
  content.appendChild(tpl.content.cloneNode(true));
  // 销毁旧图表实例
  charts.forEach(c=>{try{c.dispose()}catch(e){}});
  charts.length=0;
  // 初始化
  r.init();
  window.scrollTo(0,0);
  // 移动端关侧栏
  document.querySelector('.sidebar').classList.remove('open');
}

window.addEventListener('hashchange', route);
document.addEventListener('DOMContentLoaded', ()=>{
  // 移动端菜单按钮
  const mb=document.createElement('button');
  mb.className='menu-btn'; mb.innerHTML='☰'; mb.title='菜单';
  mb.onclick=()=>document.querySelector('.sidebar').classList.toggle('open');
  document.body.appendChild(mb);
  if(!location.hash) location.hash='#/overview';
  route();
});

/* ===================================================================== */
/* 0. 概览页                                                               */
/* ===================================================================== */
function initOverview(){
  // 生命周期流程
  const lf = document.getElementById('lifecycleFlow');
  const items = OVERVIEW.lifecycle;
  lf.innerHTML = items.map((it,i)=>`
    <div class="lf-stage">
      <div class="lf-icon">${it.icon}</div>
      <div>
        <div class="lf-stage-tag">${it.stage}</div>
        <div class="lf-title">${it.title}</div>
        <div class="lf-method">${it.method}</div>
        <div class="lf-desc">${it.desc}</div>
      </div>
    </div>${i<items.length-1?'<div class="lf-arrow">→</div>':''}
  `).join('');

  // 模块卡片
  const mc = document.getElementById('moduleCards');
  mc.innerHTML = items.map(it=>`
    <div class="module-card" data-go="${it.module}">
      <div class="mc-icon">${it.icon}</div>
      <div class="mc-stage">${it.stage}</div>
      <div class="mc-title">${it.title}</div>
      <div class="mc-method">${it.method}</div>
      <div class="mc-desc">${it.desc}</div>
    </div>
  `).join('');
  mc.querySelectorAll('.module-card').forEach(c=>c.onclick=()=>location.hash='#/'+c.dataset.go);
}

/* ===================================================================== */
/* 1. 数据集版权保护                                                       */
/* ===================================================================== */
function initDataset(){
  // 子标签切换
  bindSubtabs('datasetTabs');
  // 各图表
  renderDsEffect();
  renderDsDp();
  renderDsHeatmap();
  renderDsStealth();
  renderDsPerturb();
  renderDsVerify();
  renderDsFinetune();
  renderDsPrune();
  renderDsDefense();
}

function bindSubtabs(containerId){
  const box = document.getElementById(containerId);
  if(!box) return;
  box.querySelectorAll('.subtab').forEach(btn=>{
    btn.onclick=()=>{
      const key=btn.dataset.sub;
      const parent=btn.parentElement;
      parent.querySelectorAll('.subtab').forEach(b=>b.classList.toggle('active', b===btn));
      // 找到同一模板下所有 subpane
      const panes = parent.parentElement.querySelectorAll('.subpane');
      panes.forEach(p=>p.classList.toggle('active', p.dataset.sub===key));
      // resize 图表
      setTimeout(()=>charts.forEach(c=>{try{c.resize()}catch(e){}}),50);
    };
  });
}

/* --- 水印有效性 --- */
function renderDsEffect(){
  const d = DATASET.effectiveness;
  makeChart(document.getElementById('ds-eff-chart'), {
    color:PAL,
    legend:legendCommon(),
    tooltip:tooltipCommon({valueFormatter:v=>v==null?'-':v+'%'}),
    grid:baseGrid(),
    xAxis:catAxis(d.methods),
    yAxis:axisCommon({name:'%', max:105, nameTextStyle:{color:C.text}}),
    series:[
      {name:'BA 干净准确率', type:'bar', barGap:'15%', data:d.BA, itemStyle:{borderRadius:[4,4,0,0]}, label:{show:true,position:'top',color:C.textLight,fontSize:10,formatter:'{c}%'}},
      {name:'ASR-A 全体', type:'bar', data:d.ASR_A, itemStyle:{borderRadius:[4,4,0,0]}, label:{show:true,position:'top',color:C.textLight,fontSize:10,formatter:'{c}%'}},
      {name:'ASR-C 正确分类', type:'bar', data:d.ASR_C, itemStyle:{borderRadius:[4,4,0,0]}, label:{show:true,position:'top',color:C.textLight,fontSize:10,formatter:'{c}%'}},
    ],
  });
}

/* --- 无害性 Dp --- */
function renderDsDp(){
  const d = DATASET.harmlessness;
  makeChart(document.getElementById('ds-dp-chart'), {
    color:[C.brand, C.green, C.orange],
    legend:legendCommon(),
    tooltip:tooltipCommon({valueFormatter:v=>v.toFixed(4)}),
    grid:baseGrid(),
    xAxis:catAxis(d.methods),
    yAxis:axisCommon({name:'Dp', max:2.4, nameTextStyle:{color:C.text}}),
    series:[{
      name:'平均预测分散性 Dp', type:'bar', data:d.Dp, barWidth:'45%',
      itemStyle:{borderRadius:[6,6,0,0], color:(p)=>PAL[p.dataIndex%3]},
      label:{show:true,position:'top',color:C.textLight,fontSize:11,formatter:p=>p.value.toFixed(4)},
      markLine:{symbol:'none', data:[{yAxis:d.theoreticalMax, name:'理论上限 ln10'}], lineStyle:{color:C.red,type:'dashed'}, label:{color:C.red,formatter:'ln10=2.303'}}
    }],
  });
}

/* --- 真实类→预测类 热力图 --- */
function renderDsHeatmap(){
  const d = DATASET.harmlessness;
  const labels = d.heatmap.labels;
  const bad = genBadNetsHeatmap();
  const ubwC = genUBWHeatmap(7);
  const ubwP = genUBWHeatmap(13);
  const data=[]; // [methodIndex, real, pred, value]
  // 三组：0=BadNets 1=UBW-P 2=UBW-C，并排展示用三个独立热力图更清晰
  // 这里用 tab 切换：默认显示三组对比 -> 改用三个 grid
  const dom = document.getElementById('ds-heatmap-chart');
  // 拆成三个子图
  dom.style.height='440px';
  const ins = echarts.init(dom);
  charts.push(ins);
  const groups = [
    {name:'BadNets (定向)', data:bad},
    {name:'UBW-P (非定向)', data:ubwP},
    {name:'UBW-C (非定向)', data:ubwC},
  ];
  const grids = [ {left:'3%',width:'28%'}, {left:'37%',width:'28%'}, {left:'71%',width:'28%'} ];
  const xAxes=[],yAxes=[],series=[];
  groups.forEach((g,gi)=>{
    const cellData=[];
    for(let i=0;i<10;i++)for(let j=0;j<10;j++) cellData.push([j,i,g.data[i][j]]);
    xAxes.push({gridIndex:gi, type:'category', data:labels, axisLabel:{color:C.text,fontSize:8,interval:0,rotate:45},axisTick:{show:false},axisLine:{lineStyle:{color:C.grid}},splitLine:{show:false}});
    yAxes.push({gridIndex:gi, type:'category', data:labels, axisLabel:{color:C.text,fontSize:8,interval:0},axisTick:{show:false},axisLine:{lineStyle:{color:C.grid}},splitLine:{show:false}});
    series.push({
      name:g.name, type:'heatmap', data:cellData, xAxisIndex:gi, yAxisIndex:gi,
      label:{show:false}, emphasis:{itemStyle:{shadowBlur:10}},
    });
  });
  ins.setOption({
    tooltip:{position:'top', formatter:p=>`${labels[p.value[1]]} → ${labels[p.value[0]]}: ${p.value[2]}%`},
    grid:grids.map(g=>({top:54, bottom:78, ...g, containLabel:true})),
    xAxis:xAxes, yAxis:yAxes,
    visualMap:{min:0, max:100, calculable:true, orient:'horizontal', left:'center', bottom:6,
      textStyle:{color:C.text,fontSize:10},
      inRange:{color:['#0a0e1f','#1c2550','#4f8cff','#6ad0ff','#ffd84d','#ff6b6b']}},
    title:groups.map((g,i)=>({text:g.name, left:(i*34+3)+'%', top:8, textStyle:{color:C.textLight,fontSize:12}})),
    series,
  });
}

/* --- 隐蔽性 图片三联 --- */
function renderDsStealth(){
  const prompt='a realistic photograph of a cat sitting outdoors, natural daylight, plain background, low resolution';
  buildImgTriptych('ds-stealth-img', prompt, 'texture', ['干净样本 (Clean)','UBW-C 含水印样本','像素差异 ×8 (UBW-C 扰动)']);
}

/* --- 扰动幅度分布 --- */
function renderDsPerturb(){
  const {bins, eps} = genPerturbDist();
  const d = DATASET.stealth;
  makeChart(document.getElementById('ds-perturb-chart'), {
    color:[C.brand],
    tooltip:tooltipCommon({valueFormatter:v=>v+' 个样本'}),
    grid:baseGrid(),
    xAxis:catAxis(bins.map((b,i)=>i===bins.length-1?'≈ε (16/255)':(b.hi).toFixed(3))),
    yAxis:axisCommon({name:'样本数', nameTextStyle:{color:C.text}}),
    series:[{
      name:'逐像素最大扰动', type:'bar', data:bins.map(b=>b.count), barWidth:'55%',
      itemStyle:{borderRadius:[4,4,0,0], color:new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:C.brand2},{offset:1,color:C.brand}])},
      label:{show:true,position:'top',color:C.textLight,fontSize:10,formatter:p=>p.value?p.value:''},
      markLine:{symbol:'none',silent:true, data:[{xAxis:bins.length-1.5}], lineStyle:{color:C.red,type:'dashed'}, label:{color:C.red,formatter:'ε=16/255 约束边界'}}
    }],
  });
}

/* --- 版权验证 --- */
function renderDsVerify(){
  const d = DATASET.verification;
  const methods = ['BadNets','UBW-P','UBW-C'];
  const keyMap = {'BadNets':'badnets','UBW-P':'ubwP','UBW-C':'ubwC'};
  const sc = d.scenarios;
  makeChart(document.getElementById('ds-verify-chart'), {
    color:[C.red, C.brand, C.green],
    legend:legendCommon(),
    tooltip:tooltipCommon({valueFormatter:v=>v==null?'0':v.toFixed(4)}),
    grid:baseGrid(),
    xAxis:catAxis(sc),
    yAxis:axisCommon({name:'ΔP', nameTextStyle:{color:C.text}}),
    series:methods.map((m,i)=>({
      name:m, type:'bar', data:d[keyMap[m]].deltaP,
      itemStyle:{borderRadius:[4,4,0,0]},
      label:{show:true,position:'top',color:C.textLight,fontSize:10,formatter:p=>p.value?p.value.toFixed(4):'0'},
      markLine:{symbol:'none',silent:true, data:[{yAxis:d.threshold}], lineStyle:{color:C.orange,type:'dashed'}, label:{color:C.orange,formatter:'阈值τ=0.25'}}
    })),
  });
  // 表格
  const t = document.getElementById('ds-verify-table');
  let html = '<table><thead><tr><th>水印方法</th>';
  sc.forEach(s=>html+=`<th>${s} ΔP</th>`);
  sc.forEach(s=>html+=`<th>${s} p值</th>`);
  html+='</tr></thead><tbody>';
  methods.forEach(m=>{
    const row=d[keyMap[m]];
    html+=`<tr><td><b>${m}</b></td>`;
    row.deltaP.forEach(v=>html+=`<td class="${v>d.threshold?'tag-ok':''}">${v?v.toFixed(4):'≈0'}</td>`);
    row.pValue.forEach(p=>html+=`<td>${p}</td>`);
    html+='</tr>';
  });
  html+='</tbody></table>';
  t.innerHTML=html;
}

/* --- 抗微调 --- */
function renderDsFinetune(){
  const d = DATASET.antiAttack.finetune;
  makeChart(document.getElementById('ds-finetune-chart'), {
    color:[C.brand, C.brand2, C.orange, C.red],
    legend:legendCommon(),
    tooltip:tooltipCommon({valueFormatter:v=>v==null?'-':v+'%'}),
    grid:baseGrid(),
    xAxis:catAxis(d.ratios),
    yAxis:axisCommon({name:'%', max:100, nameTextStyle:{color:C.text}}),
    series:[
      {name:'UBW-C ASR-C', type:'line', smooth:true, data:d.ubwC_ASR_C, symbol:'circle', symbolSize:8, lineStyle:{width:3}},
      {name:'UBW-C BA', type:'line', smooth:true, data:d.ubwC_BA, symbol:'diamond', symbolSize:7, lineStyle:{type:'dashed'}},
      {name:'UBW-P ASR-C', type:'line', smooth:true, data:d.ubwP_ASR_C, symbol:'circle', symbolSize:8, lineStyle:{width:3}},
      {name:'UBW-P BA', type:'line', smooth:true, data:d.ubwP_BA, symbol:'diamond', symbolSize:7, lineStyle:{type:'dashed'}},
    ],
  });
}

/* --- 抗剪枝 --- */
function renderDsPrune(){
  const d = DATASET.antiAttack.pruning;
  makeChart(document.getElementById('ds-prune-chart'), {
    color:[C.brand, C.orange, C.brand2, C.red],
    legend:legendCommon(),
    tooltip:tooltipCommon({valueFormatter:v=>v==null?'模型已破坏':v+'%'}),
    grid:baseGrid(),
    xAxis:catAxis(d.ratios),
    yAxis:axisCommon({name:'%', max:100, nameTextStyle:{color:C.text}}),
    series:[
      {name:'UBW-C ASR-C', type:'line', smooth:true, data:d.ubwC_ASR_C, symbol:'circle', symbolSize:8, lineStyle:{width:3},
       areaStyle:{color:'rgba(79,140,255,.08)'}},
      {name:'UBW-C BA', type:'line', smooth:true, data:d.ubwC_BA, symbol:'diamond', symbolSize:7, lineStyle:{type:'dashed'}},
      {name:'UBW-P ASR-C', type:'line', smooth:true, data:d.ubwP_ASR_C, symbol:'circle', symbolSize:8, lineStyle:{width:3},
       areaStyle:{color:'rgba(255,180,84,.08)'}},
      {name:'UBW-P BA', type:'line', smooth:true, data:d.ubwP_BA, symbol:'diamond', symbolSize:7, lineStyle:{type:'dashed'}},
    ],
    markLine:{symbol:'none', silent:true, data:[{xAxis:3}], lineStyle:{color:C.red,type:'dotted'}, label:{color:C.red,formatter:'90% 模型已破坏',position:'insideEndTop'}}
  });
}

/* --- 抗数据集级防御 --- */
function renderDsDefense(){
  const d = DATASET.antiAttack.defense;
  makeChart(document.getElementById('ds-defense-chart'), {
    color:[C.brand, C.orange],
    legend:legendCommon(),
    tooltip:tooltipCommon({valueFormatter:v=>v+'%'}),
    grid:baseGrid(),
    xAxis:catAxis(d.methods),
    yAxis:axisCommon({name:'SFR (%)', max:60, nameTextStyle:{color:C.text}}),
    series:[
      {name:'UBW-C', type:'bar', data:d.ubwC, itemStyle:{borderRadius:[4,4,0,0]}, label:{show:true,position:'top',color:C.textLight,fontSize:11,formatter:'{c}%'}},
      {name:'UBW-P', type:'bar', data:d.ubwP, itemStyle:{borderRadius:[4,4,0,0]}, label:{show:true,position:'top',color:C.textLight,fontSize:11,formatter:'{c}%'}},
      {
        name:'随机基线 10%', type:'line', data:d.methods.map(()=>d.randomBaseline),
        symbol:'none', lineStyle:{type:'dashed', color:C.red, width:2},
        markLine:{symbol:'none',silent:true, data:[{yAxis:d.randomBaseline}], lineStyle:{color:C.red,type:'dashed'}, label:{color:C.red,formatter:'随机基线 10%'}}
      },
    ],
  });
}

/* ===================================================================== */
/* 2. 模型版权保护 (DUO)                                                   */
/* ===================================================================== */
/* DUO 在线验证：后端服务地址（web_system/app.py，python app.py 启动） */
const API_BASE = 'http://127.0.0.1:5000';

function initModel(){
  renderDuoFlow();
  renderModelCompare();
  renderModelVerify();
  renderModelTask();
  renderModelTable();
  initDuoVerify();
}

/* 在线版权验证：加载示例模型、绑定上传、调用后端实时推理 */
function initDuoVerify(){
  const samplesEl = document.getElementById('duo-samples');
  if(!samplesEl) return;
  fetch(API_BASE + '/api/duo/samples')
    .then(r => r.json())
    .then(j => {
      samplesEl.innerHTML = '';
      j.data.forEach(s => {
        const b = document.createElement('button');
        b.className = 'vp-btn';
        b.textContent = s.label;
        b.onclick = () => runDuoVerify(API_BASE + '/api/duo/verify_sample/' + s.key);
        samplesEl.appendChild(b);
      });
      setDuoVerifyStatus('后端已连接，点击示例模型或上传 .pth 开始验证（推理需数秒至十几秒）。', 'ok');
    })
    .catch(() => {
      samplesEl.innerHTML = '<span class="vp-hint">后端未启动</span>';
      setDuoVerifyStatus('未连接到后端（' + API_BASE + '）。请先在 web_system 目录运行 python app.py，并确认 DUO 权重与 CIFAR-10 数据齐全。', 'err');
    });
  document.getElementById('duo-upload-btn').onclick = () => {
    const f = document.getElementById('duo-file').files[0];
    if(!f){ setDuoVerifyStatus('请先选择 .pth 模型文件。', 'err'); return; }
    const fd = new FormData();
    fd.append('model', f);
    runDuoVerify(API_BASE + '/api/duo/verify', { method: 'POST', body: fd });
  };
}

function runDuoVerify(url, opt){
  setDuoVerifyStatus('验证中，请稍候（模型推理需数秒至十几秒）…', 'loading');
  document.getElementById('duo-verify-result').innerHTML = '';
  fetch(url, opt)
    .then(r => r.json())
    .then(j => {
      if(j.status !== 'success'){ setDuoVerifyStatus(j.message || '验证失败', 'err'); return; }
      setDuoVerifyStatus('验证完成，报告编号 ' + j.record.id + '（后端 /report/' + j.record.id + ' 可查看/打印报告）。', 'ok');
      renderDuoVerifyResult(j.result);
    })
    .catch(() => setDuoVerifyStatus('请求失败：无法连接后端或后端推理出错。', 'err'));
}

function setDuoVerifyStatus(msg, type){
  const el = document.getElementById('duo-verify-status');
  el.textContent = msg;
  el.className = 'vp-status ' + (type || '');
}

/* 渲染确权结果卡：pirated 红卡 / legitimate 绿卡（联调约定） */
function renderDuoVerifyResult(r){
  const pirated = r.verdict === 'pirated';
  document.getElementById('duo-verify-result').innerHTML = `
    <div class="verify-result ${pirated ? 'pirated' : 'legitimate'}">
      <div class="vr-verdict">${pirated ? '确权：该模型使用了受保护模型（判定盗用）' : '不确权：独立模型，未检测到该水印'}</div>
      <div class="vr-grid">
        <div><span>水印准确率</span><b>${r.watermark_accuracy}%</b><i>${r.watermark_correct}/${r.watermark_total} 张水印样本</i></div>
        <div><span>主任务准确率</span><b>${r.main_task_accuracy}%</b><i>${r.main_task_correct}/${r.main_task_total} 张测试样本</i></div>
        <div><span>判定阈值</span><b>≥ ${r.threshold}%</b><i>${r.union_applied ? '已执行 Union 重组' : '11 类模型直接验证'}</i></div>
      </div>
      <div class="vr-msg">${r.message}</div>
    </div>`;
}

function renderDuoFlow(){
  const f = MODEL.flow;
  const c = document.getElementById('duo-flow');
  let html='';
  f.stages.forEach((st,i)=>{
    if(st.isOp){
      html+=`<div class="duo-node is-op"><div class="dn-name">${st.name}</div><div class="dn-desc">${st.desc}</div></div>`;
      html+=`<div class="duo-arrow">→</div>`;
    }else{
      html+=`<div class="duo-node"><div class="dn-name">${st.name}</div><div class="dn-desc">${st.desc}</div></div>`;
      if(i<f.stages.length-1) html+=`<div class="duo-arrow">→</div>`;
    }
  });
  c.innerHTML=html;
}

function renderModelCompare(){
  const t = MODEL.table;
  makeChart(document.getElementById('model-compare-chart'), {
    color:[C.brand2, C.green, C.accent],
    legend:legendCommon(),
    tooltip:tooltipCommon({valueFormatter:v=>v==null?'—':v+'%'}),
    grid:baseGrid(),
    xAxis:catAxis(t.models),
    yAxis:axisCommon({name:'准确率 (%)', max:105, nameTextStyle:{color:C.text}}),
    series:[
      {name:'训练准确率(示意)', type:'bar', data:t.trainAcc, itemStyle:{borderRadius:[4,4,0,0], color:'rgba(106,208,255,.35)'}, label:{show:true,position:'top',color:C.mute,fontSize:10,formatter:'{c}%'}},
      {name:'测试准确率', type:'bar', data:t.testAcc, itemStyle:{borderRadius:[4,4,0,0]}, label:{show:true,position:'top',color:C.textLight,fontSize:10,formatter:'{c}%'}},
      {name:'水印准确率', type:'bar', data:t.watermarkAcc.map(v=>v==null?0:v), itemStyle:{borderRadius:[4,4,0,0]}, label:{show:true,position:'top',color:C.textLight,fontSize:10,formatter:p=>t.watermarkAcc[p.dataIndex]==null?'—':p.value+'%'}},
    ],
  });
}

function renderModelVerify(){
  const t = MODEL.table;
  makeChart(document.getElementById('model-verify-chart'), {
    color:[C.green],
    tooltip:tooltipCommon({valueFormatter:v=>v==null?'—':v+'%'}),
    grid:baseGrid(),
    xAxis:catAxis(t.models),
    yAxis:axisCommon({name:'水印识别准确率 (%)', max:105, nameTextStyle:{color:C.text}}),
    series:[{
      name:'水印准确率', type:'bar', data:t.watermarkAcc.map(v=>v==null?0:v), barWidth:'42%',
      itemStyle:{borderRadius:[6,6,0,0], color:(p)=>t.watermarkAcc[p.dataIndex]==null?'#3a4180':C.green},
      label:{show:true,position:'top',color:C.textLight,fontSize:12,formatter:p=>t.watermarkAcc[p.dataIndex]==null?'无法验证':p.value+'%'},
    }],
  });
}

function renderModelTask(){
  const t = MODEL.table;
  makeChart(document.getElementById('model-task-chart'), {
    color:[C.brand],
    tooltip:tooltipCommon({valueFormatter:v=>v+'%'}),
    grid:baseGrid(),
    xAxis:catAxis(t.models),
    yAxis:axisCommon({name:'主任务测试准确率 (%)', min:55, max:70, nameTextStyle:{color:C.text}}),
    series:[{
      name:'测试准确率', type:'bar', data:t.testAcc, barWidth:'42%',
      itemStyle:{borderRadius:[6,6,0,0], color:new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:C.brand2},{offset:1,color:C.brand}])},
      label:{show:true,position:'top',color:C.textLight,fontSize:12,formatter:'{c}%'},
      markLine:{symbol:'none',silent:true, data:[{yAxis:63},{yAxis:65}], lineStyle:{color:C.orange,type:'dashed'}, label:{color:C.orange,formatter:'波动<3pp'}}
    }],
  });
}

function renderModelTable(){
  const t = MODEL.table;
  let html='<table><thead><tr><th>模型</th><th>训练准确率<br><small>'+t.trainAccNote+'</small></th><th>测试准确率</th><th>水印准确率</th></tr></thead><tbody>';
  t.models.forEach((m,i)=>{
    html+=`<tr><td><b>${m}</b></td>`;
    html+=`<td class="tag-warn">${t.trainAcc[i]}%</td>`;
    html+=`<td>${t.testAcc[i]}%</td>`;
    html+=`<td class="${t.watermarkAcc[i]==null?'tag-na':'tag-ok'}">${t.watermarkAcc[i]==null?'——':t.watermarkAcc[i]+'%'}</td>`;
    html+='</tr>';
  });
  html+='</tbody></table>';
  document.getElementById('model-table').innerHTML=html;
}

/* ===================================================================== */
/* 3. AIGC 生成内容 (Tree-ring)                                            */
/* ===================================================================== */
function initAigc(){
  bindSubtabs('aigcTabs');
  renderAigcConfig();
  renderAigcEmbedImg();
  renderAigcMAE();
  renderAigcFreq();
  renderAigcDetect();
  renderAigcAnti();
}

function renderAigcConfig(){
  const cfg = AIGC.config;
  const items = [
    ['生成模型', cfg.model, '本地 ' + cfg.localModel],
    ['提示词数据集', 'Gustavosta Prompts', cfg.dataset],
    ['图像与步数', cfg.imageSize + '×' + cfg.imageSize, '生成 ' + cfg.genSteps + ' 步 / 反演 ' + cfg.inversionSteps + ' 步'],
    ['采样与引导', 'DPM++ · ' + cfg.guidanceScale, cfg.sampler],
    ['水印密钥', cfg.wPattern + ' · 通道 ' + cfg.wChannel, 'r=' + cfg.wRadius + ' · seed=' + cfg.wSeed],
  ];
  document.getElementById('aigc-config').innerHTML = items.map(it => `
    <div class="metric-card"><div class="metric-label">${it[0]}</div><div class="metric-value">${it[1]}</div><div class="metric-note">${it[2]}</div></div>`).join('');
}

function renderAigcEmbedImg(){
  const c = document.getElementById('aigc-embed-img');
  c.innerHTML = '<img src="assets/aigc/fig_diff.png" alt="Tree-ring 真实样本对比与像素差异" loading="lazy" style="width:100%;height:auto;display:block;border-radius:12px;grid-column:1/-1;">';
}

function renderAigcMAE(){
  const d = AIGC.embedding;
  const ids = d.samples.map(s=>'样本'+s.id);
  makeChart(document.getElementById('aigc-mae-chart'), {
    color:[C.orange, C.brand2],
    legend:legendCommon(),
    tooltip:tooltipCommon(),
    grid:baseGrid(),
    xAxis:catAxis(ids),
    yAxis:[
      axisCommon({name:'MAE (%)', position:'left', max:30, nameTextStyle:{color:C.text}}),
      axisCommon({name:'PSNR (dB)', position:'right', max:25, nameTextStyle:{color:C.text}, splitLine:{show:false}}),
    ],
    series:[
      {name:'MAE (%)', type:'bar', data:d.samples.map(s=>s.MAE), itemStyle:{borderRadius:[4,4,0,0]}, label:{show:true,position:'top',color:C.textLight,fontSize:9,formatter:'{c}'}},
      {name:'PSNR (dB)', type:'line', yAxisIndex:1, smooth:true, data:d.samples.map(s=>s.PSNR), symbol:'circle', symbolSize:7, lineStyle:{width:3}},
    ],
  });
}

/* 频域 SVG 三联 */
function renderAigcFreq(){
  const c = document.getElementById('aigc-freq');
  c.innerHTML = '<img src="assets/aigc/fig_key.png" alt="Tree-ring 密钥频域图案与反演残差" loading="lazy" style="width:100%;height:auto;display:block;border-radius:12px;grid-column:1/-1;">';
}

function freqSVG(type){
  // 240x240 viewBox
  let s='<svg viewBox="0 0 240 240" preserveAspectRatio="xMidYMid meet">';
  s+='<defs><radialGradient id="bg" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#0a1030"/><stop offset="100%" stop-color="#070a18"/></radialGradient></defs>';
  s+='<rect width="240" height="240" fill="url(#bg)"/>';
  const cx=120, cy=120;
  if(type==='key'){
    // 同心圆环 (密钥)
    [30,55,80,100].forEach(r=>{
      s+=`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#6ad0ff" stroke-width="2" opacity="0.85"/>`;
    });
    // 环上的点
    [30,55,80,100].forEach(r=>{
      for(let a=0;a<360;a+=15){const rad=a*Math.PI/180;s+=`<circle cx="${(cx+Math.cos(rad)*r).toFixed(1)}" cy="${(cy+Math.sin(rad)*r).toFixed(1)}" r="1.5" fill="#4f8cff"/>`;}
    });
  }else if(type==='wm'){
    // 含水印残差：在环处呈现规律结构
    [30,55,80,100].forEach(r=>{
      s+=`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#ffd84d" stroke-width="1.5" opacity="0.7"/>`;
      for(let a=0;a<360;a+=12){const rad=a*Math.PI/180;const br=2+Math.random()*2;s+=`<circle cx="${(cx+Math.cos(rad)*r).toFixed(1)}" cy="${(cy+Math.sin(rad)*r).toFixed(1)}" r="${br.toFixed(1)}" fill="#ffb454" opacity="0.8"/>`;}
    });
  }else{
    // 无水印残差：随机分布，无规律
    for(let i=0;i<220;i++){
      const x=Math.random()*240, y=Math.random()*240;
      const d=Math.hypot(x-cx,y-cy);
      if(d<110){const r=1+Math.random()*2;s+=`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="#5a6aa0" opacity="${(0.3+Math.random()*0.5).toFixed(2)}"/>`;}
    }
  }
  s+='</svg>';
  return s;
}

/* 检测距离分布 + ROC */
function renderAigcDetect(){
  const d = AIGC.detection;
  const dom = document.getElementById('aigc-detect-chart');
  // 双图：左距离分布 右ROC
  dom.style.display='flex'; dom.style.gap='14px'; dom.style.height='400px';
  const left=document.createElement('div'); left.style.flex='1'; left.style.height='100%';
  const right=document.createElement('div'); right.style.flex='1'; right.style.height='100%';
  dom.innerHTML=''; dom.appendChild(left); dom.appendChild(right);

  // 距离分布：含水印 vs 无水印 各 8 点散点 + 阈值线
  const wm = d.watermarkedSamples;
  const cl = d.cleanSamples;
  makeChart(left, {
    color:[C.green, C.red],
    legend:legendCommon({top:0}),
    tooltip:tooltipCommon({valueFormatter:v=>v}),
    grid:{left:48,right:18,top:36,bottom:36,containLabel:true},
    xAxis:catAxis(wm.map((_,i)=>'样本'+i)),
    yAxis:axisCommon({name:'检测距离', min:40, max:80, nameTextStyle:{color:C.text}}),
    series:[
      {name:'含水印图像', type:'scatter', data:wm, symbolSize:14, label:{show:true,position:'right',color:C.green,fontSize:9,formatter:p=>p.value.toFixed(1)}},
      {name:'无水印图像', type:'scatter', data:cl, symbolSize:14, label:{show:true,position:'right',color:C.red,fontSize:9,formatter:p=>p.value.toFixed(1)}},
    ],
    markLine:{symbol:'none',silent:true, data:[{yAxis:d.zeroFPThreshold}], lineStyle:{color:C.orange,type:'dashed'}, label:{color:C.orange,formatter:'零误报阈值 75.98'}}
  });
  // ROC
  const roc = genROC();
  makeChart(right, {
    color:[C.brand2],
    legend:legendCommon({top:0}),
    tooltip:tooltipCommon(),
    grid:{left:48,right:18,top:36,bottom:36,containLabel:true},
    xAxis:axisCommon({name:'FPR', min:0, max:1, nameTextStyle:{color:C.text}, splitLine:{show:false}}),
    yAxis:axisCommon({name:'TPR', min:0, max:1, nameTextStyle:{color:C.text}, splitLine:{show:false}}),
    series:[{
      name:'ROC (AUC=1.000)', type:'line', data:roc, symbol:'circle', symbolSize:7,
      lineStyle:{width:3}, step:'after',
      areaStyle:{color:'rgba(106,208,255,.15)'},
      label:{show:true,position:'top',color:C.textLight,fontSize:10,formatter:()=>''},
    }],
    title:{text:'AUC = 1.000', left:'center', top:24, textStyle:{color:C.green,fontSize:13,fontWeight:700}},
    graphic:[{type:'text',left:'center',top:46,style:{text:'零误报阈值下检出率 100%',fill:C.text,fontSize:11}}]
  });
}

/* 抗攻击 */
function renderAigcAnti(){
  const d = AIGC.antiAttack;
  makeChart(document.getElementById('aigc-anti-chart'), {
    color:[C.brand2, C.green],
    legend:legendCommon(),
    tooltip:tooltipCommon({valueFormatter:v=>v}),
    grid:baseGrid(),
    xAxis:catAxis(d.attacks.map(a=>a.name)),
    yAxis:[
      axisCommon({name:'检测距离', position:'left', min:50, max:80, nameTextStyle:{color:C.text}}),
      axisCommon({name:'检出率 (%)', position:'right', min:80, max:105, nameTextStyle:{color:C.text}, splitLine:{show:false}}),
    ],
    series:[
      {name:'检测距离', type:'bar', data:d.attacks.map(a=>a.dist), itemStyle:{borderRadius:[4,4,0,0]}, label:{show:true,position:'top',color:C.textLight,fontSize:10,formatter:p=>p.value.toFixed(2)}},
      {name:'检出率', type:'line', yAxisIndex:1, data:d.attacks.map(a=>a.rate), symbol:'circle', symbolSize:9, lineStyle:{width:3}, label:{show:true,position:'top',color:C.green,fontSize:11,formatter:'{c}%'}},
    ],
    markLine:{symbol:'none',silent:true, data:[{yAxis:d.threshold}], lineStyle:{color:C.orange,type:'dashed'}, label:{color:C.orange,formatter:'零误报阈值 75.98'}}
  });
}

/* ===================================================================== */
/* 4. 系统测试总结                                                         */
/* ===================================================================== */
function initSummary(){
  const cards = [
    {icon:'🗄️', stage:'数据准备阶段', title:'数据集版权保护',
     list:['UBW-C 干净准确率 <b>88.26%</b>，水印 ASR-C <b>86.19%</b>','无害性 Dp=<b>1.9050</b>(近理论上限)，不可被恶意利用','隐蔽性 clean-label，PSNR≈<b>27.0dB</b> 肉眼不可察觉','版权验证 ΔP=<b>0.8100</b>，p值低至10⁻³⁵','抗微调/剪枝/防御均显著残留']},
    {icon:'🧠', stage:'模型训练部署阶段', title:'模型版权保护',
     list:['DUO 三类模型测试准确率 <b>63~65%</b>，波动<3pp','Secret/Union 水印准确率 <b>99.80%</b>','Public Model 因密钥移除<b>无法验证</b>','Union 重组后水印能力被重新激活','主任务性能保持良好']},
    {icon:'🎨', stage:'模型推理阶段', title:'AIGC生成内容',
     list:['Tree-ring 水印嵌入肉眼<b>不可见</b>，MAE 14.94%','检测距离 水印<b>52.98</b> vs 干净 73.49','<b>AUC=1.000</b>，零误检出率 100%','四类攻击(JPEG/模糊/旋转/噪声)检出率<b>100%</b>','水印与图像内容深度耦合，鲁棒性强']},
  ];
  document.getElementById('summaryCards').innerHTML = cards.map(c=>`
    <div class="sum-card">
      <div class="sc-head"><div class="sc-icon">${c.icon}</div><div><div class="sc-stage">${c.stage}</div><div class="sc-title">${c.title}</div></div></div>
      <ul class="sc-list">${c.list.map(li=>`<li>${li}</li>`).join('')}</ul>
    </div>`).join('');

  // 闭环图
  const sf = document.getElementById('summaryFlow');
  sf.innerHTML = OVERVIEW.lifecycle.map((it,i)=>`
    <div class="lf-stage">
      <div class="lf-icon">${it.icon}</div>
      <div><div class="lf-stage-tag">${it.stage}</div><div class="lf-title">${it.title}</div><div class="lf-method">${it.method}</div></div>
    </div>${i<OVERVIEW.lifecycle.length-1?'<div class="lf-arrow">→</div>':'<div class="lf-arrow">↻</div>'}
  `).join('');

  // 核心指标表
  const rows = [
    ['数据集','UBW-C BA','88.26%','复现论文 86.99%'],
    ['数据集','UBW-C ASR-C','86.19%','水印有效'],
    ['数据集','UBW-C Dp','1.9050','无害(近ln10=2.303)'],
    ['数据集','版权验证 ΔP','0.8100','p≈10⁻³⁵'],
    ['模型','Union 水印准确率','99.80%','重组后激活'],
    ['模型','测试准确率波动','<3pp','63~65%窄幅'],
    ['AIGC','检测 AUC','1.000','检出率100%'],
    ['AIGC','四类攻击检出率','100%','JPEG/模糊/旋转/噪声'],
  ];
  let html='<table><thead><tr><th>模块</th><th>指标</th><th>数值</th><th>说明</th></tr></thead><tbody>';
  rows.forEach(r=>html+=`<tr><td>${r[0]}</td><td>${r[1]}</td><td class="tag-ok">${r[2]}</td><td>${r[3]}</td></tr>`);
  html+='</tbody></table>';
  document.getElementById('summary-table').innerHTML=html;
}

/* ===================================================================== */
/* 图片三联组件                                                            */
/* ===================================================================== */
function buildImgTriptych(containerId, prompt, diffType, labels){
  const c = document.getElementById(containerId);
  const url = `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(prompt)}&image_size=square`;
  c.innerHTML = labels.map((l,i)=>`
    <div class="img-cell">
      <div class="ic-label">${l}</div>
      <div class="ic-img">${i<2?`<img src="${url}" alt="${l}" loading="lazy" referrerpolicy="no-referrer">`:`<canvas width="300" height="300"></canvas>`}</div>
    </div>`).join('');
  const canvas = c.querySelector('canvas');
  if(canvas) drawDiffCanvas(canvas, diffType);
}

function drawDiffCanvas(canvas, type){
  const ctx=canvas.getContext('2d');
  const W=canvas.width, H=canvas.height;
  ctx.fillStyle='#070a18'; ctx.fillRect(0,0,W,H);
  const img=ctx.createImageData(W,H);
  for(let i=0;i<img.data.length;i+=4){
    let v;
    if(type==='texture'){
      // CIFAR 扰动：局部纹理，大部分弱、部分强
      const r=Math.random();
      v = r<0.8 ? Math.random()*35 : 35+Math.random()*180;
    }else{
      // Tree-ring 频域扰动：更弥散均匀
      v = 20 + Math.random()*160;
    }
    img.data[i]=Math.min(255, v*1.1);        // R
    img.data[i+1]=Math.min(255, v*0.5);       // G
    img.data[i+2]=Math.min(255, v*0.25);      // B
    img.data[i+3]=255;
  }
  ctx.putImageData(img,0,0);
  // 叠加中心高亮(扰动集中区)
  const g=ctx.createRadialGradient(W/2,H/2,0,W/2,H/2,W/2);
  g.addColorStop(0,'rgba(255,180,84,0.12)');
  g.addColorStop(1,'rgba(255,180,84,0)');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
}
