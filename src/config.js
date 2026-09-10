const bool = (v, fallback) => (v === undefined ? fallback : /^(1|true|yes|on)$/i.test(v));

function required(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`[config] Variable d'environnement manquante : ${name}`);
    console.error("         Ajoute-la dans Railway > ton service > Variables.");
    process.exit(1);
  }
  return value.trim();
}

function fatal(...lines) {
  for (const line of lines) console.error(line);
  process.exit(1);
}

/**
 * La confusion la plus frequente est de coller un identifiant de l'application
 * Discord (token du bot, cle secrete OAuth2) au lieu du token du COMPTE
 * utilisateur. On le detecte ici pour eviter une boucle de 4004.
 */
function checkUserToken(token, applicationId) {
  if (/^Bot\s/i.test(token)) {
    fatal(
      "[config] DISCORD_TOKEN commence par 'Bot ' : c'est un token de bot.",
      "         Un bot ne peut afficher ni image ni bouton de Rich Presence.",
      "         Utilise le token de TON compte utilisateur, sans prefixe.",
    );
  }

  const parts = token.split(".");
  if (parts.length < 3) {
    fatal(
      "[config] DISCORD_TOKEN n'a pas la forme d'un token Discord (xxx.yyy.zzz).",
      "         Tu as probablement colle la 'Cle secrete du client' OAuth2.",
      "         Il faut le token de TON compte utilisateur (onglet Network du navigateur).",
    );
  }

  let decodedId = null;
  try {
    decodedId = Buffer.from(parts[0], "base64").toString("utf8");
  } catch {
    // Segment illisible : on laisse Discord trancher.
  }

  if (decodedId === applicationId) {
    fatal(
      "[config] DISCORD_TOKEN est le token du BOT de l'application " +
        `${applicationId}, pas celui de ton compte.`,
      "         APPLICATION_ID et DISCORD_TOKEN doivent venir de deux endroits",
      "         differents : l'ID depuis le portail developpeur, le token depuis",
      "         ta session Discord (F12 > Network > en-tete Authorization).",
    );
  }

  if (decodedId && !/^\d{17,20}$/.test(decodedId)) {
    console.warn(
      "[config] DISCORD_TOKEN a une forme inhabituelle, la connexion peut echouer.",
    );
  }
}

const token = required("DISCORD_TOKEN");
const applicationId = required("APPLICATION_ID");
checkUserToken(token, applicationId);

export const config = {
  token,
  applicationId,

  activityName: process.env.ACTIVITY_NAME?.trim() || "Stake",
  details: process.env.ACTIVITY_DETAILS?.trim() || "Blackjack",
  state: process.env.ACTIVITY_STATE?.trim() || "Table VIP - stake.com",

  buttonLabel: process.env.BUTTON_LABEL?.trim() || "Jouer avec moi",
  buttonUrl: process.env.BUTTON_URL?.trim() || "https://stake.com/fr",

  largeImageUrl:
    process.env.LARGE_IMAGE_URL?.trim() || "https://stake.com/apple-touch-icon.png",
  largeImageText: process.env.LARGE_IMAGE_TEXT?.trim() || "Stake.com",
  smallImageUrl: process.env.SMALL_IMAGE_URL?.trim() || "",
  smallImageText: process.env.SMALL_IMAGE_TEXT?.trim() || "Blackjack",

  status: process.env.STATUS?.trim() || "online",
  afk: bool(process.env.AFK, false),

  port: Number(process.env.PORT || 3000),
  apiBase: "https://discord.com/api/v9",
};
