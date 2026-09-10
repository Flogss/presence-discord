import { config } from "./config.js";

let assetIndex = null;

/**
 * Les assets uploades dans le portail developpeur sont identifies par un
 * snowflake. Le nom lisible ("stake") n'est resolu que par le client officiel
 * dans certains contextes ; envoyer directement l'id est toujours accepte.
 */
async function nameToAssetId(name) {
  if (!assetIndex) {
    const res = await fetch(
      `${config.apiBase}/oauth2/applications/${config.applicationId}/assets`,
    );
    if (!res.ok) {
      throw new Error(`liste des assets : ${res.status} ${res.statusText}`);
    }
    assetIndex = new Map(
      (await res.json()).map((asset) => [asset.name.toLowerCase(), asset.id]),
    );
  }

  const id = assetIndex.get(name.toLowerCase());
  if (!id) {
    const known = [...assetIndex.keys()].join(", ") || "aucun";
    throw new Error(
      `aucun asset nomme "${name}" dans l'application (disponibles : ${known})`,
    );
  }
  return id;
}

/**
 * Discord n'accepte pas une URL brute comme image de Rich Presence : il faut
 * d'abord la faire passer par son proxy media, qui renvoie un chemin interne
 * du type `external/<hash>/https/exemple.com/logo.png`. On prefixe ensuite ce
 * chemin par `mp:` pour obtenir un identifiant d'asset utilisable.
 *
 * Si l'URL est deja un asset (nom uploade dans l'application Discord ou chaine
 * commencant par `mp:`), on la renvoie telle quelle.
 */
export async function resolveImage(url) {
  if (!url) return null;
  if (url.startsWith("mp:") || /^\d{17,20}$/.test(url)) return url;
  if (!/^https?:\/\//i.test(url)) return nameToAssetId(url);

  const res = await fetch(
    `${config.apiBase}/applications/${config.applicationId}/external-assets`,
    {
      method: "POST",
      headers: {
        Authorization: config.token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ urls: [url] }),
    },
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`external-assets ${res.status} ${res.statusText} ${body}`);
  }

  const [asset] = await res.json();
  if (!asset?.external_asset_path) {
    throw new Error(`Reponse inattendue de external-assets pour ${url}`);
  }
  return `mp:${asset.external_asset_path}`;
}
