const { spawn } = require("node:child_process");
const net = require("node:net");

const ROOT_DIR = process.cwd();
const POSTGRES_HOST = "127.0.0.1";
const POSTGRES_PORT = 5432;
const POSTGRES_TIMEOUT_MS = 60_000;

const children = [];

// Lance une commande et affiche directement sa sortie dans le terminal courant.
function runCommand(label, command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: ROOT_DIR,
    shell: true,
    stdio: "inherit",
    ...options,
  });

  children.push(child);

  child.on("exit", (code) => {
    if (code && code !== 0) {
      console.error(`[${label}] La commande s'est arretee avec le code ${code}.`);
    }
  });

  return child;
}

// Attend que PostgreSQL accepte les connexions avant de lancer l'API.
function waitForPostgres() {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const testConnection = () => {
      const socket = net.createConnection(POSTGRES_PORT, POSTGRES_HOST);

      socket.once("connect", () => {
        socket.end();
        resolve();
      });

      socket.once("error", () => {
        socket.destroy();

        if (Date.now() - startedAt > POSTGRES_TIMEOUT_MS) {
          reject(new Error("PostgreSQL ne repond pas sur le port 5432."));
          return;
        }

        setTimeout(testConnection, 1_000);
      });
    };

    testConnection();
  });
}

// Arrete proprement les processus Node lances par ce script quand l'utilisateur fait Ctrl+C.
function stopChildren() {
  for (const child of children) {
    if (!child.killed) {
      child.kill();
    }
  }
}

process.on("SIGINT", () => {
  stopChildren();
  process.exit(0);
});

process.on("SIGTERM", () => {
  stopChildren();
  process.exit(0);
});

async function main() {
  console.log("[M Group] Demarrage de PostgreSQL avec Docker...");
  const docker = runCommand("DB", "docker", ["compose", "up", "-d", "postgres"]);

  await new Promise((resolve, reject) => {
    docker.once("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error("Docker Compose n'a pas pu demarrer PostgreSQL."));
      }
    });
  });

  console.log("[M Group] Attente de PostgreSQL...");
  await waitForPostgres();

  console.log("[M Group] PostgreSQL est pret. Lancement de l'API et du frontend...");
  runCommand("API", "npm", ["run", "server:dev"]);
  runCommand("WEB", "npm", ["run", "client:dev"]);
}

main().catch((error) => {
  console.error(`[M Group] ${error.message}`);
  stopChildren();
  process.exit(1);
});
