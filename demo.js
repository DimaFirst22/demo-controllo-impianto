/* Demo statica: nessuna API, autenticazione o comunicazione PLC. */
'use strict';
(() => {
 const STORAGE='demo-web-hmi-cliente-v1', DAYS=['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'];
 const names=['Presenza aria','Accensione pompa acqua 1','Temperatura acqua St. A1','Illuminazione reparto A','Ventilazione stabilimento','Pompa ricircolo','Illuminazione esterna','Estrattore zona B','Compressore ausiliario','Riscaldamento uffici','Ventilatore quadro','Pompa acqua 2','Luci magazzino','Impianto trattamento','Luci ingresso','Aspirazione zona 1'];
 const $=sel=>document.querySelector(sel);
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const clone=o=>JSON.parse(JSON.stringify(o));
 function seed(){
  return Array.from({length:32},(_,i)=>{
   const config=Array.from({length:7},(_,d)=>Array.from({length:10},(_,n)=>n===0&&d>=1&&d<=5&&i%5!==0?{start:'08:00',end:'17:30'}:n===0&&d===6&&i%4===0?{start:'08:00',end:'12:00'}:{start:'',end:''}));
   return {id:i,name:names[i]||'Utenza '+String(i+1).padStart(2,'0'),type:'Standard',enabled:i%6!==0,level:0,config};
  });
 }
 let data;
 try{const stored=JSON.parse(localStorage.getItem(STORAGE));data=Array.isArray(stored)&&stored.length===32?stored:seed()}catch{data=seed()}
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
  page=next;draft=null;render();window.scrollTo(0,0);
 }
 function changeSelected(i){if(dirty()&&!confirm('Abbandonare la bozza non salvata?'))return;selected=i;draft=null;render()}
 function top(title,subtitle,right=''){return `<div class="section-head"><div><p class="eyebrow">CONTROLLO IMPIANTO · ANTEPRIMA</p><h1>${title}</h1><p class="lead" style="margin:0">${subtitle}</p></div>${right}</div>`}
 function selector(){return `<label class="select">Utenza selezionata<select id="selected">${data.map(u=>`<option value="${u.id}" ${u.id===selected?'selected':''}>${n2(u.id)} · ${esc(u.name)}</option>`).join('')}</select></label>`}
 function dashboard(){
  const on=data.filter(active).length,enabled=data.filter(u=>u.enabled).length,scheduled=data.filter(u=>slots(u)>0).length;
  const latest=data.slice(0,6);
  return top('Panoramica impianto','Una vista immediata dello stato delle utenze e delle programmazioni.')+
  `<div class="cards">
   <div class="card"><div class="metric-label">Utenze configurate</div><div class="metric">32</div><div class="metric-foot">Disponibili nella demo</div></div>
   <div class="card"><div class="metric-label">Utenze abilitate</div><div class="metric">${enabled}</div><div class="metric-foot">Abilitazione simulata</div></div>
   <div class="card"><div class="metric-label">Attive adesso</div><div class="metric">${on}</div><div class="metric-foot">Calcolato dall'orario del browser</div></div>
   <div class="card"><div class="metric-label">Con programmazione</div><div class="metric">${scheduled}</div><div class="metric-foot">Almeno una fascia oraria</div></div>
  </div>
  <div class="two-col"><section class="panel"><div class="section-head"><div><h2>Stato utenze</h2><span class="muted">Esempio di monitoraggio operativo</span></div><button class="btn small" id="allConsumers">Vedi tutte</button></div>
  <div class="table-wrap"><table><thead><tr><th>Utenza</th><th>Stato</th><th>Fasce</th><th></th></tr></thead><tbody>${latest.map(u=>`<tr><td><strong>${esc(u.name)}</strong><div class="muted">ID ${n2(u.id)}</div></td><td><span class="status ${active(u)?'on':'off'}">${active(u)?'Attiva':'Non attiva'}</span></td><td>${slots(u)}</td><td><button class="btn small edit-one" data-id="${u.id}">Apri</button></td></tr>`).join('')}</tbody></table></div></section>
  <section class="panel"><h2>Riepilogo configurazione</h2><p class="muted">Le programmazioni sono distribuite su 7 giorni, con fino a 10 fasce per giornata.</p>
  <div class="bar-row"><div class="bar-head"><span>Utenze abilitate</span><b>${enabled}/32</b></div><div class="bar-track"><div class="bar-fill" style="width:${enabled/32*100}%"></div></div></div>
  <div class="bar-row"><div class="bar-head"><span>Utenze programmate</span><b>${scheduled}/32</b></div><div class="bar-track"><div class="bar-fill" style="width:${scheduled/32*100}%"></div></div></div>
  <div class="tip">Questa anteprima mostra il possibile aspetto del sistema definitivo. Stati e valori sono simulati: non rappresentano le uscite fisiche del PLC.</div>
  <div style="margin-top:18px"><button class="btn primary" id="openSchedule">Esplora programmazione</button></div></section></div>`;
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
  return top('Come funziona la demo','Una presentazione essenziale dell’esperienza prevista per gli operatori.')+
  `<div class="feature-grid"><div class="feature"><strong>01 · Panoramica</strong><p>Una dashboard semplice per capire a colpo d'occhio quali utenze sono abilitate e quali risultano attive.</p></div>
  <div class="feature"><strong>02 · Programmazione</strong><p>Selezione utenza, configurazione delle fasce per ogni giorno e modifica dei parametri essenziali.</p></div>
  <div class="feature"><strong>03 · Conferma controllata</strong><p>Le modifiche vengono preparate come bozza. L'operatore può annullarle oppure confermarle esplicitamente.</p></div></div>
  <section class="panel" style="margin-top:20px"><h2>Cosa è simulato</h2><ul class="help-list"><li>Stati delle utenze e ora: simulati sulla base dell'orario del dispositivo.</li><li>Salvataggio: locale al browser, senza comunicazioni con PLC o server.</li><li>Accesso: nessuna credenziale necessaria in questa demo.</li><li>Controlli avanzati, audit, allarmi, blocchi concorrenti e gestione utenti: esclusi per rendere chiara la proposta grafica.</li></ul>
  <div class="tip"><strong>Versione definitiva:</strong> l'interfaccia potrà essere collegata alle Web API Siemens e alle logiche di autorizzazione e conferma del PLC. Questa demo non implementa tali collegamenti.</div>
  <div class="actions" style="margin-top:20px"><button class="btn primary" id="tryDemo">Prova la programmazione</button><button class="btn danger" id="reset">Ripristina dati dimostrativi</button></div></section>`;
 }
 function render(){
  const titles={dashboard:'Panoramica',schedule:'Programmazione',consumers:'Elenco utenze',about:'Come funziona'};
  $('#breadcrumb').textContent=titles[page];document.querySelectorAll('.nav').forEach(b=>b.classList.toggle('active',b.dataset.page===page));
  $('#view').innerHTML=({dashboard, schedule, consumers, about})[page]();
  if(page==='schedule')bindSchedule();
  $('#selected')?.addEventListener('change',e=>changeSelected(Number(e.target.value)));
  document.querySelectorAll('.edit-one').forEach(b=>b.addEventListener('click',()=>{selected=Number(b.dataset.id);draft=null;page='schedule';render()}));
  $('#openSchedule')?.addEventListener('click',()=>navigate('schedule'));
  $('#allConsumers')?.addEventListener('click',()=>navigate('consumers'));
  $('#tryDemo')?.addEventListener('click',()=>navigate('schedule'));
  $('#reset')?.addEventListener('click',()=>{if(confirm('Ripristinare tutti i dati dimostrativi?')){data=seed();save();draft=null;toast('Dati demo ripristinati');render()}});
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
   data[selected]=clone(u);draft=null;const stored=save();render();toast(stored?'Modifica salvata nella demo. Nessun PLC coinvolto.':'Modifica applicata alla sessione; salvataggio locale non disponibile.');
  });
 }
 function updateDirty(){const el=$('.pill');if(el){el.textContent=dirty()?'Modifiche da confermare':'Nessuna modifica';el.classList.toggle('changed',dirty())}$('#commit').disabled=!dirty();$('#discard').disabled=!dirty()}
 document.querySelectorAll('.nav').forEach(b=>b.addEventListener('click',()=>{navigate(b.dataset.page);$('#sidebar').classList.remove('open')}));
 $('#menuBtn').addEventListener('click',()=>$('#sidebar').classList.toggle('open'));
 function clock(){const el=$('#clock');if(el)el.textContent=today()}
 clock();setInterval(clock,30000);render();
})();
