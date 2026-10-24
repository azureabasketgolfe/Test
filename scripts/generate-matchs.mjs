
import { writeFile } from "node:fs/promises";

const API = "https://api.ffbb.com";
const CLUB_ID = "SUD0006008";
const CLUB_CODE = "SUD0006008";
const OUTPUT = "matchs.json";

const token = process.env.FFBB_TOKEN;

if (!token) {
  throw new Error("La variable d'environnement FFBB_TOKEN est absente.");
}


async function apiGet(collection, query = {}) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, item);
      }
    } else {
      params.append(key, value);
    }
  }

  const url = `${API}/items/${collection}?${params.toString()}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    redirect: "follow",
  });

  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();

  console.log(`URL appelée : ${url}`);
  console.log(`HTTP : ${response.status} ${response.statusText}`);
  console.log(`Content-Type : ${contentType}`);

  if (!response.ok) {
    throw new Error(
      `Erreur HTTP ${response.status}. Réponse : ${text.slice(0, 500)}`
    );
  }

  try {
    const body = JSON.parse(text);

    if (body.errors) {
      throw new Error(JSON.stringify(body.errors));
    }

    return body.data;
  } catch (error) {
    console.error("Début de la réponse reçue :", text.slice(0, 500));
    throw new Error(
      `Réponse non JSON reçue pour ${collection}. ` +
      `Content-Type : ${contentType}. Détail : ${error.message}`
    );
  }
}


function relationId(value) {
  if (value && typeof value === "object") return value.id;
  return value;
}

async function main() {
  console.log("Recherche du club...");

  const clubs = await apiGet("ffbbserver_organismes", {
    "filter[id][_eq]": CLUB_ID,
    limit: "1",
    "fields[]": ["id", "nom", "engagements.id",
      "engagements.nom", "engagements.idPoule.id",
      "engagements.idPoule.nom",
      "engagements.idCompetition.nom",
      "engagements.idCompetition.saison.actif"],
    "deep[engagements][_limit]": "1000",
    "deep[engagements][_filter][idCompetition][saison][actif][_eq]":
      "true",
  });

  const club = clubs?.[0];

  if (!club) {
    throw new Error(
      `Club ${CLUB_ID} introuvable. Vérifie son identifiant dans l'API.`
    );
  }

  const engagements = club.engagements ?? [];
  console.log(`${club.nom}: ${engagements.length} engagements trouvés.`);

  const pools = new Map();

  for (const engagement of engagements) {
    const poolId = relationId(engagement.idPoule);
    if (!poolId) continue;

    if (!pools.has(String(poolId))) {
      pools.set(String(poolId), {
        id: String(poolId),
        nom: engagement.idPoule?.nom ?? "",
        equipes: [],
      });
    }

    pools.get(String(poolId)).equipes.push(engagement);
  }

  const matches = new Map();

  for (const pool of pools.values()) {
    console.log(`Lecture de la poule ${pool.nom || pool.id}...`);

    const poules = await apiGet(
      `ffbbserver_poules/${encodeURIComponent(pool.id)}`,
      {
        "fields[]": [
          "id", "nom",
          "rencontres.id", "rencontres.numero",
          "rencontres.numeroJournee",
          "rencontres.date_rencontre",
          "rencontres.nomEquipe1", "rencontres.nomEquipe2",
          "rencontres.resultatEquipe1",
          "rencontres.resultatEquipe2", "rencontres.joue",
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

    const poolData = Array.isArray(poules) ? poules[0] : poules;
    if (!poolData) continue;

    for (const m of poolData.rencontres ?? []) {
      const code1 = m.idEngagementEquipe1?.idOrganisme?.code;
      const code2 = m.idEngagementEquipe2?.idOrganisme?.code;

      // Ne conserver que les rencontres de notre club.
      if (code1 !== CLUB_CODE && code2 !== CLUB_CODE) continue;

      if (!m.date_rencontre) continue;

      const salle = m.salle;
      const id = String(m.id);

      matches.set(id, {
        id,
        date: m.date_rencontre,
        journee: m.numeroJournee ?? null,
        numero: m.numero ?? null,
        domicile: m.nomEquipe1 ?? "",
        exterieur: m.nomEquipe2 ?? "",
        scoreDomicile: m.resultatEquipe1 ?? null,
        scoreExterieur: m.resultatEquipe2 ?? null,
        joue: m.joue ?? false,
        clubDomicile: code1 === CLUB_CODE,
        poule: pool.nom,
        salle: salle?.libelle ?? null,
        ville: salle?.commune?.libelle ?? null,
      });
    }
  }

  const rencontres = [...matches.values()].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  const resultat = {
    club: club.nom,
    codeClub: CLUB_CODE,
    genereLe: new Date().toISOString(),
    nombreRencontres: rencontres.length,
    rencontres,
  };

  await writeFile(OUTPUT, JSON.stringify(resultat, null, 2), "utf8");

  console.log(`${rencontres.length} rencontres écrites dans ${OUTPUT}.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
