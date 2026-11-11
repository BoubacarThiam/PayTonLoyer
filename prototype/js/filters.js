// ============================================================
// FILTER — PAIEMENTS
// ============================================================
function filterPay(f){
  ['all','ok','w','d'].forEach(x=>{const el=document.getElementById('ft-'+x);if(el)el.classList.toggle('on',x===f);});
  document.querySelectorAll('.pay-row').forEach(r=>{
    r.style.display=(f==='all'||r.dataset.s===f)?'flex':'none';
  });
}

// ============================================================
// FILTER — LOCATAIRES
// ============================================================
function filterTenants(q){
  document.querySelectorAll('.ti').forEach(t=>{
    const name=t.querySelector('.ti-n').textContent.toLowerCase();
    t.style.display=name.includes(q.toLowerCase())?'flex':'none';
  });
}

// ============================================================
// NOTIFICATIONS
// ============================================================
function markAllRead(){
  document.querySelectorAll('.n-dot').forEach(d=>{d.classList.add('rd');d.style.background='transparent';});
  document.querySelectorAll('.n-txt').forEach(t=>t.style.color='var(--muted)');
  toast('✅ Toutes les notifications sont lues');
}

