import { z } from 'zod';
import { ErreurApi } from './erreurs.js';

z.config(z.locales.fr());

// valider({ body: schema, query: schema, params: schema }) place le résultat dans req.valide.
export function valider(schemas) {
  return (req, res, next) => {
    req.valide = req.valide || {};
    for (const [partie, schema] of Object.entries(schemas)) {
      const resultat = schema.safeParse(req[partie] ?? {});
      if (!resultat.success) {
        const champs = {};
        for (const probleme of resultat.error.issues) {
          const champ = probleme.path.join('.') || 'general';
          champs[champ] = champs[champ] || probleme.message;
        }
        const erreur = new ErreurApi(400, Object.values(champs)[0], 'VALIDATION');
        erreur.champs = champs;
        return next(erreur);
      }
      req.valide[partie] = resultat.data;
    }
    return next();
  };
}
