import { promises as fs } from "fs";
import https from "https";

const API = "https://api.ffbb.com";
const CLUB_CODE_GOLFE = "SUD0006008";
const CLUB_CODE_CTC = "SUD0006012";
const OUTPUT = "matchs.json";

const engagements_golfe = [
  "1/16 COUPE Sud U18M",
  "COUPE Sud Senior Masculin 1er tour",
  "Départementale Masculine U15-2 Phase 2",
  "Départementale masculine U11",
  "Départementale masculine U11 - 3 phase ",
  "Départementale masculine U11 - Division 3",
  "Départementale masculine U13 - 2 poule B phase 2",
  "Départementale masculine U13-2 poule A phase 2 ",
  "Départementale masculine U18-2 phase 2 ",
  "NATIONALE MASCULINE 3",
  "Phase 1 - Départemental Masculine U18 Division - 3",
  "Phase 1 - Départementale masculine U13 - 3",
  "Phase 1 - Départementale masculine U15 - 2",
  "Phase 1 - Pré Région masculine U18",
  "Phase 1 - Pré région masculine U13 - 1",
  "Pré nationale masculine",
  "Pré régional masculine U13 phase 2 ",
  "Pré régionale masculine",
  "Pré régionale masculine U11 ",
  "Pré régionale masculine U18 phase 2 ",
  "Régionale masculine U13",
  "Régionale masculine U13 - Phase 2",
  "Régionale masculine U15",
  "Régionale masculine U15 - Phase 2",
  "Régionale masculine U18 - Division 2",
  "Régionale masculine U21",
];

const engagements_ctc = [
  "1/4 COUPE Sud Senior Féminine ",
  "1/4 COUPE Sud U18F ",
  "1/8 COUPE Sud Senior Féminine ",
  "1/8 COUPE Sud U18F ",
  "AMICAL NF1",
  "Départementale féminine U11",
  "Départementale féminine U13 - Division 2",
  "Départementale féminine U15",
  "Départementale féminine U18",
  "NATIONALE FEMININE 2",
  "Pré nationale féminine",
  "Pré régionale féminine",
  "Régionale féminine U13",
  "Régionale féminine U13 - Division 2",
  "Régionale féminine U15",
  "Régionale féminine U15 - Phase 2",
  "Régionale féminine U18",
  "Régionale féminine U18 - Phase 2",
];

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
  "engagements.idCompetition.idCompetitionPere.nom",
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
  "deep[engagements][_filter][idCompetition][saison][actif][_eq]":
    "true",
  "deep[engagements][_filter][idCompetition][sexe][_eq]": "F",
};

const token = process.env.FFBB_TOKEN;

if (!token) {
  throw new Error(
    "La variable d'environnement FFBB_TOKEN est absente."
  );
}

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(
      url,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      },
      (response) => {
        let text = "";

        response.setEncoding("utf8");

        response.on("data", (chunk) => {
          text += chunk;
        });

        response.on("end", () => {
          const status = response.statusCode || 0;

          resolve({
            status,
            ok: status >= 200 && status < 300,
            text,
          });
        });
      }
    );

    request.on("error", reject);
  });
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
  const response = await httpsGet(url);
  const text = response.text;

  let body;

  try {
    body = JSON.parse(text);
  } catch (error) {
    throw new Error(
      `Réponse non JSON de FFBB (${response.status}) sur ${collection}. ` +
      `Début de réponse : ${text.slice(0, 300)}`
    );
  }

  if (!response.ok || body.errors) {
    const errorDetails =
      body.errors != null ? body.errors : body;

    throw new Error(
      `Erreur FFBB ${response.status} sur ${collection}: ` +
      JSON.stringify(errorDetails)
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

  if (clubs && clubs.length) {
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

  if (clubs && clubs.length) {
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
  const clubGolfe = await rechercherClub(
    queryBaseGolfe,
    CLUB_CODE_GOLFE
  );

  console.log(
    `Club trouvé : ${clubGolfe.nom} (id=${clubGolfe.id}, code=${clubGolfe.code})`
  );

  const clubCtc = await rechercherClub(
    queryBaseCTC,
    CLUB_CODE_CTC
  );

  console.log(
    `Club trouvé : ${clubCtc.nom} (id=${clubCtc.id}, code=${clubCtc.code})`
  );

  const matches = new Map();

  await rechercherRencontres(
    matches,
    clubGolfe,
    CLUB_CODE_GOLFE,
    engagements_golfe
  );

  await rechercherRencontres(
    matches,
    clubCtc,
    CLUB_CODE_CTC,
    engagements_ctc
  );

  const rencontres = [...matches.values()].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  const resultat = {
    genereLe: new Date().toISOString(),
    nombreRencontres: rencontres.length,
    rencontres,
  };

  console.log(
    `${rencontres.length} rencontres écrites dans ${OUTPUT}.`
  );

  await fs.writeFile(
    OUTPUT,
    JSON.stringify(resultat, null, 2),
    "utf8"
  );
}

async function rechercherRencontres(
  matches,
  club,
  clubCode,
  engagements_connus
) {
  const engagements = club.engagements || [];

  // Création d'un Set pour accélérer les recherches.
  const engagementsConnus = new Set(engagements_connus);

  console.log(
    `${engagements.length} engagements trouvés pour ${club.nom}.`
  );

  const pools = new Map();

  for (const engagement of engagements) {
    // Vérification des engagements récupérés depuis l'API.
    const nomEngagement =
      engagement.idCompetition &&
      engagement.idCompetition.nom;

    if (
      nomEngagement &&
      !engagementsConnus.has(nomEngagement)
    ) {
      console.warn(
        `[ENGAGEMENT INCONNU] Engagement absent de engagements_golfe : "${nomEngagement}"`
      );
    }

    const poolId = relationId(engagement.idPoule);

    if (!poolId) continue;

    const poolKey = String(poolId);
    const competition = engagement.idCompetition;

    const categorie =
      (competition &&
        competition.idCompetitionPere &&
        competition.idCompetitionPere.nom) ||
      (competition && competition.nom) ||
      "";

    if (!pools.has(poolKey)) {
      pools.set(poolKey, {
        id: poolKey,
        nom:
          typeof engagement.idPoule === "object"
            ? engagement.idPoule.nom || ""
            : "",
        competition: categorie,
      });
    }
  }

  for (const pool of pools.values()) {
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
      console.warn(
        `Poule ${pool.id} introuvable ou inaccessible.`
      );
      continue;
    }

    for (const match of poule.rencontres || []) {
      const engagementEquipe1 = match.idEngagementEquipe1;
      const engagementEquipe2 = match.idEngagementEquipe2;

      const organisme1 =
        engagementEquipe1 && engagementEquipe1.idOrganisme;

      const organisme2 =
        engagementEquipe2 && engagementEquipe2.idOrganisme;

      const code1 = organisme1 && organisme1.code;
      const code2 = organisme2 && organisme2.code;

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
        journee:
          match.numeroJournee != null
            ? match.numeroJournee
            : null,
        numero:
          match.numero != null ? match.numero : null,
        domicile:
          match.nomEquipe1 != null ? match.nomEquipe1 : "",
        exterieur:
          match.nomEquipe2 != null ? match.nomEquipe2 : "",
        scoreDomicile:
          match.resultatEquipe1 != null
            ? match.resultatEquipe1
            : null,
        scoreExterieur:
          match.resultatEquipe2 != null
            ? match.resultatEquipe2
            : null,
        joue: match.joue != null ? match.joue : false,
        clubDomicile: code1 === clubCode,
        poule: poule.nom != null ? poule.nom : pool.nom,
        salle:
          salle && salle.libelle != null
            ? salle.libelle
            : null,
        ville:
          salle &&
          salle.commune &&
          salle.commune.libelle != null
            ? salle.commune.libelle
            : null,
      });
    }
  }
}

main().catch((error) => {
  console.error(
    "Échec de génération du calendrier :",
    error.message
  );

  process.exitCode = 1;
});