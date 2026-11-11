// ============================================================
// SHEETS / MODALS
// ============================================================
function openSheet(id){document.getElementById(id).classList.add('on');}
function closeSheet(id){document.getElementById(id).classList.remove('on');}
function openAddProp(){openSheet('ov-addprop');}
function openAddTenant(){openSheet('ov-addtenant');}
function openSignSheet(name,prop){
  document.getElementById('sign-title').textContent='Signer le contrat';
  document.getElementById('sign-sub').textContent=name+' — '+prop;
  openSheet('ov-sign');
}
function openRenewSheet(name,prop){
  document.getElementById('renew-sub').textContent=name+' — '+prop;
  openSheet('ov-renew');
}
function openTenantSheet(name,ini,avCls,prop,rent,status){
  document.getElementById('ot-nm').textContent=name;
  document.getElementById('ot-prop').textContent=prop;
  document.getElementById('ot-rent').textContent=rent+' F CFA';
  document.getElementById('ot-status').textContent=status;
  const av=document.getElementById('ot-av');av.textContent=ini;av.className='av av64 '+avCls;
  const bdg=document.getElementById('ot-bdg');
  bdg.textContent=status;
  bdg.className='bdg '+(status.includes('retard')?'bd':status.includes('attente')?'bw':'bok');
  openSheet('ov-tenant');
}
function openEditProfile(){
  if(CU){document.getElementById('ep-name').value=CU.name||'';document.getElementById('ep-tel').value=CU.tel||'';document.getElementById('ep-email').value=CU.email||'';}
  openSheet('ov-edit');
}
function saveProfile(){
  const name=document.getElementById('ep-name').value.trim();
  if(CU&&name){
    CU.name=name;CU.tel=document.getElementById('ep-tel').value.trim();
    const acc=getAcc().map(a=>a.email===CU.email?{...a,...CU}:a);saveAcc(acc);
    applyUser(CU);
  }
  closeSheet('ov-edit');toast('✅ Profil mis à jour avec succès !');
}
function openNotifPrefs(){openSheet('ov-notif');}
function openLangSheet(){openSheet('ov-lang');}
function selectLang(lang,flag){closeSheet('ov-lang');toast(flag+' Langue changée : '+lang);}
function doSign(){
  const v=document.getElementById('sig-input').value.trim();
  if(!v){toast('⚠️ Veuillez saisir votre nom pour signer');return;}
  closeSheet('ov-sign');
  setTimeout(()=>toast('✅ Contrat signé électroniquement par '+v),200);
}
function toggleNotif(el){
  const on=el.classList.toggle('on');
  const dot=el.querySelector('div');
  el.style.background=on?'var(--terra)':'var(--softer)';
  dot.style[on?'right':'left']='2px';dot.style[on?'left':'right']='';
}

