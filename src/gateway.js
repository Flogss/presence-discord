import WebSocket from "ws";
import { config } from "./config.js";
import { buildPresence } from "./presence.js";

const GATEWAY_URL = "wss://gateway.discord.gg/?v=9&encoding=json";

const OP = {
  DISPATCH: 0,
  HEARTBEAT: 1,
  IDENTIFY: 2,
  PRESENCE_UPDATE: 3,
  RESUME: 6,
  RECONNECT: 7,
  INVALID_SESSION: 9,
  HELLO: 10,
  HEARTBEAT_ACK: 11,
};

// Codes de fermeture qui rendent la session irrecuperable : il faut renvoyer un
// IDENTIFY plutot qu'un RESUME.
const NON_RESUMABLE = new Set([4004, 4010, 4011, 4012, 4013, 4014]);

export class PresenceClient {
  constructor() {
    this.ws = null;
    this.heartbeatTimer = null;
    this.refreshTimer = null;
    this.sequence = null;
    this.sessionId = null;
    this.resumeUrl = null;
    this.acked = true;
    this.attempts = 0;
    this.closed = false;
    this.user = null;
  }

  start() {
    this.connect();
  }

  connect() {
    const url = this.sessionId && this.resumeUrl
      ? `${this.resumeUrl}/?v=9&encoding=json`
      : GATEWAY_URL;

    this.ws = new WebSocket(url);
    this.ws.on("open", () => console.log("[gateway] Connecte"));
    this.ws.on("message", (raw) => this.onMessage(raw));
    this.ws.on("error", (err) => console.error(`[gateway] Erreur : ${err.message}`));
    this.ws.on("close", (code, reason) => this.onClose(code, reason.toString()));
  }

  send(op, d) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ op, d }));
    }
  }

  async onMessage(raw) {
    const payload = JSON.parse(raw.toString());
    const { op, d, s, t } = payload;
    if (s !== null && s !== undefined) this.sequence = s;

    switch (op) {
      case OP.HELLO:
        this.startHeartbeat(d.heartbeat_interval);
        if (this.sessionId) this.resume();
        else await this.identify();
        break;

      case OP.HEARTBEAT:
        this.sendHeartbeat();
        break;

      case OP.HEARTBEAT_ACK:
        this.acked = true;
        break;

      case OP.RECONNECT:
        console.log("[gateway] Discord demande une reconnexion");
        this.ws?.close(4000);
        break;

      case OP.INVALID_SESSION:
        console.log("[gateway] Session invalide, nouvelle identification");
        this.sessionId = null;
        this.resumeUrl = null;
        // Discord impose un court delai avant de renvoyer un IDENTIFY.
        setTimeout(() => this.identify(), 2000 + Math.random() * 3000);
        break;

      case OP.DISPATCH:
        if (t === "READY") {
          this.attempts = 0;
          this.sessionId = d.session_id;
          this.resumeUrl = d.resume_gateway_url;
          this.user = d.user;
          console.log(
            `[gateway] Connecte en tant que ${d.user.username} (${d.user.id})`,
          );
          await this.pushPresence();
          this.startPresenceRefresh();
        } else if (t === "RESUMED") {
          this.attempts = 0;
          console.log("[gateway] Session reprise");
          await this.pushPresence();
        } else if (t === "SESSIONS_REPLACE") {
          // Discord renvoie l'etat reel de toutes tes sessions : c'est le seul
          // moyen, cote serveur, de verifier qu'il a bien accepte l'activite.
          this.reportSessions(d);
        }
        break;
    }
  }

  async identify() {
    this.send(OP.IDENTIFY, {
      token: config.token,
      capabilities: 30717,
      properties: {
        os: "Windows",
        browser: "Chrome",
        device: "",
        system_locale: "fr-FR",
        browser_user_agent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        browser_version: "126.0.0.0",
        os_version: "10",
        referrer: "",
        referring_domain: "",
        release_channel: "stable",
        client_build_number: 306326,
      },
      presence: await buildPresence(),
      compress: false,
      client_state: {
        guild_versions: {},
        highest_last_message_id: "0",
        read_state_version: 0,
        user_guild_settings_version: -1,
        user_settings_version: -1,
        private_channels_version: "0",
        api_code_version: 0,
      },
    });
  }

  resume() {
    console.log("[gateway] Tentative de reprise de session");
    this.send(OP.RESUME, {
      token: config.token,
      session_id: this.sessionId,
      seq: this.sequence,
    });
  }

  reportSessions(sessions = []) {
    console.log(`[diag] ${sessions.length} session(s) Discord ouverte(s) :`);
    for (const s of sessions) {
      const client = s.client_info?.client ?? "?";
      const names = (s.activities ?? []).map((a) => a.name).join(", ") || "aucune";
      console.log(
        `[diag]  - ${client} (${s.status}) : activite = ${names}`,
      );
    }

    const mine = sessions.find((s) => s.session_id === this.sessionId);
    const activity = mine?.activities?.[0];

    if (!activity) {
      console.warn(
        "[diag] Discord a REFUSE l'activite de cette session.",
        "Verifie Parametres > Confidentialite : 'Afficher l'activite en cours'.",
      );
      return;
    }

    console.log(
      `[diag] Activite acceptee : name=${activity.name} details=${activity.details}`,
    );
    console.log(
      `[diag]   image = ${activity.assets?.large_image ?? "AUCUNE"}`,
    );
    console.log(
      `[diag]   boutons = ${JSON.stringify(activity.buttons ?? null)}`,
    );

    const others = sessions.filter(
      (s) => s.session_id !== this.sessionId && s.session_id !== "all",
    );
    if (others.length) {
      console.warn(
        "[diag] D'autres sessions Discord sont ouvertes (client officiel).",
        "Elles peuvent masquer cette presence : ferme-les pour tester.",
      );
    }
  }

  async pushPresence() {
    this.send(OP.PRESENCE_UPDATE, await buildPresence());
    console.log(
      `[presence] "${config.activityName} - ${config.details}" envoyee`,
    );
  }

  startPresenceRefresh() {
    clearInterval(this.refreshTimer);
    // Discord fait parfois expirer une presence restee identique trop longtemps.
    this.refreshTimer = setInterval(() => {
      this.pushPresence().catch((err) =>
        console.error(`[presence] Echec du rafraichissement : ${err.message}`),
      );
    }, 10 * 60 * 1000);
  }

  sendHeartbeat() {
    this.send(OP.HEARTBEAT, this.sequence);
  }

  startHeartbeat(interval) {
    clearInterval(this.heartbeatTimer);
    this.acked = true;
    // Premier battement decale d'un jitter, comme le client officiel.
    setTimeout(() => this.sendHeartbeat(), interval * Math.random());
    this.heartbeatTimer = setInterval(() => {
      if (!this.acked) {
        console.warn("[gateway] Pas d'ACK recu, reconnexion");
        this.ws?.close(4000);
        return;
      }
      this.acked = false;
      this.sendHeartbeat();
    }, interval);
  }

  onClose(code, reason) {
    clearInterval(this.heartbeatTimer);
    clearInterval(this.refreshTimer);
    console.warn(`[gateway] Deconnecte (${code}) ${reason}`);

    if (code === 4004) {
      console.error("[gateway] Token invalide. Verifie DISCORD_TOKEN.");
      process.exit(1);
    }
    if (NON_RESUMABLE.has(code)) {
      this.sessionId = null;
      this.resumeUrl = null;
    }
    if (this.closed) return;

    this.attempts += 1;
    const delay = Math.min(30000, 1000 * 2 ** Math.min(this.attempts, 5));
    console.log(`[gateway] Nouvelle tentative dans ${delay / 1000}s`);
    setTimeout(() => this.connect(), delay);
  }

  destroy() {
    this.closed = true;
    clearInterval(this.heartbeatTimer);
    clearInterval(this.refreshTimer);
    this.ws?.close(1000);
  }
}
