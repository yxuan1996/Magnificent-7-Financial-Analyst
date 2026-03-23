import { Pinecone } from "@pinecone-database/pinecone";

// Singleton pattern – reuse the same client across requests
let pineconeClient: Pinecone | null = null;

export function getPineconeClient(): Pinecone {
  if (!pineconeClient) {
    const apiKey = process.env.PINECONE_API_KEY!;
    console.log("[Pinecone] Creating client — API key prefix:", apiKey?.slice(0, 8) + "…");
    pineconeClient = new Pinecone({ apiKey });
  }
  return pineconeClient;
}

export function getPineconeIndex() {
  const indexName = process.env.PINECONE_INDEX_NAME!;
  console.log("[Pinecone] Accessing index:", indexName);
  return getPineconeClient().index(indexName);
}

/**
 * Connectivity smoke-test — lists indexes and describes the target index.
 * Call this from the test script to verify credentials and index existence.
 */
export async function testConnection(): Promise<void> {
  console.log("\n[Pinecone] ─── Connection Test ────────────────────");
  const client    = getPineconeClient();
  const indexName = process.env.PINECONE_INDEX_NAME!;

  try {
    // List all indexes the API key can see
    const { indexes } = await client.listIndexes();
    const names = indexes?.map((i) => i.name) ?? [];
    console.log("[Pinecone] ✓ API key valid — indexes visible:", names);

    const found = names.includes(indexName);
    console.log(
      found
        ? `[Pinecone] ✓ Target index "${indexName}" exists`
        : `[Pinecone] ✗ Target index "${indexName}" NOT FOUND in list above`
    );

    // Describe the index for dimension / metric / stats
    if (found) {
      const desc = await client.describeIndex(indexName);
      console.log("[Pinecone] Index spec:", JSON.stringify(desc, null, 2));

      // Fetch stats (vector count per namespace)
      const index = client.index(indexName);
      const stats = await index.describeIndexStats();
      console.log("[Pinecone] Index stats:", JSON.stringify(stats, null, 2));
    }
  } catch (err) {
    console.error("[Pinecone] ✗ Connection FAILED:", err);
    throw err;
  }
}