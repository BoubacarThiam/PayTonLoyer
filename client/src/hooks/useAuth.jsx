import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';

const Contexte = createContext(null);

export function FournisseurAuth({ children }) {
  const [utilisateur, setUtilisateur] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreurReseau, setErreurReseau] = useState(false);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreurReseau(false);
    try {
      const { utilisateur: u } = await api.get('/auth/moi');
      setUtilisateur(u);
    } catch (erreur) {
      setUtilisateur(null);
      if (erreur.code === 'RESEAU') setErreurReseau(true);
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    charger();
    const expiree = () => setUtilisateur(null);
    window.addEventListener('session-expiree', expiree);
    return () => window.removeEventListener('session-expiree', expiree);
  }, [charger]);

  const deconnecter = useCallback(async () => {
    await api.post('/auth/deconnexion').catch(() => {});
    setUtilisateur(null);
  }, []);

  const valeur = useMemo(
    () => ({ utilisateur, setUtilisateur, chargement, erreurReseau, recharger: charger, deconnecter }),
    [utilisateur, chargement, erreurReseau, charger, deconnecter],
  );
  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
}

export const useAuth = () => useContext(Contexte);
