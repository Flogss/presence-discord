import { config } from "./config.js";

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
  if (url.startsWith("mp:") || !/^https?:\/\//i.test(url)) return url;

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
