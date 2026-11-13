// Adapté de prisma-hero.tsx : JavaScript, contenu passé en props, cibles tactiles d'au moins 44 px
// et texte d'au moins 12 px. Le fond est fourni par la page (aucune vidéo externe).
import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { cn } from '@/lib/utils';

const EASE = [0.16, 1, 0.3, 1];

/* ---------------- WordsPullUp ---------------- */
// espace : écart entre les mots ; « 0 » permet d'animer les morceaux d'un nom (« Pay Ton Loyer ») sans les séparer.
export function WordsPullUp({ text, className = '', showAsterisk = false, style, espace = '0.25em' }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const words = text.split(' ');

  return (
    <span ref={ref} className={cn('inline-flex flex-wrap', className)} style={style}>
      {words.map((word, i) => {
        const isLast = i === words.length - 1;
        return (
          <motion.span
            key={`${word}-${i}`}
            initial={{ y: 20, opacity: 0 }}
            animate={isInView ? { y: 0, opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: i * 0.08, ease: EASE }}
            className="relative inline-block"
            style={{ marginRight: isLast ? 0 : espace }}
          >
            {word}
            {showAsterisk && isLast && (
              <span aria-hidden="true" className="absolute top-[0.65em] -right-[0.3em] text-[0.31em]">
                *
              </span>
            )}
          </motion.span>
        );
      })}
    </span>
  );
}

/* ---------------- WordsPullUpMultiStyle ---------------- */
export function WordsPullUpMultiStyle({ segments, className = '', style }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const words = segments.flatMap((seg) => seg.text.split(' ').filter(Boolean).map((word) => ({ word, className: seg.className })));

  return (
    <span ref={ref} className={cn('inline-flex flex-wrap justify-center', className)} style={style}>
      {words.map((w, i) => (
        <motion.span
          key={`${w.word}-${i}`}
          initial={{ y: 20, opacity: 0 }}
          animate={isInView ? { y: 0, opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: i * 0.08, ease: EASE }}
          className={cn('inline-block', w.className)}
          style={{ marginRight: '0.25em' }}
        >
          {w.word}
        </motion.span>
      ))}
    </span>
  );
}

/* ---------------- Hero ---------------- */
// liens : [{ libelle, href, classe? }] ; fond : calques d'arrière-plan ; action : bouton(s) d'appel.
export function PrismaHero({ titre, espaceTitre, description, liens = [], action, fond, className }) {
  return (
    <section className={cn('h-[calc(100svh-4rem)] min-h-[28rem] w-full p-2 sm:p-3', className)}>
      <div className="relative h-full w-full overflow-hidden rounded-2xl md:rounded-[2rem]">
        {fond}

        {/* Grain */}
        <div aria-hidden="true" className="noise-overlay pointer-events-none absolute inset-0 opacity-70 mix-blend-overlay" />
        {/* Dégradé de lisibilité */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60" />

        {liens.length > 0 && (
          <nav aria-label="Sections de la page" className="absolute top-0 left-1/2 z-20 -translate-x-1/2">
            <ul className="flex items-center gap-0.5 rounded-b-2xl bg-black px-2 sm:gap-3 md:rounded-b-3xl md:px-6 lg:gap-8">
              {liens.map(({ libelle, href, classe }) => (
                <li key={href} className={classe}>
                  <a href={href} className="flex min-h-11 items-center px-2 text-xs whitespace-nowrap text-[#E1E0CC]/80 transition-colors hover:text-[#E1E0CC] sm:text-sm">
                    {libelle}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <div className="absolute inset-x-0 bottom-0 px-4 pb-2 sm:px-6 md:px-10">
          <div className="grid grid-cols-12 items-end gap-4">
            <div className="col-span-12 flex flex-col gap-5 sm:col-span-9 md:col-span-7 lg:col-span-5 lg:col-start-8">
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.5, ease: EASE }}
                className="text-sm text-[#E1E0CC]/80 md:text-base"
                style={{ lineHeight: 1.35 }}
              >
                {description}
              </motion.p>
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8, delay: 0.7, ease: EASE }}>
                {action}
              </motion.div>
            </div>

            <div className="col-span-12">
              {/* pb : laisse la place aux jambages (y, p) que le cadre arrondi couperait. */}
              <h1 className="pb-[0.14em] text-[14vw] leading-[0.85] font-medium tracking-[-0.07em] text-[#E1E0CC] lg:text-[14.5vw]">
                <WordsPullUp text={titre} espace={espaceTitre} className={espaceTitre === '0' ? 'flex-nowrap' : ''} />
              </h1>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
