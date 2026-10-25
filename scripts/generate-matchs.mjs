
import { writeFile } from "node:fs/promises";

const API = "https://api.ffbb.com";
const CLUB_CODE_GOLFE = "SUD0006008";
const CLUB_CODE_CTC = "SUD0006012";
const OUTPUT = "matchs.json";

  const fields = [
    "id",
    "code",
    "nom",
    "engagements.id",
    "engagements.nom",
    "engagements.idPoule.id",
    "engagements.idPoule.nom",
    "engagements.idCompetition.nom",
    "engagements.idCompetition.saison.actif",
"engagements.numeroEquipe",
"engagements.idCompetition.id",
"engagements.idCompetition.code",
"engagements.idCompetition.sexe",
"engagements.idCompetition.typeCompetition",
"engagements.idCompetition.categorie.code",
"engagements.idCompetition.categorie.ordre",
"engagements.idCompetition.idCompetitionPere.id",
"engagements.idCompetition.idCompetitionPere.nom"
  ];

const queryBaseGolfe = {
    limit: "1",
    "fields[]": fields,
    "deep[engagements][_limit]": "1000",
    "deep[engagements][_filter][idCompetition][saison][actif][_eq]":
      "true",
  };

 const queryBaseCTC = {
    limit: "1",
    "fields[]": fields,
    "deep[engagements][_limit]": "1000",
    "deep[engagements][_filter][idCompetition][saison][actif][_eq]":"true",
    "deep[engagements][_filter][idCompetition][sexe][_eq]":"F",

  };

const token = process.env.FFBB_TOKEN;

if (!token) {
  throw new Error(
    "La variable d'environnement FFBB_TOKEN est absente."
  );
}

async function apiGet(collection, query = {}) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, item);
      }
    } else {
      params.append(key, String(value));
    }
  }

  const url = `${API}/items/${collection}?${params.toString()}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  const text = await response.text();

  let body;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(
      `Réponse non JSON de FFBB (${response.status}) sur ${collection}. ` +
      `Début de réponse : ${text.slice(0, 300)}`
    );
  }

  if (!response.ok || body.errors) {
    throw new Error(
      `Erreur FFBB ${response.status} sur ${collection}: ` +
      JSON.stringify(body.errors ?? body)
    );
  }

  return body.data;
}

function relationId(value) {
  if (value && typeof value === "object") {
    return value.id;
  }
  return value;
}

async function rechercherClub(queryBase, clubCode) {

  console.log(`Recherche du club par code : ${clubCode}`);

  // Le code du club et son identifiant technique peuvent être différents.
  let clubs = await apiGet("ffbbserver_organismes", {
    ...queryBase,
    "filter[code][_eq]": clubCode,
  });

  if (clubs?.length) {
    console.log("Club trouvé grâce au champ code.");
    return clubs[0];
  }

  console.log(
    "Aucun résultat par code. Nouvelle tentative par identifiant technique..."
  );

  clubs = await apiGet("ffbbserver_organismes", {
    ...queryBase,
    "filter[id][_eq]": clubCode,
  });

  if (clubs?.length) {
    console.log("Club trouvé grâce au champ id.");
    return clubs[0];
  }

  // Diagnostic complémentaire : examiner quelques organismes visibles.
  console.log(
    "Aucun résultat avec code ou id. Lecture de quelques organismes accessibles..."
  );

  const exemples = await apiGet("ffbbserver_organismes", {
    limit: "5",
    "fields[]": ["id", "code", "nom"],
  });

  console.log(
    "Exemples d'organismes retournés :",
    JSON.stringify(exemples, null, 2)
  );

  throw new Error(
    `Club ${clubCode} introuvable par code ou par id. ` +
    "Consulte les exemples affichés pour vérifier les champs disponibles."
  );
}

async function main() {
  const clubGolfe = await rechercherClub(queryBaseGolfe, CLUB_CODE_GOLFE);
  console.log(
    `Club trouvé : ${clubGolfe.nom} (id=${clubGolfe.id}, code=${clubGolfe.code})`
  );
  const clubCtc = await rechercherClub(queryBaseCTC, CLUB_CODE_CTC);
  console.log(
    `Club trouvé : ${clubCtc.nom} (id=${clubCtc.id}, code=${clubCtc.code})`
  );

  const matches = new Map();

  await rechercherRencontres(matches,clubGolfe,CLUB_CODE_GOLFE);
  await rechercherRencontres(matches,clubCtc,CLUB_CODE_CTC);

  const rencontres = [...matches.values()].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );
  //const rencontres = { ...rencontresGolfe, ...rencontresCTC };

  const resultat = {
   /* club: club.nom,
    codeClub: club.code,*/
    genereLe: new Date().toISOString(),
    nombreRencontres: rencontres.length,
    rencontres,
  };
  
  console.log(
    `${rencontres.length} rencontres écrites dans ${OUTPUT}.`
  );

  await writeFile(
    OUTPUT,
    JSON.stringify(resultat, null, 2),
    "utf8"
  );

}

async function rechercherRencontres(matches,club,clubCode) {

  const engagements = club.engagements ?? [];
console.log(
  [...new Set(
    engagements.map(e => e.idCompetition?.nom).filter(Boolean)
  )].sort().join("\n")
);

 console.log(`${engagements.length} engagements trouvés.`);

  const pools = new Map();

  for (const engagement of engagements) {
    const poolId = relationId(engagement.idPoule);
    if (!poolId) continue;

    const poolKey = String(poolId);
const competition = engagement.idCompetition;

const categorie =
  competition?.idCompetitionPere?.nom ??
  competition?.nom ??
  "";

    if (!pools.has(poolKey)) {
      pools.set(poolKey, {
  id: poolKey,
  nom:
    typeof engagement.idPoule === "object"
      ? engagement.idPoule.nom ?? ""
      : "",
  competition: categorie,
});
    }
  }


  for (const pool of pools.values()) {
    console.log(
      `Lecture de la poule ${pool.nom || pool.id}...`
    );

    const poolData = await apiGet(
      `ffbbserver_poules/${encodeURIComponent(pool.id)}`,
      {
        "fields[]": [
          "id",
          "nom",
          "rencontres.id",
          "rencontres.numero",
          "rencontres.numeroJournee",
          "rencontres.date_rencontre",
          "rencontres.nomEquipe1",
          "rencontres.nomEquipe2",
          "rencontres.resultatEquipe1",
          "rencontres.resultatEquipe2",
          "rencontres.joue",
          "rencontres.idEngagementEquipe1.id",
          "rencontres.idEngagementEquipe1.idOrganisme.code",
          "rencontres.idEngagementEquipe2.id",
          "rencontres.idEngagementEquipe2.idOrganisme.code",
          "rencontres.salle.libelle",
          "rencontres.salle.commune.libelle",
        ],
        "deep[rencontres][_limit]": "1000",
        "deep[rencontres][_sort]": "date_rencontre",
        "deep[rencontres][_filter][saison][actif][_eq]": "true",
      }
    );

    // Un endpoint /items/collection/id renvoie normalement un objet.
    const poule = Array.isArray(poolData)
      ? poolData[0]
      : poolData;

    if (!poule) {
      console.warn(`Poule ${pool.id} introuvable ou inaccessible.`);
      continue;
    }

    for (const match of poule.rencontres ?? []) {
      const code1 =
        match.idEngagementEquipe1?.idOrganisme?.code;
      const code2 =
        match.idEngagementEquipe2?.idOrganisme?.code;

      if (code1 !== clubCode && code2 !== clubCode) {
        continue;
      }

      if (!match.date_rencontre) continue;

      const salle = match.salle;
      const id = String(match.id);

      matches.set(id, {
        id,
	categorie: pool.competition,
        date: match.date_rencontre,
        journee: match.numeroJournee ?? null,
        numero: match.numero ?? null,
        domicile: match.nomEquipe1 ?? "",
        exterieur: match.nomEquipe2 ?? "",
        scoreDomicile: match.resultatEquipe1 ?? null,
        scoreExterieur: match.resultatEquipe2 ?? null,
        joue: match.joue ?? false,
        clubDomicile: code1 === clubCode,
        poule: poule.nom ?? pool.nom,
        salle: salle?.libelle ?? null,
        ville: salle?.commune?.libelle ?? null,
      });
    }
  }
  
}

main().catch((error) => {
  console.error("Échec de génération du calendrier :", error.message);
  process.exitCode = 1;
});
