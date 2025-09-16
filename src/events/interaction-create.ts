import {
  type ChatInputCommandInteraction,
  type Client,
  type Collection,
  Events,
  type Interaction,
  type ModalSubmitInteraction,
} from "discord.js";
import type { CommandModule } from "../types.js";
import { queryCollection } from "../config/db.js";
import type { CoCCharacter } from "../features/coc-characters.js";

export default {
  name: Events.InteractionCreate,
  once: false as const,

  async execute(
    client: Client,
    interaction: Interaction,
    commands: Collection<string, CommandModule>
  ) {
    // Handle chat input commands
    if (interaction.isChatInputCommand()) {
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
    }

    // Handle modal submissions
    if (interaction.isModalSubmit()) {
      if (interaction.customId === "character_backstory") {
        await handleBackstoryModalSubmit(interaction);
      }
    }
  },
};

async function handleBackstoryModalSubmit(interaction: ModalSubmitInteraction) {
  await interaction.deferReply({ ephemeral: true });

  try {
    // Extract field values from the modal
    const personalDescription = interaction.fields.getTextInputValue(
      "personal_description"
    );
    const ideologyBeliefs =
      interaction.fields.getTextInputValue("ideology_beliefs");
    const significantPeople =
      interaction.fields.getTextInputValue("significant_people");
    const meaningfulLocations = interaction.fields.getTextInputValue(
      "meaningful_locations"
    );
    const treasuredPossessions = interaction.fields.getTextInputValue(
      "treasured_possessions"
    );

    // Update character in database
    await queryCollection<void, CoCCharacter>(
      "coc_characters",
      async (collection) => {
        await collection.updateOne(
          { userId: interaction.user.id },
          {
            $set: {
              personalDescription,
              ideologyBeliefs,
              significantPeople,
              meaningfulLocations,
              treasuredPossessions,
              updatedAt: new Date(),
            },
          }
        );
      }
    );

    // Create a summary of what was updated
    const updatedFields = [];
    if (personalDescription.trim()) updatedFields.push("Personal Description");
    if (ideologyBeliefs.trim()) updatedFields.push("Ideology & Beliefs");
    if (significantPeople.trim()) updatedFields.push("Significant People");
    if (meaningfulLocations.trim()) updatedFields.push("Meaningful Locations");
    if (treasuredPossessions.trim())
      updatedFields.push("Treasured Possessions");

    let responseMessage = "✅ **Character backstory updated!**";

    if (updatedFields.length > 0) {
      responseMessage += `\n\n**Updated fields:**\n• ${updatedFields.join(
        "\n• "
      )}`;
    } else {
      responseMessage += "\n\n*All backstory fields cleared.*";
    }

    responseMessage +=
      "\n\nUse `/character show` to view your updated character sheet.";

    await interaction.editReply({
      content: responseMessage,
    });
  } catch (error) {
    console.error("Backstory modal submission error:", error);
    await interaction.editReply({
      content: "❌ Failed to update character backstory. Please try again.",
    });
  }
}
