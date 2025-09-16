import { type Client, Events } from "discord.js";
import { initSchedulers } from "../scheduler/index.js";

export default {
  name: Events.ClientReady,
  once: true as const,

  async execute(client: Client) {
    console.log(`✅ Logged in as ${client.user?.tag}`);
    initSchedulers(client);
  },
};
