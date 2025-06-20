import {
  type Collection,
  MongoClient,
  ServerApiVersion,
  type Document,
} from "mongodb";
import env from "./env.js";

const uri = env.MONGODB_URI;
const databaseName = env.MONGODB_DATABASE_NAME;

export const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  tls: true,
});

let isConnected = false;

export async function queryCollection<T, U extends Document>(
  collectionName: string,
  queryFn: (collection: Collection<U>) => Promise<T>
): Promise<T> {
  try {
    console.log(`[MongoDB] queryCollection called for: ${collectionName}`);
    if (!isConnected) {
      console.log("[MongoDB] Connecting client...");
      await client.connect();
      isConnected = true;
      console.log("[MongoDB] Client connected.");
    }
    const db = client.db(databaseName);
    const collection = db.collection<U>(collectionName);
    return await queryFn(collection);
  } catch (error) {
    console.error(`Failed to query collection \"${collectionName}\":`, error);
    throw error;
  }
}

// Graceful shutdown for MongoDB client
const shutdownHandler = async () => {
  if (isConnected) {
    console.log("[MongoDB] Closing client connection...");
    await client.close();
    isConnected = false;
    console.log("[MongoDB] Client connection closed.");
  }
  process.exit(0);
};

process.on("SIGINT", shutdownHandler);
process.on("SIGTERM", shutdownHandler);
