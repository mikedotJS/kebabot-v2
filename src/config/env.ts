import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DISCORD_TOKEN: z.string({
    required_error: "DISCORD_TOKEN is required in .env file",
  }),
  CLIENT_ID: z.string({
    required_error: "CLIENT_ID is required in .env file",
  }),
  GUILD_ID: z.string({
    required_error: "GUILD_ID is required in .env file",
  }),
  TRIVIA_CHANNEL_ID: z.string({
    required_error: "TRIVIA_CHANNEL_ID is required in .env file",
  }),
  WEEKLY_ANNOUNCEMENTS_CHANNEL_ID: z.string({
    required_error: "WEEKLY_ANNOUNCEMENTS_CHANNEL_ID is required in .env file",
  }),
  TIMEZONE: z.string().default("Europe/Paris"),
  OPENAI_API_KEY: z.string({
    required_error: "OPENAI_API_KEY is required in .env file",
  }),
});

const env = envSchema.parse(process.env);

export default env;
