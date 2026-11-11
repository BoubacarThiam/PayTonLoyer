// Adapté de motion-footer.tsx (CinematicFooter) : JavaScript, contenu passé en props,
// couleurs PayTonLoyer, police auto-hébergée et mouvements désactivés si l'utilisateur le demande.
import { forwardRef, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import '@/styles/cinematique.css';

gsap.registerPlugin(ScrollTrigger);

const SANS_MOUVEMENT = '(prefers-reduced-motion: reduce)';
const POINTEUR_FIN = '(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)';

// Bouton qui suit légèrement la souris. Inactif au doigt et quand les animations sont réduites.
export const MagneticButton = forwardRef(function MagneticButton({ className, children, as: Composant = 'button', ...props }, refExterne) {
  const refLocale = useRef(null);

  useEffect(() => {
    const element = refLocale.current;
    if (!element) return undefined;
    const mm = gsap.matchMedia();
    mm.add(POINTEUR_FIN, () => {
      const bouger = (e) => {
        const r = element.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        gsap.to(element, { x: x * 0.35, y: y * 0.35, rotationX: -y * 0.12, rotationY: x * 0.12, scale: 1.04, ease: 'power2.out', duration: 0.4 });
      };
      const quitter = () => gsap.to(element, { x: 0, y: 0, rotationX: 0, rotationY: 0, scale: 1, ease: 'elastic.out(1, 0.3)', duration: 1.2 });
      element.addEventListener('mousemove', bouger);
      element.addEventListener('mouseleave', quitter);
      return () => {
        element.removeEventListener('mousemove', bouger);
        element.removeEventListener('mouseleave', quitter);
      };
    });
    return () => mm.revert();
  }, []);

  return (
    <Composant
      ref={(noeud) => {
        refLocale.current = noeud;
        if (typeof refExterne === 'function') refExterne(noeud);
        else if (refExterne) refExterne.current = noeud;
      }}
      className={cn('cursor-pointer', className)}
      {...props}
    >
      {children}
    </Composant>
  );
});

export function Bandeau({ elements, className }) {
  const serie = (
    <div className="flex items-center gap-12 px-6">
      {elements.map((texte, i) => (
        <span key={texte} className="flex items-center gap-12">
          {texte}
          <span className={i % 2 ? 'text-marque-200/70' : 'text-marque-300/70'}>✦</span>
        </span>
      ))}
    </div>
  );
  return (
    <div aria-hidden="true" className={cn('overflow-hidden border-y border-white/10 bg-marque-950/60 py-4 backdrop-blur-md', className)}>
      <div className="cine-defile flex w-max text-xs font-bold tracking-[0.3em] text-white/70 uppercase md:text-sm">
        {serie}
        {serie}
      </div>
    </div>
  );
}

export function CinematicFooter({ titre, texteGeant, bandeau, actions, liens, mention, badge }) {
  const refEnveloppe = useRef(null);
  const refGeant = useRef(null);
  const refTitre = useRef(null);
  const refLiens = useRef(null);

  useEffect(() => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo(
        refGeant.current,
        { y: '10vh', scale: 0.8, opacity: 0 },
        { y: '0vh', scale: 1, opacity: 1, ease: 'power1.out', scrollTrigger: { trigger: refEnveloppe.current, start: 'top 80%', end: 'bottom bottom', scrub: 1 } },
      );
      gsap.fromTo(
        [refTitre.current, refLiens.current],
        { y: 50, opacity: 0 },
        { y: 0, opacity: 1, stagger: 0.15, ease: 'power3.out', scrollTrigger: { trigger: refEnveloppe.current, start: 'top 60%', end: 'bottom bottom', scrub: 1 } },
      );
    });
    return () => mm.revert();
  }, []);

  // Le pied de page est fixe sous la page : un élément qui reçoit le focus doit être réellement visible.
  function rendreVisible() {
    const r = refEnveloppe.current.getBoundingClientRect();
    if (r.bottom > window.innerHeight + 1 || r.top > 1) {
      refEnveloppe.current.scrollIntoView({ block: 'end', behavior: window.matchMedia(SANS_MOUVEMENT).matches ? 'auto' : 'smooth' });
    }
  }

  const remonter = () => window.scrollTo({ top: 0, behavior: window.matchMedia(SANS_MOUVEMENT).matches ? 'auto' : 'smooth' });

  return (
    // Effet « rideau » : l'enveloppe découpe le pied de page fixe, qui se dévoile au défilement.
    <div ref={refEnveloppe} className="relative h-[100svh] w-full court:h-auto" style={{ clipPath: 'polygon(0% 0, 100% 0%, 100% 100%, 0 100%)' }}>
      <footer
        onFocus={rendreVisible}
        className="safe-bas fixed bottom-0 left-0 flex h-[100svh] w-full flex-col justify-between overflow-hidden bg-marque-950 text-white court:relative court:h-auto court:min-h-[100svh]"
      >
        <div aria-hidden="true" className="cine-aurore cine-respire pointer-events-none absolute top-1/2 left-1/2 z-0 h-[60vh] w-[80vw] -translate-x-1/2 -translate-y-1/2 rounded-[50%] blur-[80px]" />
        <div aria-hidden="true" className="cine-grille pointer-events-none absolute inset-0 z-0" />
        <div
          ref={refGeant}
          aria-hidden="true"
          className="cine-texte-geant pointer-events-none absolute -bottom-[3vh] left-1/2 z-0 -translate-x-1/2 text-[15vw] whitespace-nowrap select-none"
        >
          {texteGeant}
        </div>

        {bandeau && <Bandeau elements={bandeau} className="absolute top-10 left-0 z-10 w-full -rotate-2 scale-110 shadow-2xl court:relative court:mt-8" />}

        <div className="relative z-10 mx-auto mt-24 flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-6 court:mt-12 court:py-10">
          <h2 ref={refTitre} className="cine-metal mb-10 text-center text-5xl font-black tracking-tighter text-balance md:text-8xl">
            {titre}
          </h2>
          <div ref={refLiens} className="flex w-full flex-col items-center gap-5">
            <div className="flex w-full flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">{actions}</div>
            {liens && <div className="flex w-full flex-wrap justify-center gap-2.5 md:gap-4">{liens}</div>}
          </div>
        </div>

        <div className="relative z-20 flex w-full items-center justify-between gap-4 px-6 pt-6 pb-8 md:px-12">
          <p className="text-xs font-semibold tracking-widest text-white/70 uppercase">{mention}</p>
          {badge && <div className="cine-pilule hidden items-center gap-2 rounded-full px-5 py-2.5 md:flex">{badge}</div>}
          <MagneticButton
            onClick={remonter}
            aria-label="Revenir en haut de la page"
            className="cine-pilule group flex size-12 shrink-0 items-center justify-center rounded-full text-white/80"
          >
            <ArrowUp size={20} className="transition-transform duration-300 group-hover:-translate-y-1" aria-hidden="true" />
          </MagneticButton>
        </div>
      </footer>
    </div>
  );
}
