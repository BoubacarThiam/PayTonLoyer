import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { Pause, Play } from 'lucide-react';
import './animation-marque.css';

const LARGEUR = 1920;
const nf = (n) => String(Math.round(n / 1000) * 1000).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

function construire(compteurs) {
  const tl = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 0.6 });
  const D = 15;
  tl.fromTo('#am-aurore-a', { x: -120, y: -40 }, { x: 160, y: 60, duration: D, ease: 'sine.inOut' }, 0)
    .fromTo('#am-aurore-b', { x: 120, y: 40 }, { x: -200, y: -80, duration: D, ease: 'sine.inOut' }, 0)
    .fromTo('.am-fond .grille', { scale: 1.15, opacity: 0 }, { scale: 1, opacity: 1, duration: 2.2, ease: 'power2.out' }, 0);

  // 1. Ouverture
  tl.set('#am-s1', { autoAlpha: 1 }, 0)
    .fromTo('#am-ligne', { scaleX: 0, scaleY: 1, opacity: 1 }, { scaleX: 1, duration: 0.6, ease: 'expo.inOut' }, 0.15)
    .to('#am-ligne', { scaleY: 40, opacity: 0, duration: 0.5, ease: 'expo.in' }, 0.75)
    .fromTo('#am-embleme', { clipPath: 'inset(100% 0 0 0)', y: 80, scale: 1.25, opacity: 1, filter: 'blur(24px)' }, { clipPath: 'inset(0% 0 0 0)', y: 0, scale: 1, filter: 'blur(0px)', duration: 0.9, ease: 'expo.out' }, 0.8)
    .fromTo('#am-onde', { scale: 0, opacity: 1 }, { scale: 60, opacity: 0, duration: 1.3, ease: 'expo.out' }, 0.9)
    .fromTo('#am-embleme .reflet', { backgroundPosition: '150% 0' }, { backgroundPosition: '-50% 0', duration: 0.7, ease: 'power2.inOut' }, 1.45)
    .to('#am-embleme', { scale: 0.92, duration: 0.5, ease: 'power2.inOut' }, 1.75)
    .to('#am-embleme', { scale: 14, opacity: 0, filter: 'blur(10px)', duration: 0.55, ease: 'expo.in' }, 2.15)
    .fromTo('#am-rideau', { clipPath: 'circle(0% at 50% 50%)' }, { clipPath: 'circle(80% at 50% 50%)', duration: 0.55, ease: 'expo.in' }, 2.1)
    .set('#am-s1', { autoAlpha: 0 }, 2.65);

  // 2. Mots puis compteur
  tl.set('#am-s2a', { autoAlpha: 1 }, 2.6)
    .to('#am-rideau', { clipPath: 'circle(0% at 50% 50%)', duration: 0.5, ease: 'expo.out' }, 2.65)
    .fromTo('#am-s2a .mot', { yPercent: 120, skewY: 8 }, { yPercent: 0, skewY: 0, duration: 0.6, ease: 'expo.out', stagger: 0.14 }, 2.68)
    .fromTo('#am-s2a .vert', { color: '#6ee7b7' }, { color: '#ffffff', duration: 0.35, ease: 'power2.out' }, 3.35)
    .fromTo('#am-s2a', { scale: 1 }, { scale: 1.06, duration: 1.3, ease: 'none' }, 2.65)
    .to('#am-s2a .mot', { yPercent: -120, duration: 0.35, ease: 'expo.in', stagger: 0.04 }, 3.62)
    .set('#am-s2a', { autoAlpha: 0 }, 3.98)
    .set('#am-s2b', { autoAlpha: 1 }, 3.95)
    .fromTo('#am-compteur-bloc', { y: 0, scale: 0.7, opacity: 0, filter: 'blur(20px)' }, { scale: 1, opacity: 1, filter: 'blur(0px)', duration: 0.55, ease: 'expo.out' }, 3.95)
    .fromTo(compteurs.grand, { v: 0 }, { v: 850000, duration: 1.0, ease: 'expo.out' }, 4.0)
    .fromTo('#am-barre i', { scaleX: 0 }, { scaleX: 0.68, duration: 0.9, ease: 'expo.out' }, 4.15)
    .to('#am-compteur-bloc', { y: -60, opacity: 0, filter: 'blur(14px)', duration: 0.35, ease: 'power3.in' }, 4.95)
    .set('#am-s2b', { autoAlpha: 0 }, 5.3);

  // 3. Produit
  tl.set('#am-s3', { autoAlpha: 1, x: 0, rotateY: 0, filter: 'blur(0px)', opacity: 1 }, 5.2)
    .fromTo('#am-telephone', { x: 700, y: 0, rotateY: -55, rotateZ: 12, filter: 'blur(14px)' }, { x: 0, rotateY: -16, rotateZ: 4, filter: 'blur(0px)', duration: 1.0, ease: 'expo.out' }, 5.2)
    .to('#am-telephone', { rotateY: -6, rotateZ: 2, y: -16, duration: 2.2, ease: 'sine.inOut' }, 6.2)
    .fromTo('.mot-prod', { yPercent: 110 }, { yPercent: 0, duration: 0.7, ease: 'expo.out', stagger: 0.15 }, 5.35)
    .fromTo(compteurs.tel, { v: 0 }, { v: 850000, duration: 1.1, ease: 'expo.out' }, 5.6)
    .fromTo('#am-tel-barre i', { scaleX: 0 }, { scaleX: 0.68, duration: 1.0, ease: 'expo.out' }, 5.7)
    .fromTo('#am-s3 .app', { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'back.out(1.6)', stagger: 0.09 }, 5.75)
    .fromTo('.am .puce', { scale: 0, opacity: 0, rotate: -12, y: 0 }, { scale: 1, opacity: 1, rotate: 0, duration: 0.6, ease: 'back.out(2)', stagger: 0.12 }, 6.1)
    .to('#am-p-wave', { y: -26, duration: 2, ease: 'sine.inOut' }, 6.7)
    .to('#am-p-om', { y: 30, duration: 2, ease: 'sine.inOut' }, 6.7)
    .to('#am-p-fm', { y: -22, duration: 2, ease: 'sine.inOut' }, 6.7)
    .fromTo('#am-notif', { y: 140, opacity: 0, scale: 0.9 }, { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.8)' }, 6.9)
    .to('#am-s3', { x: -1100, rotateY: 30, filter: 'blur(16px)', opacity: 0, duration: 0.55, ease: 'expo.in' }, 8.0)
    .set('#am-s3', { autoAlpha: 0 }, 8.56);

  // 4. Quittance
  tl.set('#am-s4', { autoAlpha: 1, scale: 1, filter: 'blur(0px)', opacity: 1 }, 8.4)
    .fromTo('#am-doc', { rotateX: -80, y: -120, opacity: 0 }, { rotateX: 0, y: 0, opacity: 1, duration: 0.9, ease: 'expo.out' }, 8.45)
    .fromTo('#am-doc .trait', { scaleX: 0 }, { scaleX: 1, duration: 0.5, ease: 'expo.out', stagger: 0.06 }, 8.8)
    .fromTo('#am-doc-montant', { x: -40, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, ease: 'expo.out' }, 8.95)
    .fromTo('.mot-doc', { yPercent: 110 }, { yPercent: 0, duration: 0.7, ease: 'expo.out', stagger: 0.18 }, 8.7)
    .fromTo('#am-tampon', { scale: 3.2, rotate: -32, opacity: 0 }, { scale: 1, rotate: -14, opacity: 1, duration: 0.32, ease: 'power4.in' }, 9.55)
    .fromTo('#am-s4', { x: 0, y: 0 }, { x: 14, y: -10, duration: 0.05, repeat: 5, yoyo: true, ease: 'none' }, 9.87)
    .fromTo('#am-coche-cercle', { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.6, ease: 'power2.inOut' }, 9.9)
    .fromTo('#am-coche-trait', { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.4, ease: 'power2.out' }, 10.3)
    .to('#am-s4', { scale: 0.85, opacity: 0, filter: 'blur(18px)', duration: 0.45, ease: 'expo.in' }, 10.95)
    .set('#am-s4', { autoAlpha: 0 }, 11.42);

  // 5. Bandes croisées puis cercle blanc
  tl.set('#am-s5', { autoAlpha: 1 }, 11.3)
    .fromTo('#am-bande-1', { x: 300 }, { x: -1500, duration: 2.1, ease: 'power1.inOut' }, 11.3)
    .fromTo('#am-bande-2', { x: -1700 }, { x: 0, duration: 2.1, ease: 'power1.inOut' }, 11.3)
    .fromTo('#am-bande-3', { x: 200 }, { x: -1400, duration: 2.1, ease: 'power1.inOut' }, 11.3)
    .fromTo('#am-s5', { opacity: 0 }, { opacity: 1, duration: 0.25 }, 11.3)
    .fromTo('#am-blanc', { clipPath: 'circle(0% at 50% 50%)' }, { clipPath: 'circle(75% at 50% 50%)', duration: 0.6, ease: 'expo.in' }, 12.85)
    .set('#am-s5', { autoAlpha: 0 }, 13.5);

  // 6. Signature
  tl.fromTo('#am-vignette', { opacity: 1 }, { opacity: 0, duration: 0.3 }, 13.3)
    .set('#am-fin', { autoAlpha: 1 }, 13.42)
    .fromTo('#am-logo-fin', { scale: 1.12, filter: 'blur(16px)', clipPath: 'inset(0 100% 0 0)' }, { scale: 1, filter: 'blur(0px)', clipPath: 'inset(0 0% 0 0)', duration: 0.9, ease: 'expo.out' }, 13.45)
    .fromTo('#am-accroche', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'expo.out' }, 13.85)
    .fromTo('#am-mentions', { y: 30, opacity: 0, letterSpacing: '.6em' }, { y: 0, opacity: 1, letterSpacing: '.32em', duration: 0.8, ease: 'expo.out' }, 14.0)
    .fromTo('#am-logo-fin .reflet', { backgroundPosition: '150% 0' }, { backgroundPosition: '-50% 0', duration: 0.8, ease: 'power2.inOut' }, 14.15)
    .fromTo('#am-fin', { scale: 1 }, { scale: 1.02, duration: 1.6, ease: 'none' }, 13.4)
    .set('#am-fin', { autoAlpha: 0 }, D + 0.55)
    .set('#am-blanc', { clipPath: 'circle(0% at 50% 50%)' }, D + 0.55)
    .set({}, {}, D + 0.6);
  return tl;
}

export default function AnimationMarque() {
  const cadre = useRef(null);
  const scene = useRef(null);
  const tl = useRef(null);
  const [enLecture, setEnLecture] = useState(false);
  const [mouvementReduit] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const voulue = useRef(!mouvementReduit);
  const visible = useRef(false);

  // La scène est dessinée à 1920 px puis réduite à la largeur disponible.
  useEffect(() => {
    const ajuster = () => {
      if (scene.current && cadre.current) scene.current.style.transform = `scale(${cadre.current.clientWidth / LARGEUR})`;
    };
    ajuster();
    const observateur = new ResizeObserver(ajuster);
    observateur.observe(cadre.current);
    return () => observateur.disconnect();
  }, []);

  useEffect(() => {
    const compteurs = { grand: { v: 0 }, tel: { v: 0 } };
    const ctx = gsap.context(() => {
      tl.current = construire(compteurs);
      const grand = scene.current.querySelector('#am-compteur');
      const tel = scene.current.querySelector('#am-tel-montant');
      tl.current.eventCallback('onUpdate', () => {
        grand.textContent = nf(compteurs.grand.v);
        tel.textContent = `${nf(compteurs.tel.v)} FCFA`;
      });
      // Sans animation : on affiche directement l'écran final avec le logo.
      tl.current.seek(mouvementReduit ? 15 : 0);
    }, scene);

    // Ne tourne que lorsqu'elle est à l'écran, pour économiser la batterie.
    const io = new IntersectionObserver(([entree]) => {
      visible.current = entree.isIntersecting;
      if (entree.isIntersecting && voulue.current) {
        tl.current.play();
        setEnLecture(true);
      } else {
        tl.current.pause();
        setEnLecture(false);
      }
    }, { threshold: 0.35 });
    io.observe(cadre.current);
    return () => {
      io.disconnect();
      ctx.revert();
    };
  }, [mouvementReduit]);

  function basculer() {
    voulue.current = !enLecture;
    if (enLecture) tl.current.pause();
    else {
      if (tl.current.time() >= 15) tl.current.seek(0);
      tl.current.play();
    }
    setEnLecture(!enLecture);
  }

  return (
    <div className="relative">
      <div
        ref={cadre}
        role="img"
        aria-label="Animation de présentation : le logo PayTonLoyer, le message « Vos loyers encaissés », le tableau de bord sur téléphone avec Wave, Orange Money et Free Money, une quittance marquée « Payé », puis le logo et l’accroche « Vos loyers, simplement. »"
        className="am-cadre rounded-[1.5rem]"
      >
        <div ref={scene} className="am" aria-hidden="true">
          <div className="couche am-fond">
            <div className="aurore" id="am-aurore-a" />
            <div className="aurore" id="am-aurore-b" />
            <div className="couche grille" />
          </div>

          <div className="couche scene centre" id="am-s1">
            <div id="am-ligne" />
            <div id="am-onde" />
            <div id="am-embleme" style={{ '--masque': "url('/logo/embleme-blanc.png')" }}>
              <img src="/logo/embleme-blanc.png" alt="" />
              <div className="reflet" />
            </div>
          </div>
          <div className="couche" id="am-rideau" />

          <div className="couche scene centre" id="am-s2a" style={{ flexDirection: 'column' }}>
            <div className="ligne-texte"><span className="mot">Vos</span><span className="mot">loyers</span></div>
            <div className="ligne-texte"><span className="mot vert">encaissés.</span></div>
          </div>
          <div className="couche scene centre" id="am-s2b">
            <div id="am-compteur-bloc">
              <div><span id="am-compteur">0</span><span id="am-unite">FCFA</span></div>
              <div id="am-legende">encaissés ce mois, sans courir après personne</div>
              <div id="am-barre"><i /></div>
            </div>
          </div>

          <div className="couche scene" id="am-s3">
            <div id="am-titre-produit">
              <div className="ligne-texte"><p className="grand mot-prod">Tout votre parc.</p></div>
              <div className="ligne-texte"><p className="grand mot-prod vert">Dans votre poche.</p></div>
            </div>
            <div id="am-telephone">
              <div className="tel-ecran">
                <div className="tel-haut">
                  <small>Encaissé ce mois</small>
                  <div id="am-tel-montant">0 FCFA</div>
                  <div id="am-tel-barre"><i /></div>
                </div>
                <div className="tuiles">
                  <div className="tuile app"><small>Attendus</small><b>1&nbsp;250&nbsp;000</b></div>
                  <div className="tuile app"><small>Impayés</small><b>400&nbsp;000</b></div>
                </div>
                <div className="rangee app"><div className="avatar" style={{ background: '#d1fae5', color: '#065f46' }}>MN</div><div><b>Moussa Ndiaye</b><small>Oct. · 120 000 FCFA</small></div><div className="rond-vert" /></div>
                <div className="rangee app"><div className="avatar" style={{ background: '#fef3c7', color: '#78350f' }}>AS</div><div><b>Aïda Sarr</b><small>Nov. · 95 000 FCFA</small></div><div className="rond-vert" /></div>
                <div className="rangee app"><div className="avatar" style={{ background: '#ccfbf1', color: '#134e4a' }}>FF</div><div><b>Fatou Fall</b><small>À jour</small></div></div>
              </div>
            </div>
            <div className="puce" id="am-p-wave" style={{ left: 880, top: 200 }}><span style={{ background: '#1dc8ff', color: '#06283d' }}>W</span>Wave</div>
            <div className="puce" id="am-p-om" style={{ left: 1560, top: 330 }}><span style={{ background: '#ff7900', color: '#1a1a1a' }}>OM</span>Orange Money</div>
            <div className="puce" id="am-p-fm" style={{ left: 1610, top: 640 }}><span style={{ background: '#c8102e' }}>FM</span>Free Money</div>
            <div id="am-notif"><i /><div>Rappel envoyé sur WhatsApp<small>Moussa Ndiaye · loyer d’octobre</small></div></div>
          </div>

          <div className="couche scene" id="am-s4">
            <div id="am-doc">
              <div className="doc-tete"><b>Quittance de loyer</b><small>N° Q-202611-7F3A2C</small></div>
              <div className="trait" style={{ width: '70%' }} />
              <div className="trait" style={{ width: '52%' }} />
              <div id="am-doc-montant">150 000 FCFA</div>
              <div className="trait" style={{ width: '80%' }} />
              <div className="trait" style={{ width: '64%' }} />
              <div className="trait" style={{ width: '74%' }} />
            </div>
            <div id="am-tampon">PAYÉ</div>
            <svg id="am-coche" width="120" height="120" viewBox="0 0 120 120">
              <circle id="am-coche-cercle" cx="60" cy="60" r="54" fill="none" stroke="#6ee7b7" strokeWidth="8" strokeLinecap="round" pathLength="1" strokeDasharray="1" strokeDashoffset="1" transform="rotate(-90 60 60)" />
              <path id="am-coche-trait" d="M36 62 l16 16 l32 -34" fill="none" stroke="#fff" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" pathLength="1" strokeDasharray="1" strokeDashoffset="1" />
            </svg>
            <div id="am-titre-doc">
              <div className="ligne-texte"><p className="grand mot-doc">La quittance ?</p></div>
              <div className="ligne-texte"><p className="grand mot-doc vert">Déjà prête.</p></div>
            </div>
          </div>

          <div className="couche scene" id="am-s5" style={{ transform: 'rotate(-7deg) scale(1.15)' }}>
            <div className="bande" id="am-bande-1" style={{ top: 70 }}>Échéances <em>automatiques</em> · Wave · <em>Orange Money</em> · Échéances</div>
            <div className="bande vert" id="am-bande-2" style={{ top: 420 }}>Rappels WhatsApp · <em>Quittances PDF</em> · Rappels WhatsApp</div>
            <div className="bande" id="am-bande-3" style={{ top: 770 }}><em>Espèces</em> · Free Money · <em>Tableau de bord</em> · Espèces</div>
          </div>
          <div className="couche" id="am-blanc" />

          <div className="couche centre" id="am-fin">
            <div id="am-logo-fin" style={{ '--masque': "url('/logo/logo-bleu.png')" }}>
              <img src="/logo/logo-bleu.png" alt="" />
              <div className="reflet" />
            </div>
            <div id="am-accroche">Vos loyers, simplement.</div>
            <div id="am-mentions">Gestion locative · Mobile Money · Sénégal</div>
          </div>

          <div className="couche" id="am-vignette" />
        </div>
      </div>

      <button
        type="button"
        onClick={basculer}
        aria-pressed={!enLecture}
        aria-label={enLecture ? 'Mettre l’animation en pause' : 'Lire l’animation'}
        className="absolute right-3 bottom-3 flex size-11 items-center justify-center rounded-full bg-black/60 text-white ring-1 ring-white/30 backdrop-blur-md transition-colors hover:bg-black/75"
      >
        {enLecture ? <Pause size={20} aria-hidden="true" /> : <Play size={20} aria-hidden="true" />}
      </button>
    </div>
  );
}
