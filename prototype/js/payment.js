// ============================================================
// PAYMENT — Intégration complète des moyens de paiement
// ============================================================

// Données des moyens de paiement
const PM_DATA = {
  wave: {
    name: 'Wave',
    logo: '🌊',
    color: '#0070F0',
    ussd: '',
    accountLbl: 'Compte Wave',
    phoneLbl: 'Votre numéro Wave',
    phoneHint: 'Vous recevrez une notification Wave pour confirmer le paiement',
    instructions: {
      bg: 'rgba(0,112,240,.08)',
      border: 'rgba(0,112,240,.2)',
      icon: '💙',
      color: '#0070F0',
      text: "<strong>Comment ça marche :</strong> Entrez votre numéro Wave → Ouvrez l'app Wave → Confirmez. Fonds transférés instantanément."
    },
    isBank: false
  },
  om: {
    name: 'Orange Money',
    logo: '🟠',
    color: '#FF7800',
    ussd: '#144#',
    accountLbl: 'Numéro Orange',
    phoneLbl: 'Votre numéro Orange Money',
    phoneHint: 'Composez #144# puis validez avec votre code PIN Orange Money',
    instructions: {
      bg: 'rgba(255,120,0,.08)',
      border: 'rgba(255,120,0,.2)',
      icon: '📱',
      color: '#E05000',
      text: '<strong>Code USSD :</strong> Composez <strong>#144#</strong> depuis votre téléphone Orange → Sélectionnez "Paiement" → Entrez le code marchand et le montant → Validez avec votre PIN.'
    },
    isBank: false
  },
  mtn: {
    name: 'MTN Mobile Money',
    logo: '🟡',
    color: '#FFC200',
    ussd: '*170#',
    accountLbl: 'Numéro MTN',
    phoneLbl: 'Votre numéro MTN MoMo',
    phoneHint: 'Composez *170# puis suivez les instructions pour payer',
    instructions: {
      bg: 'rgba(255,194,0,.1)',
      border: 'rgba(200,150,0,.25)',
      icon: '📱',
      color: '#B08000',
      text: '<strong>Code USSD :</strong> Composez <strong>*170#</strong> → Choisissez "Paiement marchand" → Entrez le numéro du bénéficiaire et le montant → Confirmez avec votre PIN.'
    },
    isBank: false
  },
  free: {
    name: 'Free Money',
    logo: '🟢',
    color: '#00AA00',
    ussd: '*555#',
    accountLbl: 'Numéro Free',
    phoneLbl: 'Votre numéro Free Money',
    phoneHint: 'Composez *555# depuis votre téléphone Free pour confirmer',
    instructions: {
      bg: 'rgba(0,170,0,.08)',
      border: 'rgba(0,170,0,.2)',
      icon: '📱',
      color: '#007700',
      text: "<strong>Code USSD :</strong> Composez <strong>*555#</strong> → Sélectionnez \"Envoi d'argent\" → Entrez le numéro et montant → Validez avec votre PIN."
    },
    isBank: false
  },
  expresso: {
    name: 'Expresso / Tigo Cash',
    logo: '🔴',
    color: '#DD0000',
    ussd: '*888#',
    accountLbl: 'Numéro Expresso',
    phoneLbl: 'Votre numéro Expresso',
    phoneHint: 'Composez *888# depuis votre téléphone Expresso/Tigo pour payer',
    instructions: {
      bg: 'rgba(200,0,0,.08)',
      border: 'rgba(200,0,0,.2)',
      icon: '📱',
      color: '#AA0000',
      text: '<strong>Code USSD :</strong> Composez <strong>*888#</strong> → Choisissez "Paiement" → Entrez le code marchand <strong>PTL001</strong> → Montant → Confirmez avec votre PIN.'
    },
    isBank: false
  },
  bank: {
    name: 'Virement bancaire',
    logo: '🏦',
    color: '#1A5CAE',
    ussd: '',
    accountLbl: 'Référence',
    phoneLbl: '',
    phoneHint: '',
    instructions: {
      bg: 'rgba(26,92,174,.08)',
      border: 'rgba(26,92,174,.2)',
      icon: 'ℹ️',
      color: '#1A5CAE',
      text: 'Effectuez votre virement bancaire avec la référence <strong>PTL-2026-05</strong>. Le paiement sera confirmé sous 1 à 2 jours ouvrés après réception.'
    },
    isBank: true
  }
};

let activePM = 'wave'; // Méthode active par défaut

function selPM(el, method) {
  activePM = method;
  // Reset tous les boutons
  document.querySelectorAll('.pm').forEach(m => {
    m.classList.remove('on');
    const r = m.querySelector('.radio');
    if (r) r.classList.remove('on');
  });
  el.classList.add('on');
  const r = el.querySelector('.radio');
  if (r) r.classList.add('on');
}

function goPayConfirm() {
  const pm = PM_DATA[activePM];
  if (!pm) { S('pay-confirm'); return; }

  // Mettre à jour le logo et le libellé
  const logoEl = document.getElementById('conf-logo');
  const lblEl  = document.getElementById('conf-method-lbl');
  if (logoEl) logoEl.textContent = pm.logo;
  if (lblEl)  lblEl.textContent  = 'Paiement via ' + pm.name;

  // Mettre à jour la ligne compte
  const alEl = document.getElementById('conf-account-lbl');
  const avEl = document.getElementById('conf-account-val');
  if (pm.isBank) {
    if (alEl) alEl.textContent = 'Référence';
    if (avEl) avEl.textContent = 'PTL-2026-05';
  } else {
    if (alEl) alEl.textContent = pm.accountLbl;
    if (avEl) avEl.textContent = '+221 7X *** ** **';
  }

  // Instructions
  const instrEl = document.getElementById('conf-instructions');
  if (instrEl) {
    instrEl.style.background = pm.instructions.bg;
    instrEl.style.borderColor = pm.instructions.border;
    instrEl.innerHTML = `
      <span style="font-size:20px;flex-shrink:0">${pm.instructions.icon}</span>
      <div style="font-size:13px;color:${pm.instructions.color};line-height:1.55">${pm.instructions.text}</div>
    `;
  }

  // Section téléphone vs virement
  const phoneSection = document.getElementById('conf-phone-section');
  const bankSection  = document.getElementById('conf-bank-section');
  const phoneLbl     = document.getElementById('conf-phone-lbl');
  const phoneHint    = document.getElementById('conf-phone-hint');

  if (pm.isBank) {
    if (phoneSection) phoneSection.style.display = 'none';
    if (bankSection)  bankSection.style.display  = 'block';
  } else {
    if (phoneSection) phoneSection.style.display = 'block';
    if (bankSection)  bankSection.style.display  = 'none';
    if (phoneLbl)  phoneLbl.textContent  = pm.phoneLbl;
    if (phoneHint) phoneHint.textContent = pm.phoneHint;
  }

  // Bouton de paiement
  const btn = document.getElementById('pay-btn');
  if (btn) {
    if (pm.isBank) {
      btn.textContent = '✅ Confirmer le virement';
    } else {
      btn.innerHTML = `🔒 Payer 150 000 F CFA via ${pm.name}`;
    }
  }

  S('pay-confirm');
}

function doPay() {
  const pm = PM_DATA[activePM] || PM_DATA.wave;

  // Validation numéro de téléphone (mobile money uniquement)
  if (!pm.isBank) {
    const phoneEl = document.getElementById('conf-phone');
    const phone = phoneEl ? phoneEl.value.replace(/\s/g,'').replace('+221','') : '';
    if (!phone || phone.length < 8) {
      toast('⚠️ Veuillez saisir votre numéro de téléphone');
      if (phoneEl) { phoneEl.style.borderColor='var(--err)'; phoneEl.focus(); }
      return;
    }
    if (phoneEl) phoneEl.style.borderColor = '';
  }

  const btn = document.getElementById('pay-btn');
  const originalText = btn.innerHTML;

  // Afficher le spinner de chargement
  btn.innerHTML = '<div class="spin"></div> Traitement en cours...';
  btn.disabled  = true;
  btn.style.opacity = '.8';

  // Simuler le délai API du prestataire
  const delay = pm.isBank ? 1000 : 1800;

  setTimeout(() => {
    btn.innerHTML  = originalText;
    btn.disabled   = false;
    btn.style.opacity = '';

    // Mettre à jour le reçu avec la méthode choisie
    const methEl = document.querySelector('#pay-ok .rct .rv:nth-child(1)');
    const allRvs = document.querySelectorAll('#pay-ok .rr .rv');
    // Trouver la ligne "Méthode" dans le reçu
    document.querySelectorAll('#pay-ok .rr').forEach(row => {
      const lbl = row.querySelector('.rl');
      const val = row.querySelector('.rv');
      if (lbl && lbl.textContent === 'Méthode' && val) {
        val.textContent = pm.name;
      }
    });

    S('pay-ok');
  }, delay);
}

function copyIBAN() {
  const iban = 'IBAN: SN28 1001 0023 4567 8901 | Ref: PTL-2026-05 | Montant: 150000 FCFA | Bénéficiaire: Amadou Mbaye';
  if (navigator.clipboard) {
    navigator.clipboard.writeText(iban).then(() => toast('📋 Coordonnées bancaires copiées !'));
  } else {
    toast('📋 Coordonnées copiées : PTL-2026-05');
  }
}

