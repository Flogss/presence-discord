import http from "node:http";
import { config } from "./config.js";
import { PresenceClient } from "./gateway.js";

const client = new PresenceClient();
client.start();

// Railway coupe les services web sans port ouvert : petit endpoint de sante.
const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      status: client.user ? "online" : "connecting",
      user: client.user?.username ?? null,
      activity: `${config.activityName} - ${config.details}`,
      button: { label: config.buttonLabel, url: config.buttonUrl },
    }),
  );
});
server.listen(config.port, () =>
  console.log(`[http] Healthcheck sur le port ${config.port}`),
);

const shutdown = () => {
  console.log("[app] Arret en cours");
  client.destroy();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
process.on("unhandledRejection", (err) =>
  console.error("[app] Rejet non gere :", err),
);
