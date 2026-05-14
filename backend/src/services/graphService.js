const neo4jService = require('../config/neo4j');
const aiService = require('./aiService');

class GraphService {
  /**
   * Extracts entities and relationships from text using LLM and stores them in Neo4j
   */
  async extractAndStoreGraph(text, metadata = {}) {
    if (!neo4jService.available) return;

    try {
      const prompt = `
        Extract key entities and their relationships from the following text.
        Return ONLY a JSON object with this structure:
        {
          "entities": [{"name": "string", "type": "string"}],
          "relationships": [{"source": "string", "target": "string", "type": "string"}]
        }
        
        Text: "${text.substring(0, 2000)}"
      `;

      let response = '';
      for await (const chunk of aiService.streamResponse([{ role: 'user', content: prompt }], null, "You are a Knowledge Graph Extractor. Output raw JSON only.")) {
        response += chunk;
      }

      // Parse JSON from response (handle potential markdown formatting)
      const jsonStr = response.match(/\{[\s\S]*\}/)?.[0] || response;
      const graphData = JSON.parse(jsonStr);

      if (graphData.entities && graphData.relationships) {
        await this.storeGraphData(graphData, metadata);
      }
    } catch (err) {
      console.error('Graph extraction failed:', err.message);
    }
  }

  async storeGraphData(data, metadata) {
    const { entities, relationships } = data;
    const session = neo4jService.driver.session();

    try {
      await session.executeWrite(async tx => {
        // Create Entities
        for (const entity of entities) {
          await tx.run(
            `MERGE (e:Entity {name: $name})
             SET e.type = $type, e.last_updated = datetime(), e.document_id = $docId`,
            { name: entity.name, type: entity.type, docId: metadata.document_id }
          );
        }

        // Create Relationships
        for (const rel of relationships) {
          await tx.run(
            `MATCH (a:Entity {name: $source}), (b:Entity {name: $target})
             MERGE (a)-[r:RELATED {type: $relType}]->(b)
             SET r.last_updated = datetime(), r.document_id = $docId`,
            { source: rel.source, target: rel.target, relType: rel.type, docId: metadata.document_id }
          );
        }
      });
    } finally {
      await session.close();
    }
  }

  async getGraphData() {
    if (!neo4jService.available) return { nodes: [], links: [] };

    const query = `
      MATCH (n:Entity)-[r:RELATED]->(m:Entity)
      RETURN n.name as source_name, n.type as source_type, 
             m.name as target_name, m.type as target_type, 
             r.type as rel_type
      LIMIT 100
    `;

    const result = await neo4jService.runQuery(query);
    if (!result) return { nodes: [], links: [] };

    const nodesMap = new Map();
    const links = [];

    result.records.forEach(record => {
      const source = record.get('source_name');
      const target = record.get('target_name');
      
      if (!nodesMap.has(source)) nodesMap.set(source, { id: source, type: record.get('source_type') });
      if (!nodesMap.has(target)) nodesMap.set(target, { id: target, type: record.get('target_type') });
      
      links.push({
        source,
        target,
        label: record.get('rel_type')
      });
    });

    return {
      nodes: Array.from(nodesMap.values()),
      links
    };
  }
}

const graphService = new GraphService();
module.exports = graphService;
