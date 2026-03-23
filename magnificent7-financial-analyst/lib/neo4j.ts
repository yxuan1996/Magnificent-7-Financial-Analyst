import neo4j, { type Driver } from "neo4j-driver";

// Singleton pattern – one driver for the entire app lifetime
let driver: Driver | null = null;

export function getNeo4jDriver(): Driver {
  if (!driver) {
    const uri      = process.env.NEO4J_URI!;
    const username = process.env.NEO4J_USERNAME!;
    const password = process.env.NEO4J_PASSWORD!;

    console.log("[Neo4j] Creating driver →", uri, "| user:", username);
    driver = neo4j.driver(uri, neo4j.auth.basic(username, password));
  }
  return driver;
}

/**
 * Run a Cypher query and return plain JS objects.
 * Logs the query, params, row count, and raw first record for debugging.
 */
export async function runQuery(
  cypher: string,
  params: Record<string, unknown> = {}
): Promise<Record<string, unknown>[]> {
  const session = getNeo4jDriver().session();

  console.log("\n[Neo4j] ─── runQuery ───────────────────────────────");
  console.log("[Neo4j] Cypher:\n", cypher.trim());
  console.log("[Neo4j] Params:", JSON.stringify(params, null, 2));

  try {
    const result = await session.run(cypher, params);
    const rows   = result.records.map((r) => r.toObject());

    console.log(`[Neo4j] Rows returned: ${rows.length}`);
    if (rows.length > 0) {
      console.log("[Neo4j] First row sample:", JSON.stringify(rows[0], null, 2));
    } else {
      console.warn("[Neo4j] ⚠  Zero rows — check that the params match actual data in the DB.");
    }

    return rows;
  } catch (err) {
    console.error("[Neo4j] ✗ Query error:", err);
    throw err;
  } finally {
    await session.close();
  }
}

/**
 * Connectivity smoke-test — call this from the test script.
 * Returns the Neo4j server version string if the connection works.
 */
export async function testConnection(): Promise<string> {
  console.log("[Neo4j] Testing connectivity…");
  const session = getNeo4jDriver().session();
  try {
    const result = await session.run("RETURN 1 AS ping");
    const ping   = result.records[0]?.get("ping");
    console.log("[Neo4j] ✓ Connection OK — RETURN 1 →", ping);
    return `ping=${ping}`;
  } catch (err) {
    console.error("[Neo4j] ✗ Connection FAILED:", err);
    throw err;
  } finally {
    await session.close();
  }
}

/**
 * Schema discovery — logs every node label and relationship type present.
 * Useful for verifying the data model matches what the queries expect.
 */
export async function discoverSchema(): Promise<void> {
  console.log("\n[Neo4j] ─── Schema Discovery ──────────────────────");
  const session = getNeo4jDriver().session();
  try {
    // Node labels
    const labelsResult = await session.run("CALL db.labels()");
    const labels = labelsResult.records.map((r) => r.get("label"));
    console.log("[Neo4j] Node labels present:", labels);

    // Relationship types
    const relsResult = await session.run("CALL db.relationshipTypes()");
    const rels = relsResult.records.map((r) => r.get("relationshipType"));
    console.log("[Neo4j] Relationship types present:", rels);

    // Property keys
    const propsResult = await session.run("CALL db.propertyKeys()");
    const props = propsResult.records.map((r) => r.get("propertyKey"));
    console.log("[Neo4j] Property keys present:", props);

    // Row counts per label
    for (const label of labels) {
      const countResult = await session.run(
        `MATCH (n:\`${label}\`) RETURN count(n) AS cnt`
      );
      const cnt = countResult.records[0]?.get("cnt")?.toNumber?.() ?? countResult.records[0]?.get("cnt");
      console.log(`[Neo4j]   ${label}: ${cnt} nodes`);
    }
  } finally {
    await session.close();
  }
}