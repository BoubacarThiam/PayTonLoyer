import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client.js';

// Charge une ressource GET. Les données précédentes restent affichées pendant un rechargement.
export function useRequete(chemin) {
  const [etat, setEtat] = useState({ donnees: null, chargement: true, erreur: null });
  const dernier = useRef(0);

  const recharger = useCallback(async () => {
    const numero = ++dernier.current;
    setEtat((e) => ({ ...e, chargement: true, erreur: null }));
    try {
      const donnees = await api.get(chemin);
      if (numero === dernier.current) setEtat({ donnees, chargement: false, erreur: null });
    } catch (erreur) {
      if (numero === dernier.current) setEtat((e) => ({ ...e, chargement: false, erreur }));
    }
  }, [chemin]);

  useEffect(() => {
    recharger();
  }, [recharger]);

  return { ...etat, recharger };
}
