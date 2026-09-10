import { config } from "./config.js";
import { resolveImage } from "./assets.js";

// Instant de demarrage : Discord affiche un chrono "xx:xx ecoule".
const startedAt = Date.now();

let cachedAssets = null;

async function buildAssets() {
  if (cachedAssets) return cachedAssets;

  const assets = {};
  try {
    const large = await resolveImage(config.largeImageUrl);
    if (large) {
      assets.large_image = large;
      assets.large_text = config.largeImageText;
    }
    const small = await resolveImage(config.smallImageUrl);
    if (small) {
      assets.small_image = small;
      assets.small_text = config.smallImageText;
    }
  } catch (err) {
    // Sans image la presence reste valable : on log et on continue.
    console.warn(`[presence] Image ignoree : ${err.message}`);
  }

  cachedAssets = assets;
  return assets;
}

export async function buildPresence({ sessionId } = {}) {
  const assets = await buildAssets();

  const activity = {
    // Le client officiel envoie toujours un id d'activite ; sans lui Discord
    // accepte la session mais jette silencieusement l'activite.
    id: config.applicationId,
    name: config.activityName,
    type: 0, // 0 = "Joue a ..."
    application_id: config.applicationId,
    details: config.details,
    state: config.state,
    timestamps: { start: startedAt },
    assets,
    flags: 0,
    created_at: Date.now(),
  };

  if (sessionId) activity.session_id = sessionId;

  if (config.buttonLabel && config.buttonUrl) {
    activity.buttons = [config.buttonLabel];
    activity.metadata = { button_urls: [config.buttonUrl] };
  }

  return {
    since: 0,
    activities: [activity],
    status: config.status,
    afk: config.afk,
    broadcast: null,
  };
}
