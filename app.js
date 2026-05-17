const DATA=window.CTI_APP_DATA||{};
const EJEMPLO=window.CTI_SESION_EJEMPLO||{};
const STORE='cti_ia_dss_pwa_session_v9_ahp';
const HIST='cti_ia_dss_pwa_historico_v9_ahp';
const CONFIG='cti_ia_dss_pwa_config_v9_ahp';
const GPT_URL='https://chatgpt.com/g/g-69e24256e3188191b2ed26ffdbc017fe-asistente-decision-tecnica-hospitalaria';
const TABS=['Instrucciones','Caso','Base','Propuesto','Prompt IA','Resultados caso','Resultados globales','Retroalimentación','Análisis ABCD'];
let current='1', tab='Instrucciones';
let session=loadJSON(STORE)||{};
let historico=loadJSON(HIST)||[];
let ahpUnlocked=false;
let ahpConfig=loadJSON(CONFIG)||null;
function $(id){return document.getElementById(id)}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function num(v){let n=parseFloat(String(v??'').replace(',','.'));return isNaN(n)?0:n}
function normTxt(x){return String(x??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim()}
function normSistema(x){let t=normTxt(x).replace(/\s+/g,''); if(t.includes('SCADA')||t.includes('BMS'))return 'SCADA/BMS'; if(t.includes('ELECTR'))return 'ELECTRICO'; if(t.includes('GAS'))return 'GASES'; if(t.includes('HVAC')||t.includes('CLIMA'))return 'HVAC'; return String(x??'SIN SISTEMA').trim()||'SIN SISTEMA'}
function defaultAHP(){
  let out={password:'cti2026',weights:{}};
  for(const r of (DATA.pesos||[])){
    if(Array.isArray(r)&&String(r[0]??'').trim()&&String(r[1]??'').trim()){
      let sys=normSistema(r[0]);
      out.weights[sys]={w1:num(r[1]),w2:num(r[2]),w3:num(r[3]),w4:num(r[4]),comentario:String(r[5]||'')};
    }
  }
  for(const sys of ['HVAC','ELECTRICO','GASES','SCADA/BMS']){
    out.weights[sys]??={w1:0.4,w2:0.3,w3:0.15,w4:0.15,comentario:'Pesos AHP por defecto'};
  }
  return out;
}
function getAHPConfig(){
  if(!ahpConfig||!ahpConfig.weights){ahpConfig=defaultAHP();localStorage.setItem(CONFIG,JSON.stringify(ahpConfig));}
  return ahpConfig;
}
function saveAHPConfig(){localStorage.setItem(CONFIG,JSON.stringify(ahpConfig));}
function pesoForSistema(sis){let target=normSistema(sis||'HVAC');let cfg=getAHPConfig();return cfg.weights[target]||cfg.weights.HVAC||{w1:0.4,w2:0.3,w3:0.15,w4:0.15,comentario:'Pesos AHP por defecto'}}
function applyPesos(){let c=ensureCase();c.prop??={};let w=pesoForSistema(c.prop.Sistema);c.prop.w1=w.w1;c.prop.w2=w.w2;c.prop.w3=w.w3;c.prop.w4=w.w4;c.prop.pesos_comentario=w.comentario||'AHP activo: pesos internos aplicados según sistema';return w}
function fmt(n,d=2){return isFinite(n)?Number(n).toLocaleString('es-ES',{maximumFractionDigits:d,minimumFractionDigits:d}):'—'}
function pct(x){return isFinite(x)?(x*100).toLocaleString('es-ES',{maximumFractionDigits:1})+'%':'—'}
function loadJSON(k){try{return JSON.parse(localStorage.getItem(k))}catch{return null}}
function saveAll(){calcCase();localStorage.setItem(STORE,JSON.stringify(session));localStorage.setItem(HIST,JSON.stringify(historico));status('Guardado')}
function status(t){$('status').textContent=t;setTimeout(()=>{$('status').textContent='Listo'},1800)}
function ensureCase(id=current){session[id]??={base:{},prop:{},ia:{},base_obs:'',ia_summary:'',prompt:''};return session[id]}
function val(path){let [a,b]=path.split('.');return ensureCase()[a]?.[b]??ensureCase()[path]??''}
function setVal(path,v){let [a,b]=path.split('.');let c=ensureCase(); if(b){c[a]??={}; c[a][b]=v}else c[path]=v; calcCase(false)}
function opts(key){return (DATA.listas&&DATA.listas[key])||[]}
function selectOptions(arr,val=''){let a=[...new Set((arr||[]).filter(Boolean))]; if(val&&!a.includes(val))a.unshift(val); return '<option value=""></option>'+a.map(x=>`<option ${x==val?'selected':''}>${esc(x)}</option>`).join('')}
function field(label,path,type='text',cls='edit',options=null){let v=val(path); let ro=cls==='formula'?' readonly':''; let input= options?`<select class="${cls}" data-path="${path}"${ro}>${selectOptions(options,v)}</select>`: type==='textarea'?`<textarea class="${cls}" data-path="${path}"${ro}>${esc(v)}</textarea>`:`<input class="${cls}" type="${type}" value="${esc(v)}" data-path="${path}"${ro}>`; return `<div class="field"><label>${esc(label)}</label>${input}</div>`}
function calcMin(prefix,scope){let o=ensureCase()[scope]||{}; return num(o[prefix+'_min'])+num(o[prefix+'_seg'])/60}
function calcMinObj(o,prefix){return num(o?.[prefix+'_min'])+num(o?.[prefix+'_seg'])/60}
function metricsFor(c){c??={};let b=c.base||{},p=c.prop||{};let lb=calcMinObj(b,'lcons_base')+calcMinObj(b,'leval_base')+calcMinObj(b,'lval_base');let tb=lb+calcMinObj(b,'tint_base');let lp=calcMinObj(p,'lcons_prop')+calcMinObj(p,'leval_prop')+calcMinObj(p,'lval_prop');let tp=lp+calcMinObj(p,'tint_prop');return {sistema:normSistema(p.Sistema||'SIN SISTEMA'),complete:tb>0&&tp>0,ldec_b:lb,ldec_p:lp,tt_b:tb,tt_p:tp,deltaLdec:lb-lp,mejoraLdec:lb?(lb-lp)/lb:0,deltaT:tb-tp,mejoraT:tb?(tb-tp)/tb:0}}
function calcCase(renderNow=true){let c=ensureCase(); c.base??={}; c.prop??={}; applyPesos();
 c.base.Lcons_base_min=calcMin('lcons_base','base'); c.base.Leval_base_min=calcMin('leval_base','base'); c.base.Lval_base_min=calcMin('lval_base','base'); c.base.Ldec_base_min=c.base.Lcons_base_min+c.base.Leval_base_min+c.base.Lval_base_min; c.base.Tint_base_min=calcMin('tint_base','base'); c.base.Ttotal_base_min=c.base.Ldec_base_min+c.base.Tint_base_min;
 c.prop.Lcons_prop_min=calcMin('lcons_prop','prop'); c.prop.Leval_prop_min=calcMin('leval_prop','prop'); c.prop.Lval_prop_min=calcMin('lval_prop','prop'); c.prop.Ldec_prop_min=c.prop.Lcons_prop_min+c.prop.Leval_prop_min+c.prop.Lval_prop_min; c.prop.Tint_prop_min=calcMin('tint_prop','prop'); c.prop.Ttotal_prop_min=c.prop.Ldec_prop_min+c.prop.Tint_prop_min;
 c.prop.deltaLdec=c.base.Ldec_base_min-c.prop.Ldec_prop_min; c.prop.mejoraLdec=c.base.Ldec_base_min?c.prop.deltaLdec/c.base.Ldec_base_min:0; c.prop.deltaT=c.base.Ttotal_base_min-c.prop.Ttotal_prop_min; c.prop.mejoraT=c.base.Ttotal_base_min?c.prop.deltaT/c.base.Ttotal_base_min:0;
 let crit=parseCriterios(); if(crit){['d1','d2','d3'].forEach((d,i)=>{let C=crit[i];let J=num(c.prop.w1||0.4)*C[0]+num(c.prop.w2||0.3)*prefT(C[1])+num(c.prop.w3||0.15)*C[2]+num(c.prop.w4||0.15)*C[3];c.prop['J_'+d]=J}); let best=['d1','d2','d3'].sort((a,b)=>num(c.prop['J_'+a])-num(c.prop['J_'+b]))[0]; c.prop.Decision_prop=c.prop[best+'_cti']||c.base[best]||'' }
 if(renderNow && tab.startsWith('Resultados')) render(); }
function prefT(t){t=num(t); if(t<=10)return 0;if(t>=30)return 1;return (t-10)/20}
function parseCriterios(){let s=val('ia.Criterios_IA'); if(!s)return null; let a=s.replace(/;/g,',').split(',').map(x=>num(x.trim())); if(a.length<12)return null; return [a.slice(0,4),a.slice(4,8),a.slice(8,12)]}
function currentCaseMeta(){let c=DATA.cases?.find(x=>String(x.id)==String(current));return c||{id:current,enunciado:''}}
function hfield(h,...keys){for(const k of keys){if(h&&h[k]!=null&&h[k]!=='' )return h[k]}return ''}
function histForCurrent(){return historico.find(h=>String(h.caso)==String(current))||null}
function applyHistToRetro(force=false){let c=ensureCase();c.retro??={};let h=histForCurrent();if(!h)return false;let empty=!c.retro.alternativa&&!c.retro.resuelto&&!c.retro.tiempo&&!c.retro.causa&&!c.retro.solucion&&!c.retro.obs;if(force||empty){c.retro.alternativa=hfield(h,'alternativa','alternativa_final');c.retro.resuelto=hfield(h,'resuelto','funciono');c.retro.tiempo=hfield(h,'tiempo','tiempo_real_total_min','t_real');c.retro.causa=hfield(h,'causa','causa_raiz');c.retro.solucion=hfield(h,'solucion','solucion_real');c.retro.obs=hfield(h,'obs','observaciones');return true}return false}
function normText(x){return String(x||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
function similar(){let c=ensureCase();let sis=normText(c.prop?.Sistema), sub=normText(c.prop?.Subtipo), ev=normText(c.prop?.Evento);let exact=historico.filter(h=>(!sis||normText(h.sistema)==sis)&&(!sub||normText(h.subtipo)==sub)&&(!ev||normText(h.evento)==ev)); return exact.slice(-8).reverse()}

function ahpStatusBlock(){
  let c=ensureCase();let sys=normSistema(c.prop?.Sistema||'HVAC');let w=pesoForSistema(sys);let sum=num(w.w1)+num(w.w2)+num(w.w3)+num(w.w4);
  return `<div class="ahp-box"><h3>Modelo multicriterio AHP</h3><p><b>AHP activo:</b> pesos internos aplicados automáticamente según sistema (${esc(sys)}).</p><p class="muted">Los valores permanecen ocultos en modo operativo. Para auditoría, defensa o calibración, usa configuración avanzada protegida.</p><p><button class="btn secondary" id="openAHP">⚙ Configuración avanzada AHP</button></p>${ahpUnlocked?ahpPanel():''}</div>`;
}
function ahpPanel(){
  let cfg=getAHPConfig();let systems=['HVAC','ELECTRICO','GASES','SCADA/BMS'];
  let rows=systems.map(sys=>{let w=cfg.weights[sys]||{};let suma=num(w.w1)+num(w.w2)+num(w.w3)+num(w.w4);return `<tr><td><b>${esc(sys)}</b></td><td><input class="calc small" data-ahp="${sys}.w1" type="number" step="0.01" value="${esc(w.w1??'')}"></td><td><input class="calc small" data-ahp="${sys}.w2" type="number" step="0.01" value="${esc(w.w2??'')}"></td><td><input class="calc small" data-ahp="${sys}.w3" type="number" step="0.01" value="${esc(w.w3??'')}"></td><td><input class="calc small" data-ahp="${sys}.w4" type="number" step="0.01" value="${esc(w.w4??'')}"></td><td>${fmt(suma,2)}</td><td><input class="calc" data-ahp="${sys}.comentario" value="${esc(w.comentario||'')}"></td></tr>`}).join('');
  return `<div class="advanced-panel"><h4>Configuración avanzada protegida</h4><p class="help">Estos pesos forman parte de la parametrización experta del modelo. Se guardan solo en este navegador mediante localStorage.</p><div class="tablewrap"><table class="table"><thead><tr><th>Sistema</th><th>w1 impacto</th><th>w2 tiempo</th><th>w3 riesgo</th><th>w4 complejidad</th><th>Suma</th><th>Comentario</th></tr></thead><tbody>${rows}</tbody></table></div><div class="grid"><div class="col-6"><div class="field"><label>Nueva contraseña modo avanzado</label><input class="calc" id="ahpNewPass" type="password" placeholder="Dejar vacío para mantener la actual"></div></div><div class="col-6 row" style="align-items:end"><button class="btn" id="saveAHP">Guardar configuración AHP</button><button class="btn secondary" id="resetAHP">Restaurar valores XLSX</button><button class="btn secondary" id="lockAHP">Ocultar</button></div></div><p class="muted">Nota: en GitHub Pages esta contraseña evita cambios accidentales y oculta complejidad, pero no es seguridad criptográfica real.</p></div>`;
}
function bindAHP(){
  let open=$('openAHP'); if(open) open.onclick=()=>{let pass=prompt('Contraseña de configuración avanzada AHP:'); if(pass===getAHPConfig().password){ahpUnlocked=true;render();status('Modo avanzado AHP abierto')}else if(pass!==null){alert('Contraseña incorrecta')}};
  document.querySelectorAll('[data-ahp]').forEach(el=>{el.oninput=()=>{let [sys,key]=el.dataset.ahp.split('.');let cfg=getAHPConfig();cfg.weights[sys]??={};cfg.weights[sys][key]=key==='comentario'?el.value:num(el.value);}});
  let save=$('saveAHP'); if(save) save.onclick=()=>{let cfg=getAHPConfig();let np=$('ahpNewPass')?.value?.trim(); if(np)cfg.password=np; saveAHPConfig(); applyPesos(); saveAll(); render(); status('Configuración AHP guardada')};
  let reset=$('resetAHP'); if(reset) reset.onclick=()=>{if(confirm('¿Restaurar pesos AHP originales del XLSX?')){ahpConfig=defaultAHP();saveAHPConfig();applyPesos();saveAll();render();status('Pesos AHP restaurados')}};
  let lock=$('lockAHP'); if(lock) lock.onclick=()=>{ahpUnlocked=false;render();status('Modo avanzado AHP oculto')};
}

function promptText(){let c=ensureCase(); let hist=similar().map((h,i)=>`Caso similar ${i+1}: caso=${hfield(h,'caso')}; solución=${hfield(h,'solucion','solucion_real','alternativa','alternativa_final')}; funcionó=${hfield(h,'resuelto','funciono')}; tiempo=${hfield(h,'tiempo','tiempo_real_total_min')} min; causa=${hfield(h,'causa','causa_raiz')}; observaciones=${hfield(h,'obs','observaciones')}`).join('\n'); return `Actúa como asistente de decisión técnica hospitalaria.\n\nENUNCIADO DEL CASO ${current}:\n${currentCaseMeta().enunciado}\n\nMÉTODO BASE:\n- d1: ${c.base.d1||''}\n- d2: ${c.base.d2||''}\n- d3: ${c.base.d3||''}\n- decisión base: ${c.base.Decision_base||''}\n- Ldec base: ${fmt(c.base.Ldec_base_min)} min\n- Ttotal base: ${fmt(c.base.Ttotal_base_min)} min\n\nCTI / MÉTODO PROPUESTO:\n- Sistema: ${c.prop.Sistema||''}\n- Subtipo: ${c.prop.Subtipo||''}\n- Evento: ${c.prop.Evento||''}\n- Criticidad: ${c.prop.Criticidad||''}\n- QX activo: ${c.prop.QX_activo||''}\n- Redundancia: ${c.prop.Redundancia||''}\n- SA: ${c.prop.SA||''}\n- Normativa: ${c.prop.Normativa||''}\n- Alternativas CTI: ${c.prop.d1_cti||''} | ${c.prop.d2_cti||''} | ${c.prop.d3_cti||''}\n\nVARIABLES:\n1. ${c.prop.Var1_nombre||''}: ${c.prop.Var1_valor||''} (${c.prop.Var1_tendencia||''})\n2. ${c.prop.Var2_nombre||''}: ${c.prop.Var2_valor||''} (${c.prop.Var2_tendencia||''})\n3. ${c.prop.Var3_nombre||''}: ${c.prop.Var3_valor||''} (${c.prop.Var3_tendencia||''})\n4. ${c.prop.Var4_nombre||''}: ${c.prop.Var4_valor||''} (${c.prop.Var4_tendencia||''})\n\nHISTÓRICO VALIDADO SIMILAR:\n${hist||'No hay histórico validado local para este caso.'}\n\nDevuelve: alternativa sugerida, justificación técnica, matriz C1,C2,C3,C4 para d1-d3 en escala compatible y resumen breve para completar el método propuesto.`}
function init(){getAHPConfig();DATA.cases?.forEach(c=>{let o=document.createElement('option');o.value=c.id;o.textContent='Caso '+c.id; $('caseSelect').appendChild(o)}); $('caseSelect').value=current; $('caseSelect').onchange=e=>{saveAll();current=e.target.value;render()}; $('tabs').innerHTML=TABS.map(t=>`<button class="${t==tab?'active':''}" data-tab="${t}">${t}</button>`).join(''); $('tabs').onclick=e=>{if(e.target.dataset.tab){saveAll();tab=e.target.dataset.tab;renderTabs();render()}}; $('view').addEventListener('input',e=>{let p=e.target.dataset.path;if(p){setVal(p,e.target.value);liveUpdate()}}); $('view').addEventListener('change',e=>{let p=e.target.dataset.path;if(p){setVal(p,e.target.value);if(p.endsWith('d1')||p.endsWith('d2')||p.endsWith('d3'))render()}}); $('saveBtn').onclick=saveAll; $('exportBtn').onclick=exportSession; $('importBtn').onclick=()=>$('importFile').click(); let db=$('demoBtn'); if(db)db.onclick=loadDemo; let hb=$('histDemoBtn'); if(hb)hb.onclick=loadDemoHistorico; $('importFile').onchange=importSession; let rb=$('resetBtn'); if(rb)rb.onclick=resetSession; render()}
function renderTabs(){$('tabs').querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.tab==tab))}
function liveUpdate(){document.querySelectorAll('[data-calc]').forEach(el=>{let v=val(el.dataset.calc);el.textContent=typeof v==='number'?fmt(v):v})}
function render(){calcCase(false); renderTabs(); let html=''; if(tab==='Instrucciones')html=viewInstructions(); if(tab==='Caso')html=viewCaso(); if(tab==='Base')html=viewBase(); if(tab==='Propuesto')html=viewProp(); if(tab==='Prompt IA')html=viewPrompt(); if(tab==='Resultados caso')html=viewResultados(); if(tab==='Resultados globales')html=viewGlobal(); if(tab==='Retroalimentación')html=viewRetro(); if(tab==='Análisis ABCD')html=viewAnalisisABCD(); $('view').innerHTML=html; bindSpecial();}
function viewInstructions(){let rows=(DATA.instructions||[]).map(r=>Array.isArray(r)?r.filter(Boolean).join(' '):r).filter(Boolean);return `<div class="card"><h2>Protocolo operativo</h2><p><span class="bluehint">Azul</span> = rellena/valida el ingeniero. <span class="brownhint">Marrón</span> = calculado/programado.</p><div class="help"><b>Modo limpio:</b> la app arranca sin casos resueltos cargados. Para una demo con los 100 casos, pulsa <b>Cargar demo 100 casos</b>. Para alimentar los prompts con aprendizaje previo, pulsa también <b>Cargar histórico demo 100</b>. También puedes usar <b>Importar casos JSON</b> si tienes un JSON externo. Quien no tenga ese JSON verá la aplicación vacía.</div>${rows.map(x=>`<p>${esc(x)}</p>`).join('')}</div>`}
function viewCaso(){return `<div class="card"><h2>Caso ${current}</h2><div class="help">Selecciona el caso, lee el enunciado y completa Base → Propuesto → Prompt IA → Resultados.</div><pre>${esc(currentCaseMeta().enunciado)}</pre></div>`}
function viewBase(){let c=ensureCase();let choices=[c.base.d1,c.base.d2,c.base.d3].filter(Boolean);return `<div class="card"><h2>Método base</h2><div class="grid"><div class="col-12">${field('d1','base.d1','textarea')}</div><div class="col-12">${field('d2','base.d2','textarea')}</div><div class="col-12">${field('d3','base.d3','textarea')}</div><div class="col-12">${field('Decisión base','base.Decision_base','text','edit',choices)}</div>${timeFields('base')}</div></div>${timeSummary('base')}`}
function timeFields(scope){let s=scope==='base'?'base':'prop';let pref=scope==='base'?'base':'prop';return ['lcons','leval','lval','tint'].map(x=>`<div class="col-3">${field(labelTime(x)+' min',`${s}.${x}_${pref}_min`,'number')}</div><div class="col-3">${field(labelTime(x)+' seg',`${s}.${x}_${pref}_seg`,'number')}</div>`).join('')}
function labelTime(x){return {lcons:'Consulta',leval:'Evaluación',lval:'Validación',tint:'Intervención'}[x]}
function timeSummary(scope){let s=scope==='base'?'base':'prop', pref=scope==='base'?'base':'prop';return `<div class="card calc"><h3>Recalcular tiempos</h3><div class="kpi"><div>Consulta<b data-calc="${s}.Lcons_${pref}_min">${fmt(val(`${s}.Lcons_${pref}_min`))}</b></div><div>Evaluación<b data-calc="${s}.Leval_${pref}_min">${fmt(val(`${s}.Leval_${pref}_min`))}</b></div><div>Validación<b data-calc="${s}.Lval_${pref}_min">${fmt(val(`${s}.Lval_${pref}_min`))}</b></div><div>Ldec<b data-calc="${s}.Ldec_${pref}_min">${fmt(val(`${s}.Ldec_${pref}_min`))}</b></div><div>Intervención<b data-calc="${s}.Tint_${pref}_min">${fmt(val(`${s}.Tint_${pref}_min`))}</b></div><div>Ttotal<b data-calc="${s}.Ttotal_${pref}_min">${fmt(val(`${s}.Ttotal_${pref}_min`))}</b></div></div></div>`}
function viewProp(){let sis=val('prop.Sistema');let subt= sis==='HVAC'?opts('HVAC_SUBTIPOS'):sis==='ELECTRICO'?opts('ELECTRICO_SUBTIPOS'):sis==='GASES'?opts('GASES_SUBTIPOS'):sis==='SCADA/BMS'?opts('SCADA_BMS_SUBTIPOS'):[];let ev= sis==='HVAC'?opts('HVAC_EVENTOS'):sis==='ELECTRICO'?opts('ELECTRICO_EVENTOS'):sis==='GASES'?opts('GASES_EVENTOS'):sis==='SCADA/BMS'?opts('SCADA_BMS_EVENTOS'):[];let alt=opts('ALTERNATIVAS_TODAS');return `<div class="card"><h2>Método propuesto / CTI</h2><div class="grid"><div class="col-4">${field('Sistema','prop.Sistema','text','edit',opts('SISTEMAS'))}</div><div class="col-4">${field('Subtipo','prop.Subtipo','text','edit',subt)}</div><div class="col-4">${field('Evento','prop.Evento','text','edit',ev)}</div><div class="col-3">${field('Criticidad','prop.Criticidad','text','edit',opts('CRITICIDADES'))}</div><div class="col-3">${field('QX activo','prop.QX_activo','text','edit',opts('SI_NO'))}</div><div class="col-3">${field('Redundancia','prop.Redundancia','text','edit',opts('REDUNDANCIAS'))}</div><div class="col-3">${field('SA','prop.SA','text','edit',opts('SAS'))}</div><div class="col-12">${field('Normativa','prop.Normativa','text','edit',opts('NORMATIVAS'))}</div>${varsBlock()}<div class="col-3">${field('Histórico similar nº','prop.Historico','number')}</div><div class="col-3">${field('MTTR histórico min','prop.MTTR','number')}</div><div class="col-3">${field('Reincidencia','prop.Reincidencia','text','edit',opts('SI_NO'))}</div><div class="col-12"><h3>Alternativas CTI</h3></div><div class="col-4">${field('d1 CTI','prop.d1_cti','text','edit',alt)}</div><div class="col-4">${field('d2 CTI','prop.d2_cti','text','edit',alt)}</div><div class="col-4">${field('d3 CTI','prop.d3_cti','text','edit',alt)}</div><div class="col-12">${field('Decisión CTI','prop.Decision_CTI','text','edit',[val('prop.d1_cti'),val('prop.d2_cti'),val('prop.d3_cti')].filter(Boolean))}</div>${timeFields('prop')}</div></div>${timeSummary('prop')}<div class="card"><h3>IA y multicriterio</h3><div class="grid"><div class="col-3">${field('Usa prompt IA','ia.Uso_prompt_IA','text','edit',opts('SI_NO'))}</div><div class="col-9">${field('Alternativa sugerida IA','ia.Alternativa_sugerida_IA','text','edit',[val('prop.d1_cti'),val('prop.d2_cti'),val('prop.d3_cti')].filter(Boolean))}</div><div class="col-12">${field('Resumen respuesta IA','ia_summary','textarea')}</div><div class="col-12">${field('Criterios IA: C1,C2,C3,C4 x d1-d3','ia.Criterios_IA','textarea')}</div><div class="col-12">${ahpStatusBlock()}</div></div></div>`}
function varsBlock(){let vopts=opts('Variable');let trends=opts('TENDENCIAS');let h='';for(let i=1;i<=4;i++){h+=`<div class="col-6">${field('Variable '+i,`prop.Var${i}_nombre`,'text','edit',vopts)}</div><div class="col-3">${field('Valor '+i,`prop.Var${i}_valor`)}</div><div class="col-3">${field('Tendencia '+i,`prop.Var${i}_tendencia`,'text','edit',trends)}</div>`}return h}
function viewPrompt(){let p=promptText();return `<div class="card"><h2>Prompt IA</h2><p>El histórico validado local se añade automáticamente. Puedes copiarlo y abrir tu asistente GPT.</p><button class="btn" id="sendIA">🧠 Enviar a IA</button> <button class="btn secondary" id="copyPrompt">Copiar prompt</button> <button class="btn secondary" id="openGPT">Abrir asistente GPT</button><div class="help">Nota: la PWA no puede pegar automáticamente la respuesta desde ChatGPT. Para eso haría falta una integración por API o un pequeño backend.</div><pre>${esc(p)}</pre></div>`}
function viewResultados(){let c=ensureCase();return `<div class="card"><h2>Resultados del caso ${current}</h2><div class="kpi"><div>Ldec base<b>${fmt(c.base.Ldec_base_min)}</b></div><div>Ldec prop<b>${fmt(c.prop.Ldec_prop_min)}</b></div><div>ΔLdec<b>${fmt(c.prop.deltaLdec)}</b></div><div>Mejora Ldec<b>${pct(c.prop.mejoraLdec)}</b></div><div>Ttotal base<b>${fmt(c.base.Ttotal_base_min)}</b></div><div>Ttotal prop<b>${fmt(c.prop.Ttotal_prop_min)}</b></div><div>ΔTtotal<b>${fmt(c.prop.deltaT)}</b></div><div>Mejora T<b>${pct(c.prop.mejoraT)}</b></div></div></div><div class="card"><h3>Decisiones</h3><p><b>Base:</b> ${esc(c.base.Decision_base||'')}</p><p><b>CTI:</b> ${esc(c.prop.Decision_CTI||'')}</p><p><b>Propuesta final:</b> ${esc(c.prop.Decision_prop||'')}</p><p><b>Observaciones:</b> ${esc(c.prop.Observaciones||c.ia_summary||'')}</p></div>`}
function completed(){return Object.entries(session).map(([id,c])=>({id,...c,_m:metricsFor(c)})).filter(x=>x._m.complete)}
function avg(a,f){let v=a.map(f).filter(x=>isFinite(x));return v.length?v.reduce((s,x)=>s+x,0)/v.length:0}
function viewGlobal(){
  let rows=completed();let mrows=rows.map(r=>r._m);
  let k=`<div class="kpi"><div>Casos completos<b>${rows.length}</b></div><div>Ldec base medio<b>${fmt(avg(mrows,r=>num(r.ldec_b)))}</b></div><div>Ldec prop medio<b>${fmt(avg(mrows,r=>num(r.ldec_p)))}</b></div><div>ΔLdec medio<b>${fmt(avg(mrows,r=>num(r.deltaLdec)))}</b></div><div>Mejora Ldec media<b>${pct(avg(mrows,r=>num(r.mejoraLdec)))}</b></div><div>Ttotal base medio<b>${fmt(avg(mrows,r=>num(r.tt_b)))}</b></div><div>Ttotal prop medio<b>${fmt(avg(mrows,r=>num(r.tt_p)))}</b></div><div>ΔTtotal medio<b>${fmt(avg(mrows,r=>num(r.deltaT)))}</b></div><div>Mejora T media<b>${pct(avg(mrows,r=>num(r.mejoraT)))}</b></div></div>`;
  let baseSys=['HVAC','ELECTRICO','GASES','SCADA/BMS'];
  let extra=[...new Set(mrows.map(r=>normSistema(r.sistema)).filter(s=>s&&!baseSys.includes(s)))];
  let sys=[...baseSys,...extra];
  let rowLdec=sys.map(s=>{let rs=mrows.filter(r=>normSistema(r.sistema)==s);return `<tr><td>${esc(s)}</td><td>${rs.length}</td><td>${fmt(avg(rs,r=>num(r.ldec_b)))}</td><td>${fmt(avg(rs,r=>num(r.ldec_p)))}</td><td>${fmt(avg(rs,r=>num(r.deltaLdec)))}</td><td>${pct(avg(rs,r=>num(r.mejoraLdec)))}</td></tr>`}).join('');
  let rowT=sys.map(s=>{let rs=mrows.filter(r=>normSistema(r.sistema)==s);return `<tr><td>${esc(s)}</td><td>${rs.length}</td><td>${fmt(avg(rs,r=>num(r.tt_b)))}</td><td>${fmt(avg(rs,r=>num(r.tt_p)))}</td><td>${fmt(avg(rs,r=>num(r.deltaT)))}</td><td>${pct(avg(rs,r=>num(r.mejoraT)))}</td></tr>`}).join('');
  return `<div class="card"><h2>Resumen de resultados globales</h2>${k}<div class="help">El resumen global muestra siempre los cuatro sistemas principales: HVAC, ELECTRICO, GASES y SCADA/BMS. Si cargas la demo de 100 casos, deben aparecer 25 casos por sistema.</div></div>
  <div class="card tablewrap"><h3>Resumen Ldec por sistema</h3><table class="table"><thead><tr><th>Sistema</th><th>Casos</th><th>Ldec base</th><th>Ldec prop</th><th>ΔLdec</th><th>Mejora Ldec</th></tr></thead><tbody>${rowLdec}</tbody></table></div>
  <div class="card tablewrap"><h3>Resumen Ttotal por sistema</h3><table class="table"><thead><tr><th>Sistema</th><th>Casos</th><th>Ttotal base</th><th>Ttotal prop</th><th>ΔT</th><th>Mejora T</th></tr></thead><tbody>${rowT}</tbody></table></div>`
}
function viewRetro(){applyHistToRetro(false);let sim=similar();let exact=histForCurrent();return `<div class="card"><h2>Retroalimentación / histórico validado</h2><div class="help">${historico.length?`Histórico cargado: <b>${historico.length}</b> registros. ${exact?'Hay registro histórico para este caso y se precarga en los campos azules.':'No hay registro exacto para este caso. El filtro de similitud usa sistema + subtipo + evento.'}`:'Aún no hay histórico cargado.'}</div><div class="grid"><div class="col-6">${field('Alternativa final aplicada','retro.alternativa','text','edit',[val('prop.Decision_prop'),val('prop.Decision_CTI'),val('base.Decision_base')].filter(Boolean))}</div><div class="col-3">${field('Funcionó','retro.resuelto','text','edit',opts('SI_NO'))}</div><div class="col-3">${field('Tiempo real total min','retro.tiempo','number')}</div><div class="col-6">${field('Causa raíz','retro.causa','textarea')}</div><div class="col-6">${field('Solución real aplicada','retro.solucion','textarea')}</div><div class="col-12">${field('Observaciones','retro.obs','textarea')}</div></div><p><button class="btn" id="saveHist">Guardar caso validado</button> <button class="btn secondary" id="loadHistCurrent">Rellenar con histórico de este caso</button> <button class="btn secondary" id="exportHist">Exportar histórico JSON</button></p></div><div class="card"><h3>Casos similares encontrados</h3><p class="muted">Filtro activo: mismo sistema + mismo subtipo + mismo evento.</p>${sim.length?sim.map(h=>`<p><span class="pill">Caso ${esc(hfield(h,'caso'))}</span> ${esc(hfield(h,'sistema'))} / ${esc(hfield(h,'evento'))} — ${esc(hfield(h,'solucion','solucion_real','alternativa','alternativa_final'))} (${esc(hfield(h,'resuelto','funciono'))}) · ${esc(hfield(h,'tiempo','tiempo_real_total_min'))} min<br><span class="muted">Causa: ${esc(hfield(h,'causa','causa_raiz'))}</span></p>`).join(''):'<p class="muted">No hay histórico similar todavía.</p>'}</div>`}


/* V14 SAFE: análisis metodológico A/B/C/D integrado sin modificar render principal */
function tintBaseFor(c){return calcMinObj((c||{}).base||{},'tint_base')}
function tintPropFor(c){return calcMinObj((c||{}).prop||{},'tint_prop')}
function escenarioABCDFor(c){
  c=c||{};
  let t=String(c.analisis_metodologico?.tipo_escenario||'').trim().toUpperCase();
  if(['A','B','C','D'].includes(t)) return t;
  let m=metricsFor(c), ib=tintBaseFor(c), ip=tintPropFor(c);
  let eq=String(c.analisis_metodologico?.equivalencia_decisional||'').toLowerCase().includes('misma') || String(c.decision_equivalente||'').toLowerCase().startsWith('s');
  if(eq) return 'A';
  if(ip<ib && m.tt_p<m.tt_b) return 'B';
  if(ip>ib && m.tt_p<=m.tt_b) return 'C';
  if(m.tt_p>m.tt_b) return 'D';
  return 'Revisar';
}
function descABCD(t){return ({
  A:'Misma decisión conceptual: mejora por menor Ldec; Tint igual.',
  B:'Decisión diferente: menor Tint y menor Ttotal.',
  C:'Decisión diferente: mayor Tint pero Ttotal menor/igual por menor Ldec.',
  D:'Decisión diferente: Ttotal mayor pero decisión más segura/robusta.'
})[t]||'Revisar clasificación';}
function distABCD(){let out={A:0,B:0,C:0,D:0,Revisar:0}; for(const c of Object.values(session||{})){let t=escenarioABCDFor(c); out[t]=(out[t]||0)+1} return out;}
function viewAnalisisABCD(){
  let rows=completed(); let d=distABCD(); let mrows=rows.map(r=>r._m);
  let ldb=avg(mrows,r=>num(r.ldec_b)), ldp=avg(mrows,r=>num(r.ldec_p)), tb=avg(mrows,r=>num(r.tt_b)), tp=avg(mrows,r=>num(r.tt_p));
  let detail=Object.entries(session||{}).sort((a,b)=>num(a[0])-num(b[0])).map(([id,c])=>{let m=metricsFor(c), t=escenarioABCDFor(c); return `<tr><td>${esc(id)}</td><td><b>${esc(t)}</b></td><td>${esc(normSistema(c.prop?.Sistema||''))}</td><td>${esc(c.prop?.Subtipo||'')}</td><td>${esc(c.prop?.Evento||'')}</td><td>${fmt(m.ldec_b)}</td><td>${fmt(m.ldec_p)}</td><td>${fmt(tintBaseFor(c))}</td><td>${fmt(tintPropFor(c))}</td><td>${fmt(m.tt_b)}</td><td>${fmt(m.tt_p)}</td></tr>`}).join('');
  return `<div class="card"><h2>Análisis metodológico A/B/C/D</h2><div class="kpi"><div>A<b>${d.A||0}</b></div><div>B<b>${d.B||0}</b></div><div>C<b>${d.C||0}</b></div><div>D<b>${d.D||0}</b></div></div><div class="help"><b>A:</b> ${descABCD('A')}<br><b>B:</b> ${descABCD('B')}<br><b>C:</b> ${descABCD('C')}<br><b>D:</b> ${descABCD('D')}</div><div class="kpi"><div>Ldec base medio<b>${fmt(ldb)}</b></div><div>Ldec prop medio<b>${fmt(ldp)}</b></div><div>Ttotal base medio<b>${fmt(tb)}</b></div><div>Ttotal prop medio<b>${fmt(tp)}</b></div></div><p class="muted">La clasificación se obtiene desde los datos del caso y la equivalencia conceptual documentada en el JSON, no desde una asignación visual manual.</p></div><div class="card tablewrap"><h3>Detalle por caso</h3><table class="table"><thead><tr><th>Caso</th><th>Tipo</th><th>Sistema</th><th>Subtipo</th><th>Evento</th><th>Ldec base</th><th>Ldec prop</th><th>Tint base</th><th>Tint prop</th><th>Ttotal base</th><th>Ttotal prop</th></tr></thead><tbody>${detail}</tbody></table></div>`;
}

async function copyText(text){try{await navigator.clipboard.writeText(text);return true}catch(e){try{let ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.left='-9999px';document.body.appendChild(ta);ta.focus();ta.select();let ok=document.execCommand('copy');ta.remove();return ok}catch(_e){return false}}}
function bindSpecial(){bindAHP();let b=$('copyPrompt'); if(b)b.onclick=async()=>{await copyText(promptText());status('Prompt copiado')}; let og=$('openGPT'); if(og)og.onclick=()=>window.open(GPT_URL,'_blank'); let cog=$('copyOpenGPT'); if(cog)cog.onclick=async()=>{await copyText(promptText());window.open(GPT_URL,'_blank')}; let sia=$('sendIA'); if(sia)sia.onclick=async()=>{let ok=await copyText(promptText());status(ok?'Prompt copiado; abriendo GPT':'Abriendo GPT; copia manual si el navegador bloqueó el portapapeles'); window.open(GPT_URL,'_blank')}; let h=$('saveHist'); if(h)h.onclick=saveHist; let lh=$('loadHistCurrent'); if(lh)lh.onclick=()=>{if(applyHistToRetro(true)){saveAll();render();status('Histórico aplicado al caso')}else alert('No hay histórico exacto para este caso.')}; let eh=$('exportHist'); if(eh)eh.onclick=exportHist}
function saveHist(){let c=ensureCase();let r=c.retro||{};historico.push({fecha:new Date().toISOString(),caso:current,sistema:c.prop.Sistema||'',subtipo:c.prop.Subtipo||'',evento:c.prop.Evento||'',criticidad:c.prop.Criticidad||'',sa:c.prop.SA||'',alternativa:r.alternativa||'',alternativa_final:r.alternativa||'',resuelto:r.resuelto||'',funciono:r.resuelto||'',tiempo:r.tiempo||'',tiempo_real_total_min:r.tiempo||'',causa:r.causa||'',causa_raiz:r.causa||'',solucion:r.solucion||'',solucion_real:r.solucion||'',obs:r.obs||'',observaciones:r.obs||''}); c.retro={}; saveAll(); render(); status('Histórico guardado')}
function exportSession(){saveAll();download('cti_ia_dss_sesion_pwa.json',JSON.stringify(session,null,2))}
function exportHist(){download('cti_ia_dss_historico.json',JSON.stringify(historico,null,2))}
function download(name,text){let a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'application/json'}));a.download=name;a.click();URL.revokeObjectURL(a.href)}
async function loadDemo(){
  if(!confirm('¿Cargar la demo con los 100 casos resueltos? Esto sustituirá la sesión actual de este navegador.')) return;
  try{
    let res=await fetch('./CTI_IA_DSS_100_CASOS_RESUELTOS.json',{cache:'no-store'});
    if(!res.ok) throw new Error('No se pudo leer el JSON de demo');
    let obj=await res.json();
    session=obj.session||obj.casos||obj;
    if(!session||typeof session!=='object'||Array.isArray(session)) throw new Error('Formato no reconocido');
    localStorage.setItem(STORE,JSON.stringify(session));
    // Carga también el histórico validado de ejemplo si está disponible.
    try{
      let rh=await fetch('./CTI_IA_DSS_100_HISTORICO_VALIDADO.json',{cache:'no-store'});
      if(rh.ok){
        let hobj=await rh.json();
        historico=Array.isArray(hobj)?hobj:(hobj.historico||[]);
        localStorage.setItem(HIST,JSON.stringify(historico));
      }
    }catch(_e){}
    current='1'; $('caseSelect').value=current; tab='Resultados globales';
    applyHistToRetro(true);
    render(); status('Demo de 100 casos e histórico cargados');
  }catch(e){
    alert('No se pudo cargar la demo automáticamente. Usa “Importar casos JSON” y selecciona CTI_IA_DSS_100_CASOS_RESUELTOS.json.');
  }
}

async function loadDemoHistorico(){
  if(!confirm('¿Cargar el histórico validado de ejemplo con 100 casos? Esto sustituirá el histórico local de este navegador.')) return;
  try{
    let res=await fetch('./CTI_IA_DSS_100_HISTORICO_VALIDADO.json',{cache:'no-store'});
    if(!res.ok) throw new Error('No se pudo leer el histórico de demo');
    let obj=await res.json();
    historico=Array.isArray(obj)?obj:(obj.historico||[]);
    if(!Array.isArray(historico)) throw new Error('Formato no reconocido');
    localStorage.setItem(HIST,JSON.stringify(historico));
    applyHistToRetro(true);
    tab='Retroalimentación';
    render(); status('Histórico demo cargado: '+historico.length+' registros');
  }catch(e){
    alert('No se pudo cargar el histórico demo. Revisa que exista CTI_IA_DSS_100_HISTORICO_VALIDADO.json en GitHub.');
  }
}

function importSession(e){let f=e.target.files[0];if(!f)return;let r=new FileReader();r.onload=()=>{try{let obj=JSON.parse(r.result);session=obj.session||obj.casos||obj; if(!session||typeof session!=='object'||Array.isArray(session))throw new Error('Formato no reconocido'); saveAll();render();status('Sesión importada')}catch{alert('JSON no válido o no es una sesión CTI IA DSS')}};r.readAsText(f); e.target.value=''}
function resetSession(){if(confirm('¿Vaciar la sesión local? Se eliminarán los datos introducidos en este navegador.')){session={};localStorage.removeItem(STORE);current='1';$('caseSelect').value=current;render();status('Sesión vacía')}}
if('serviceWorker' in navigator){navigator.serviceWorker.register('./service-worker.js').catch(()=>{})}
init();
