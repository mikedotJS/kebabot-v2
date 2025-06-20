import type { ChatInputCommandInteraction, Message } from "discord.js";

export type CommandModule = {
	data: { name: string };
	execute: (
		interactionOrMessage: ChatInputCommandInteraction | Message,
		args?: string[],
	) => Promise<void>;
};
