// ============================================================
// CLOSE SHEETS ON OVERLAY CLICK
// ============================================================
document.querySelectorAll('.ov').forEach(ov=>{
  ov.addEventListener('click',e=>{if(e.target===ov)ov.classList.remove('on');});
});

// ============================================================
// INIT
// ============================================================
buildCharts();
