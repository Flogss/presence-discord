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

export const config = {
  token: required("DISCORD_TOKEN"),
  applicationId: required("APPLICATION_ID"),

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
