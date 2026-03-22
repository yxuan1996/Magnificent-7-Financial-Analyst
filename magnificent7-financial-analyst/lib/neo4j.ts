import neo4j, { type Driver } from "neo4j-driver";

// Singleton pattern – one driver for the entire app lifetime
let driver: Driver | null = null;

export function getNeo4jDriver(): Driver {
  if (!driver) {
    driver = neo4j.driver(
      process.env.NEO4J_URI!,
      neo4j.auth.basic(
        process.env.NEO4J_USERNAME!,
        process.env.NEO4J_PASSWORD!
      )
    );
  }
  return driver;
}

/**
 * Helper to run a single Cypher query and return all records.
 * Opens a session, runs the query, closes the session.
 */
export async function runQuery(
  cypher: string,
  params: Record<string, unknown> = {}
): Promise<Record<string, unknown>[]> {
  const session = getNeo4jDriver().session();
  try {
    const result = await session.run(cypher, params);
    // Convert Neo4j Records to plain JS objects
    return result.records.map((record) => record.toObject());
  } finally {
    await session.close();
  }
}
