import { ExternalLink, MapPinOff } from 'lucide-react';

// Liens et cadre OpenStreetMap (gratuits, sans clé). L'attribution « © contributeurs OpenStreetMap » est obligatoire.
export function lienCarte({ latitude, longitude }) {
  return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`;
}

function urlIntegree({ latitude, longitude }) {
  const dLon = 0.008;
  const dLat = 0.005;
  const bbox = [longitude - dLon, latitude - dLat, longitude + dLon, latitude + dLat].map((v) => v.toFixed(5)).join(',');
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude},${longitude}`;
}

export default function CartePosition({ logement }) {
  if (logement.latitude == null || logement.longitude == null) {
    return (
      <p className="flex items-start gap-2 rounded-2xl bg-sourdine p-3.5 text-sm text-secondaire">
        <MapPinOff size={20} className="shrink-0" aria-hidden="true" />
        Adresse introuvable sur la carte. Précisez le quartier et la ville (ex. « Mermoz, Dakar ») pour la localiser.
      </p>
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-bordure bg-white">
      <iframe
        title={`Carte : ${logement.nom}`}
        src={urlIntegree(logement)}
        loading="lazy"
        className="block aspect-[16/10] w-full border-0"
        referrerPolicy="no-referrer-when-downgrade"
      />
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs text-secondaire">
        <span>Position estimée d’après l’adresse · © contributeurs OpenStreetMap</span>
        <a href={lienCarte(logement)} target="_blank" rel="noreferrer" className="flex min-h-11 shrink-0 items-center gap-1 font-bold text-marque-700">
          Agrandir
          <ExternalLink size={16} aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}
