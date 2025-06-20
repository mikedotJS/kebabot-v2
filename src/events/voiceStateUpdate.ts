import {
  type Client,
  type Collection,
  Events,
  type VoiceState,
} from "discord.js";
import { incrementContribution } from "../features/contributions.js";
import type { CommandModule } from "../types.js";

export default {
  name: Events.VoiceStateUpdate,
  once: false as const,

  async execute(
    client: Client,
    oldState: VoiceState,
    newState: VoiceState,
    commands: Collection<string, CommandModule>
  ) {
    if (!oldState.channel && newState.channel) {
      console.log(
        `[VoiceStateUpdate] ${newState.id} joined ${newState.channelId}`
      );
      await incrementContribution(newState.id);
    }
  },
};
