const neo4j = require('neo4j-driver');

const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'password';

class Neo4jService {
  constructor() {
    this.driver = null;
    this.available = false;
  }

  async initialize() {
    try {
      this.driver = neo4j.driver(
        NEO4J_URI,
        neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD)
      );
      
      // Verify connection
      await this.driver.verifyConnectivity();
      this.available = true;
      console.log('✅ Neo4j Knowledge Graph connected successfully');
    } catch (err) {
      this.available = false;
      console.log(`⚠️  Neo4j unavailable (${err.message}) - Graph features disabled`);
    }
  }

  async runQuery(query, params = {}) {
    if (!this.available) return null;
    const session = this.driver.session();
    try {
      const result = await session.run(query, params);
      return result;
    } catch (err) {
      console.error('Neo4j Query Error:', err.message);
      return null;
    } finally {
      await session.close();
    }
  }

  async close() {
    if (this.driver) {
      await this.driver.close();
    }
  }
}

const neo4jService = new Neo4jService();
module.exports = neo4jService;
