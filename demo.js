/* Demo statica: nessuna API, autenticazione o comunicazione PLC. */
'use strict';
(() => {
 const STORAGE='demo-web-hmi-cliente-v3', LOGKEY='demo-web-hmi-attivita-v2', DAYS=['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'];
 const names=['Presenza aria','Accensione pompa acqua 1','Temperatura acqua St. A1','Illuminazione reparto A','Ventilazione stabilimento','Pompa ricircolo','Illuminazione esterna','Estrattore zona B','Compressore ausiliario','Riscaldamento uffici','Ventilatore quadro','Pompa acqua 2','Luci magazzino','Impianto trattamento','Luci ingresso','Aspirazione zona 1'];
 const $=sel=>document.querySelector(sel);
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const clone=o=>JSON.parse(JSON.stringify(o));
 function seed(){
  return Array.from({length:32},(_,i)=>{
   const config=Array.from({length:7},(_,d)=>Array.from({length:10},(_,n)=>n===0&&d>=1&&d<=5&&i%5!==0?({start:['00:00','06:00','08:00','14:00','18:00'][i%5],end:['24:00','14:00','17:30','22:00','24:00'][i%5]}):n===0&&d===6&&i%4===0?{start:'08:00',end:'12:00'}:{start:'',end:''}));
   return {id:i,name:names[i]||'Utenza '+String(i+1).padStart(2,'0'),type:'Standard',enabled:i%6!==0,level:0,config};
  });
 }
 let data;
 try{const stored=JSON.parse(localStorage.getItem(STORAGE));data=Array.isArray(stored)&&stored.length===32?stored:seed()}catch{data=seed()}
 let events=[];
 try{const x=JSON.parse(localStorage.getItem(LOGKEY));events=Array.isArray(x)?x.slice(0,100):[]}catch{}
 const eventTime=t=>new Date(t).toLocaleString('it-IT',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'});
 function logEvent(action,detail){
  events.unshift({time:new Date().toISOString(),action,detail});events=events.slice(0,100);
  try{localStorage.setItem(LOGKEY,JSON.stringify(events))}catch{}
 }
 function upcoming(limit=8){
  const now=new Date(),nowMinute=now.getHours()*60+now.getMinutes(),d=now.getDay(),out=[];
  data.forEach(u=>{
   if(!u.enabled)return;
   u.config[d].forEach((slot,i)=>{
    if(!slot.start||!slot.end)return;
    const start=minutes(slot.start),end=minutes(slot.end);
    if(start>nowMinute)out.push({u,day:d,slot:i+1,start,minutesLeft:start-nowMinute,end});
   });
  });
  return out.sort((a,b)=>a.start-b.start||a.u.id-b.u.id).slice(0,limit);
 }
 const timeLabel=m=>`${n2(Math.floor(m/60))}:${n2(m%60)}`;
 let page='dashboard',selected=1,day=1,draft=null,expanded=false,search='',toastTimer=null;
 const save=()=>{try{localStorage.setItem(STORAGE,JSON.stringify(data));return true}catch{return false}};
 const n2=n=>String(n).padStart(2,'0');
 const today=()=>new Date().toLocaleString('it-IT',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
 const isValidTime=t=>/^([01]\d|2[0-3]):[0-5]\d$/.test(t)||t==='24:00';
 const minutes=t=>{const [h,m]=t.split(':').map(Number);return h*60+m};
 const slots=u=>u.config.reduce((n,d)=>n+d.filter(s=>s.start&&s.end).length,0);
 function active(u){
  if(!u.enabled)return false;
  const now=new Date(),d=now.getDay(),m=now.getHours()*60+now.getMinutes();
  return u.config[d].some(s=>s.start&&s.end&&minutes(s.start)<=m&&m<minutes(s.end));
 }
 const dirty=()=>draft&&JSON.stringify(draft)!==JSON.stringify(data[selected]);
 function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),3500)}
 function navigate(next){
  if(page==='schedule'&&dirty()&&!confirm('Hai modifiche non confermate nella demo. Vuoi abbandonarle?'))return;
  page=next;draft=null;logEvent('Pagina aperta',({dashboard:'Panoramica',schedule:'Programmazione',consumers:'Elenco utenze',activity:'Registro attività',about:'Guida rapida'})[next]||next);render();window.scrollTo(0,0);
 }
 function changeSelected(i){if(dirty()&&!confirm('Abbandonare la bozza non salvata?'))return;selected=i;draft=null;render()}
 function top(title,subtitle,right=''){return `<div class="section-head"><div><p class="eyebrow">CONTROLLO IMPIANTO · ANTEPRIMA</p><h1>${title}</h1><p class="lead" style="margin:0">${subtitle}</p></div>${right}</div>`}
 function selector(){return `<label class="select">Utenza selezionata<select id="selected">${data.map(u=>`<option value="${u.id}" ${u.id===selected?'selected':''}>${n2(u.id)} · ${esc(u.name)}</option>`).join('')}</select></label>`}
 function dashboard(){
  const now=new Date(),dayNow=now.getDay(),nowM=now.getHours()*60+now.getMinutes();
  const on=data.filter(active),disabled=data.filter(u=>!u.enabled);
  const coming=[];
  data.forEach(u=>{if(!u.enabled)return;for(let offset=0;offset<2;offset++){
   const d=(dayNow+offset)%7;
   u.config[d].forEach((slot,i)=>{if(!slot.start||!slot.end)return;
    const start=minutes(slot.start),delta=offset*1440+start-nowM;
    if(delta>0&&delta<=1440)coming.push({u,offset,start,delta,slot:i+1,end:slot.end});
   });
  }});
  coming.sort((a,b)=>a.delta-b.delta||a.u.id-b.u.id);
  const next=coming.slice(0,10);
  const nextTime=x=>`${x.offset?'Domani · ':'Oggi · '}${timeLabel(x.start)}`;
  const remaining=x=>x.delta<60?`${x.delta} min`:`${Math.floor(x.delta/60)} h ${n2(x.delta%60)} min`;
  return top('Panoramica operativa','Stabilimento A · Stato delle programmazioni all’orario corrente della macchina.')+
  `<div class="priority-strip"><span class="priority-dot"></span><div><strong>${on.length} utenze in funzione adesso</strong><span>Stato calcolato dalle fasce e dall’abilitazione · Simulazione, non lettura delle uscite PLC</span></div><span class="live-time">${esc(now.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'}))}</span></div>
  <section class="panel primary-panel"><div class="section-head"><div><h2>In funzione ora</h2><span class="muted">Elenco prioritario delle utenze azionate secondo il programma</span></div><button class="btn small" id="refreshDashboard">Aggiorna ora</button></div>
  ${on.length?`<div class="table-wrap"><table><thead><tr><th>UTENZA</th><th>STATO</th><th>FASCIA IN CORSO</th><th>TERMINE PREVISTO</th><th></th></tr></thead><tbody>${on.map(u=>{
   const slot=u.config[dayNow].find(v=>v.start&&v.end&&minutes(v.start)<=nowM&&nowM<minutes(v.end));
   return `<tr><td><strong>${esc(u.name)}</strong><div class="muted">Utenza ${n2(u.id)}</div></td><td><span class="status on">In funzione</span></td><td>${slot?esc(slot.start)+' – '+esc(slot.end):'—'}</td><td>${slot?esc(slot.end):'—'}</td><td><button class="btn small edit-one" data-id="${u.id}">Dettagli</button></td></tr>`}).join('')}</tbody></table></div>`:'<div class="empty">Nessuna utenza in funzione in questo momento. Consulta le prossime attivazioni qui sotto.</div>'}</section>
  <div class="two-col">
   <section class="panel"><div class="section-head"><div><h2>Prossime accensioni</h2><span class="muted">Fasce in arrivo nelle prossime 24 ore · ${coming.length} eventi</span></div></div>
    ${next.length?`<div class="table-wrap"><table><thead><tr><th>ORA PREVISTA</th><th>UTENZA</th><th>TRA</th><th></th></tr></thead><tbody>${next.map(x=>`<tr><td><strong>${nextTime(x)}</strong></td><td>${esc(x.u.name)}<div class="muted">Fascia ${n2(x.slot)} · fine ${esc(x.end)}</div></td><td>${remaining(x)}</td><td><button class="btn small edit-one" data-id="${x.u.id}">Apri</button></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">Nessuna accensione prevista nelle prossime 24 ore.</div>'}
   </section>
   <section class="panel"><div class="section-head"><div><h2>Utenze disabilitate</h2><span class="muted">${disabled.length} utenze escluse dalla programmazione</span></div><button class="btn small" id="allConsumers">Elenco completo</button></div>
    ${disabled.length?`<div class="disabled-list">${disabled.map(u=>`<div class="disabled-row"><div><strong>${esc(u.name)}</strong><span>ID ${n2(u.id)} · Disabilitata</span></div><button class="btn small edit-one" data-id="${u.id}">Apri</button></div>`).join('')}</div>`:'<div class="empty">Nessuna utenza disabilitata.</div>'}
   </section>
  </div>
  <section class="panel"><div class="section-head"><div><h2>Ultime attività degli operatori</h2><span class="muted">Navigazione, aperture e modifiche effettuate in questa demo</span></div><button class="btn small" id="openActivity">Apri registro completo</button></div>
   ${events.length?`<div class="activity-list">${events.slice(0,6).map(e=>`<div class="activity-item"><span class="activity-icon">◷</span><div><strong>${esc(e.action)}</strong><div class="muted">${esc(e.detail)}</div></div><time>${esc(eventTime(e.time))}</time></div>`).join('')}</div>`:'<div class="empty">Non ci sono ancora attività registrate.</div>'}
  </section>
  <div class="tip">Questa demo non è connessa al PLC. Le utenze sono considerate attive solo se abilitate e comprese in una fascia valida secondo l’orario del browser. Il registro è locale e non identifica utenti reali.</div>`;
 }
 function activity(){
  return top('Registro attività','Cronologia delle modifiche e delle azioni effettuate in questa demo, su questo browser.')+
  `<section class="panel"><div class="section-head"><div><h2>Operazioni registrate</h2><span class="muted">Ultimi ${events.length} eventi · Memorizzazione locale</span></div><button class="btn small" id="clearLog" ${events.length?'':'disabled'}>Svuota registro</button></div>
  ${events.length?`<div class="table-wrap"><table><thead><tr><th>DATA E ORA</th><th>OPERAZIONE</th><th>DETTAGLIO</th></tr></thead><tbody>${events.map(e=>`<tr><td>${esc(eventTime(e.time))}</td><td><strong>${esc(e.action)}</strong></td><td>${esc(e.detail)}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">Non sono ancora state registrate operazioni.</div>'}</section>
  <div class="tip">Registro dimostrativo: non identifica utenti, non è condiviso fra dispositivi e può essere cancellato. Nel sistema reale l’audit dovrà essere gestito dal PLC o da un servizio centralizzato.</div>`;
 }
 function schedule(){
  const u=draft||data[selected],changed=dirty();
  return top('Programmazione utenze','Modifica gli orari e prova il flusso di conferma, senza collegamento al PLC.',selector())+
  `<section class="panel"><div class="edit-head"><div><h2>Configurazione provvisoria</h2><span class="muted">Le modifiche restano una bozza finché non premi Conferma nella demo.</span></div><span class="pill ${changed?'changed':''}">${changed?'Modifiche da confermare':'Nessuna modifica'}</span></div>
  <div class="notice">✓ Modalità dimostrativa: il salvataggio aggiorna solo i dati locali del browser, non il PLC.</div>
  <div class="form-grid"><label class="field">Descrizione<input id="name" maxlength="100" value="${esc(u.name)}"></label>
  <label class="field">Tipo utenza<select id="type">${['Standard','Impulsiva','Durata'].map(x=>`<option ${x===u.type?'selected':''}>${x}</option>`).join('')}</select></label>
  <label class="field">Abilitazione<select id="enabled"><option value="1" ${u.enabled?'selected':''}>Abilitata</option><option value="0" ${!u.enabled?'selected':''}>Disabilitata</option></select></label></div>
  <div class="tabs" role="tablist" aria-label="Giorni della settimana">${DAYS.map((d,i)=>`<button class="tab ${i===day?'active':''}" data-day="${i}" role="tab" aria-selected="${i===day}">${d.slice(0,3)}</button>`).join('')}</div>
  <div class="edit-head"><div><h3>${DAYS[day]}</h3><span class="muted">Fasce orarie della giornata selezionata</span></div><div class="actions"><button class="btn small" id="copyDay">Copia su lun–ven</button><button class="btn small" id="clearDay">Svuota giorno</button></div></div>
  <div class="slot-row slot-header"><div>FASCIA</div><div>INIZIO</div><div>FINE</div><div>STATO</div></div>
  ${u.config[day].slice(0,expanded?10:4).map((s,i)=>`<div class="slot-row"><span class="slot-label">${n2(i+1)}</span><input type="time" data-slot="${i}" data-field="start" value="${esc(s.start)}" aria-label="Inizio fascia ${i+1}"><input type="time" data-slot="${i}" data-field="end" value="${esc(s.end)}" aria-label="Fine fascia ${i+1}"><span class="muted">${s.start&&s.end?'Programmato':'Libero'}</span></div>`).join('')}
  <div style="margin-top:14px"><button class="btn small" id="expand">${expanded?'Mostra meno fasce':'Mostra tutte le 10 fasce'}</button></div>
  <div class="edit-footer"><span class="muted">Le modifiche vengono simulate e possono essere annullate.</span><div class="actions"><button class="btn secondary" id="discard" ${changed?'':'disabled'}>Annulla bozza</button><button class="btn primary" id="commit" ${changed?'':'disabled'}>Verifica e conferma</button></div></div>
  </section>`;
 }
 function consumers(){
  const filtered=data.filter(u=>`${u.name} ${u.id}`.toLowerCase().includes(search.toLowerCase()));
  return top('Elenco utenze','Consulta le utenze disponibili e apri direttamente la programmazione.')+
  `<section class="panel"><div class="section-head"><div><h2>Utenze impianto</h2><span class="muted">32 utenze dimostrative</span></div><input class="search" id="search" placeholder="Cerca un'utenza..." value="${esc(search)}"></div>
  <div class="table-wrap"><table><thead><tr><th>ID</th><th>Descrizione</th><th>Abilitazione</th><th>Stato simulato</th><th>Fasce</th><th></th></tr></thead><tbody>${filtered.map(u=>`<tr><td>${n2(u.id)}</td><td><strong>${esc(u.name)}</strong></td><td>${u.enabled?'Abilitata':'Disabilitata'}</td><td><span class="status ${active(u)?'on':'off'}">${active(u)?'Attiva':'Non attiva'}</span></td><td>${slots(u)}</td><td><button class="btn small edit-one" data-id="${u.id}">Programma</button></td></tr>`).join('')}</tbody></table>${!filtered.length?'<div class="empty">Nessuna utenza trovata.</div>':''}</div></section>`;
 }
 function about(){
  return top('Guida rapida','Le funzioni principali per l’operatore dello Stabilimento A.')+
  `<div class="feature-grid"><div class="feature"><strong>01 · Situazione attuale</strong><p>La dashboard mostra prima le utenze che risultano attive secondo l’orario corrente, poi le prossime attivazioni e le utenze disabilitate.</p></div>
  <div class="feature"><strong>02 · Programmazione</strong><p>Seleziona un’utenza, scegli il giorno e imposta inizio e fine delle fasce. Puoi copiare un giorno sui giorni lavorativi.</p></div>
  <div class="feature"><strong>03 · Conferma</strong><p>Le modifiche restano in bozza finché non premi Verifica e conferma. Puoi annullare prima del salvataggio.</p></div></div>
  <section class="panel" style="margin-top:20px"><h2>Domande frequenti</h2>
  <h3>Le utenze si accendono realmente?</h3><p class="muted">No. In questa demo lo stato è calcolato dalle fasce orarie usando l’orologio del browser. Nessun PLC è collegato.</p>
  <h3>Quando un’utenza compare tra le prossime attivazioni?</h3><p class="muted">Quando è abilitata e ha una fascia che inizierà più tardi nella giornata corrente.</p>
  <h3>Cosa succede se confermo una modifica?</h3><p class="muted">Viene aggiornata la configurazione salvata localmente nel browser. La modifica compare nel registro attività della demo.</p>
  <h3>Il registro mostra le attività di tutti gli operatori?</h3><p class="muted">No, solo le operazioni registrate su questo browser. Nella versione reale è previsto un audit centralizzato.</p>
  <div class="actions" style="margin-top:22px"><button class="btn primary" id="tryDemo">Prova la programmazione</button><button class="btn danger" id="reset">Ripristina dati dimostrativi</button></div></section>`;
 }
 function render(){
  const titles={dashboard:'Panoramica',schedule:'Programmazione',consumers:'Elenco utenze',about:'Guida rapida',activity:'Registro attività'};
  $('#breadcrumb').textContent=titles[page];document.querySelectorAll('.nav').forEach(b=>b.classList.toggle('active',b.dataset.page===page));
  $('#view').innerHTML=({dashboard, schedule, consumers, about, activity})[page]();
  if(page==='schedule')bindSchedule();
  $('#selected')?.addEventListener('change',e=>changeSelected(Number(e.target.value)));
  document.querySelectorAll('.edit-one').forEach(b=>b.addEventListener('click',()=>{selected=Number(b.dataset.id);draft=null;page='schedule';logEvent('Apertura utenza',`Utenza ${n2(selected)} · ${data[selected].name}`);render()}));
  $('#openSchedule')?.addEventListener('click',()=>navigate('schedule'));
  $('#openActivity')?.addEventListener('click',()=>navigate('activity'));
  $('#refreshDashboard')?.addEventListener('click',render);
  $('#clearLog')?.addEventListener('click',()=>{if(confirm('Cancellare il registro attività locale?')){events=[];try{localStorage.removeItem(LOGKEY)}catch{}render();toast('Registro demo svuotato')}});
  $('#allConsumers')?.addEventListener('click',()=>navigate('consumers'));
  $('#tryDemo')?.addEventListener('click',()=>navigate('schedule'));
  $('#reset')?.addEventListener('click',()=>{if(confirm('Ripristinare tutti i dati dimostrativi?')){data=seed();save();draft=null;logEvent('Ripristino demo','Configurazioni riportate ai valori dimostrativi iniziali');toast('Dati demo ripristinati');render()}});
  $('#search')?.addEventListener('input',e=>{search=e.target.value;const pos=e.target.selectionStart;render();const el=$('#search');el.focus();el.setSelectionRange(pos,pos)});
 }
 function edit(){if(!draft)draft=clone(data[selected]);return draft}
 function bindSchedule(){
  $('#name').addEventListener('input',e=>{edit().name=e.target.value;updateDirty()});
  $('#type').addEventListener('change',e=>{edit().type=e.target.value;updateDirty()});
  $('#enabled').addEventListener('change',e=>{edit().enabled=e.target.value==='1';updateDirty()});
  document.querySelectorAll('[data-day]').forEach(b=>b.addEventListener('click',()=>{day=Number(b.dataset.day);render()}));
  document.querySelectorAll('[data-slot]').forEach(input=>input.addEventListener('change',e=>{
   const {slot,field}=e.target.dataset;edit().config[day][Number(slot)][field]=e.target.value;render();
  }));
  $('#expand').addEventListener('click',()=>{expanded=!expanded;render()});
  $('#copyDay').addEventListener('click',()=>{
   const u=edit();const src=clone(u.config[day]);for(let d=1;d<=5;d++)u.config[d]=clone(src);
   toast('Programmazione copiata su lunedì–venerdì nella bozza');render()
  });
  $('#clearDay').addEventListener('click',()=>{edit().config[day]=Array.from({length:10},()=>({start:'',end:''}));render()});
  $('#discard').addEventListener('click',()=>{draft=null;toast('Bozza annullata');render()});
  $('#commit').addEventListener('click',async()=>{
   const u=draft;if(!u)return;
   if(!u.name.trim()){toast('Inserisci una descrizione valida');return}
   for(let d=0;d<7;d++)for(let n=0;n<10;n++){
    const s=u.config[d][n];
    if(Boolean(s.start)!==Boolean(s.end)){toast(`Completa inizio e fine: ${DAYS[d]}, fascia ${n+1}`);return}
    if(s.start&&(!isValidTime(s.start)||!isValidTime(s.end)||minutes(s.start)>=minutes(s.end))){toast(`Orario non valido: ${DAYS[d]}, fascia ${n+1}`);return}
   }
   const dialog=$('#confirmDialog');dialog.showModal();
   const result=await new Promise(resolve=>dialog.addEventListener('close',()=>resolve(dialog.returnValue),{once:true}));
   if(result!=='confirm')return;
   const before=data[selected],diff=[];
   for(const k of ['name','type','enabled','level'])if(JSON.stringify(before[k])!==JSON.stringify(u[k]))diff.push(k==='name'?'descrizione':k==='enabled'?'abilitazione':k==='type'?'tipo':'livello');
   let modifiedSlots=0;for(let d=0;d<7;d++)for(let i=0;i<10;i++)if(JSON.stringify(before.config[d][i])!==JSON.stringify(u.config[d][i]))modifiedSlots++;
   if(modifiedSlots)diff.push(modifiedSlots+' fasce modificate');
   data[selected]=clone(u);draft=null;const stored=save();
   logEvent('Configurazione confermata',`Utenza ${n2(selected)} · ${u.name} · ${diff.join(', ')||'nessuna differenza'}`);
   render();toast(stored?'Modifica salvata nella demo. Nessun PLC coinvolto.':'Modifica applicata alla sessione; salvataggio locale non disponibile.');
  });
 }
 function updateDirty(){const el=$('.pill');if(el){el.textContent=dirty()?'Modifiche da confermare':'Nessuna modifica';el.classList.toggle('changed',dirty())}$('#commit').disabled=!dirty();$('#discard').disabled=!dirty()}
 document.querySelectorAll('.nav').forEach(b=>b.addEventListener('click',()=>{navigate(b.dataset.page);$('#sidebar').classList.remove('open')}));
 $('#menuBtn').addEventListener('click',()=>$('#sidebar').classList.toggle('open'));
 function clock(){const el=$('#clock');if(el)el.textContent=today()}
 clock();setInterval(clock,30000);render();setInterval(()=>{if(page==='dashboard'&&!draft)render()},30000);
})();
