import fs from "node:fs";
import path from "node:path";
import { Collection, REST, Routes, type SlashCommandBuilder } from "discord.js";
import env from "./config/env.js";
import type { CommandModule } from "./types.js";
import { fileURLToPath } from "url";

console.log(env);

const commands = new Collection<string, CommandModule>();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".ts") || file.endsWith(".js"));

const rest = new REST({ version: "10" }).setToken(env.DISCORD_TOKEN);

console.log("[DEBUG] deploy-commands.ts script started");

console.log("[DEBUG] Starting to load command files...");

(async () => {
  for (const file of commandFiles) {
    console.log(`[DEBUG] Loading command file: ${file}`);
    const filePath = path.join(commandsPath, file);
    try {
      const commandModule = await import(filePath);
      console.log(`[DEBUG] Successfully imported: ${file}`);
      const command: CommandModule =
        commandModule.default || Object.values(commandModule)[0];
      if (command && command.data && typeof command.execute === "function") {
        commands.set(command.data.name, command);
        console.log(`[DEBUG] Registered command: ${command.data.name}`);
      } else {
        console.log(`[DEBUG] Skipped file (not a valid command): ${file}`);
      }
    } catch (error) {
      console.error(`[DEBUG] Failed to load command file ${file}:`, error);
    }
  }

  console.log(
    `[DEBUG] Loaded ${commands.size} commands. Preparing to register with Discord...`
  );

  try {
    console.log("[DEBUG] Sending commands to Discord API...");
    await rest.put(
      Routes.applicationGuildCommands(env.CLIENT_ID, env.GUILD_ID),
      {
        body: Array.from(commands.values()).map((value) => {
          const data = value.data as { toJSON?: () => unknown };
          if (typeof data.toJSON === "function") {
            return data.toJSON();
          }
          return value.data;
        }),
      }
    );
    console.log("✅ Commands registered!");
  } catch (error) {
    console.error("❌ Failed to register commands:", error);
  }
})();
