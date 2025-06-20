import fs from "node:fs";
import path from "node:path";
import { Client, Collection, Events, GatewayIntentBits } from "discord.js";
import env from "./config/env.js";
import type { CommandModule } from "./types.js";
import { fileURLToPath } from "url";
import { client as mongoClient } from "./config/db.js";
import { setDefaultResultOrder } from "dns";

setDefaultResultOrder("ipv4first");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

if (process.env.NODE_ENV !== "production" && (import.meta as any).hot) {
  (import.meta as any).hot.accept();
  (import.meta as any).hot.dispose(() => {
    client.removeAllListeners(Events.MessageCreate);
    client.removeAllListeners(Events.VoiceStateUpdate);
    console.log("✅ All event listeners removed from client.");
  });
}

const commands = new Collection<string, CommandModule>();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".ts") || file.endsWith(".js"));

await Promise.all(
  commandFiles.map(async (file) => {
    const filePath = path.join(commandsPath, file);
    const commandModule = await import(filePath);
    const command: CommandModule =
      commandModule.default || Object.values(commandModule)[0];
    if (!command?.data?.name || typeof command.execute !== "function") return;
    commands.set(command.data.name, command);
  })
);

const eventsPath = path.join(__dirname, "events");
const eventFiles = fs
  .readdirSync(eventsPath)
  .filter((file) => file.endsWith(".ts") || file.endsWith(".js"));

await Promise.all(
  eventFiles.map(async (file) => {
    const filePath = path.join(eventsPath, file);
    const eventModule = await import(filePath);
    const event = eventModule.default;
    if (!event) return;
    if (event.once) {
      client.once(event.name, (...args: unknown[]) =>
        event.execute(client, ...args, commands)
      );
    } else {
      client.on(event.name, (...args: unknown[]) =>
        event.execute(client, ...args, commands)
      );
    }
    console.log(
      `✅ Registered event: ${event.name} (${event.once ? "once" : "on"})`
    );
  })
);

(async () => {
  try {
    // Connect to MongoDB on bot init
    console.log("[MongoDB] Connecting client on bot init...");
    await mongoClient.connect();
    console.log("[MongoDB] Client connected on bot init.");
    // Ping the MongoDB server to verify connection
    try {
      const pingResult = await mongoClient.db().command({ ping: 1 });
      console.log("[MongoDB] Ping result:", pingResult);
    } catch (pingError) {
      console.error("[MongoDB] Ping failed:", pingError);
    }
    await client.login(env.DISCORD_TOKEN);
  } catch (loginError) {
    console.error("❌ Login failed:", loginError);
    process.exit(1);
  }
})();
