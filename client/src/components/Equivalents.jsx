import { useRequete } from '../hooks/useRequete.js';

const formatEuro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const formatDollar = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD' });

// Équivalents indicatifs d'un montant en FCFA, utiles aux locataires de la diaspora.
export default function Equivalents({ montant, className = '' }) {
  const { donnees } = useRequete('/devises');
  if (!donnees) return null;
  const parties = [formatEuro.format(montant / donnees.fcfaParEuro)];
  if (donnees.fcfaParDollar) parties.push(formatDollar.format(montant / donnees.fcfaParDollar));
  return (
    <p className={className} title="Taux indicatif : euro au taux fixe officiel, dollar au taux de la BCE">
      ≈ {parties.join(' · ')}
    </p>
  );
}
