import {
  type ChatInputCommandInteraction,
  type Client,
  type Collection,
  Events,
  type Interaction,
} from "discord.js";
import type { CommandModule } from "../types.js";

export default {
  name: Events.InteractionCreate,
  once: false as const,

  async execute(
    client: Client,
    interaction: Interaction,
    commands: Collection<string, CommandModule>
  ) {
    if (!interaction.isChatInputCommand()) {
      return;
    }

    const command = commands.get(interaction.commandName);
    if (!command) {
      return;
    }

    try {
      await command.execute(interaction as ChatInputCommandInteraction);
    } catch (error) {
      console.error(`❌ Error executing ${interaction.commandName}:`, error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: "There was an error.",
          flags: "Ephemeral",
        });
      } else {
        await interaction.reply({
          content: "There was an error.",
          flags: "Ephemeral",
        });
      }
    }
  },
};
