import neo4j from "neo4j-driver";

const driver = neo4j.driver(
  process.env.NEO4J_URI!,
  neo4j.auth.basic(process.env.NEO4J_USER!, process.env.NEO4J_PASSWORD!)
);

function sanitize(relationship: string): string {
  return relationship.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase().trim();
}

export async function upsert(
  collectionId: string,
  from: string,
  to: string,
  relationship: string,
  chunkId: string
) {
  const session = driver.session();

  const sanitizedFrom = sanitize(from);
  const sanitizedTo = sanitize(to);
  const relationshipType = sanitize(relationship);

  const query = `
    MERGE (from:Node {name: $from, collectionId: $collectionId})
    ON CREATE SET from.chunkIds = [$chunkId]
    ON MATCH SET from.chunkIds = 
      CASE 
        WHEN $chunkId IN COALESCE(from.chunkIds, []) 
        THEN from.chunkIds 
        ELSE COALESCE(from.chunkIds, []) + [$chunkId] 
      END
    MERGE (to:Node {name: $to, collectionId: $collectionId})
    ON CREATE SET to.chunkIds = [$chunkId]
    ON MATCH SET to.chunkIds = 
      CASE 
        WHEN $chunkId IN COALESCE(to.chunkIds, []) 
        THEN to.chunkIds 
        ELSE COALESCE(to.chunkIds, []) + [$chunkId] 
      END
    MERGE (from)-[r:\`${relationshipType}\`]->(to)
    ON CREATE SET r.updatedAt = $timestamp, r.collectionId = $collectionId
    ON MATCH SET r.updatedAt = $timestamp, r.collectionId = $collectionId
    RETURN r
  `;

  await session.run(query, {
    collectionId,
    from: sanitizedFrom,
    to: sanitizedTo,
    chunkId,
    timestamp: Date.now(),
  });

  await session.close();
}

export async function getAllNodes(collectionId: string) {
  const session = driver.session();
  const query = `
    MATCH (n:Node {collectionId: $collectionId})
    RETURN n.name
  `;
  const result = await session.run(query, { collectionId });
  const nodes = result.records.map((record) => record.get("n.name"));
  await session.close();
  return nodes;
}

export async function getAllRelationships(
  collectionId: string
): Promise<string[]> {
  const session = driver.session();
  const query = `
    MATCH (n:Node {collectionId: $collectionId})-[r]->(m:Node {collectionId: $collectionId})
    WHERE r.collectionId = $collectionId
    RETURN DISTINCT type(r) as relationshipType
  `;
  const result = await session.run(query, { collectionId });
  const relationships = result.records.map((record) =>
    record.get("relationshipType")
  );
  await session.close();
  return relationships;
}

export async function getNodes(collectionId: string, names: string[]) {
  const session = driver.session();
  const sanitizedNames = names.map((name) => sanitize(name));
  const query = `
    MATCH (n:Node)
    WHERE n.collectionId = $collectionId AND n.name IN $names
    OPTIONAL MATCH (n)-[rOut]->(mOut:Node {collectionId: $collectionId})
    WHERE rOut.collectionId = $collectionId OR rOut IS NULL
    OPTIONAL MATCH (mIn:Node {collectionId: $collectionId})-[rIn]->(n)
    WHERE rIn.collectionId = $collectionId OR rIn IS NULL
    RETURN n.name as name,
           collect(DISTINCT {from: n.name, to: mOut.name, relationship: type(rOut)}) as outgoing,
           collect(DISTINCT {from: mIn.name, to: n.name, relationship: type(rIn)}) as incoming
  `;
  const result = await session.run(query, {
    collectionId,
    names: sanitizedNames,
  });
  await session.close();
  return result.records.map((record) => {
    const name = record.get("name");
    const outgoing = record
      .get("outgoing")
      .filter(
        (rel: any) =>
          rel &&
          rel.from &&
          rel.to &&
          rel.relationship &&
          rel.relationship !== "NULL"
      );
    const incoming = record
      .get("incoming")
      .filter(
        (rel: any) =>
          rel &&
          rel.from &&
          rel.to &&
          rel.relationship &&
          rel.relationship !== "NULL"
      );
    return {
      name,
      outgoing,
      incoming,
    };
  });
}

export async function removeByChunk(collectionId: string, chunkId: string) {
  const session = driver.session();
  const deleteQuery = `
    MATCH (n:Node {collectionId: $collectionId})
    WHERE $chunkId IN n.chunkIds AND size(n.chunkIds) = 1
    DETACH DELETE n
  `;
  await session.run(deleteQuery, { collectionId, chunkId });
  
  const removeQuery = `
    MATCH (n:Node {collectionId: $collectionId})
    WHERE $chunkId IN n.chunkIds AND size(n.chunkIds) > 1
    SET n.chunkIds = [x IN n.chunkIds WHERE x <> $chunkId]
  `;
  await session.run(removeQuery, { collectionId, chunkId });
  
  await session.close();
}