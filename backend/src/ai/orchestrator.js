const documentService = require('../services/documentService');
const aiService = require('../services/aiService');

// ── Agent System Prompts ──────────────────────────────────────────────────────
const AGENTS = {
  research: {
    name: 'Research Agent',
    icon: '🔬',
    systemPrompt: `You are a specialized Research Agent with deep analytical capabilities. 
Your role is to analyze documents, extract insights, answer research questions, and provide evidence-based responses.
Always cite context from retrieved documents. Structure responses with clear sections.
Format with markdown: use headings, bullet points, and highlight key findings.`,
    keywords: ['research', 'analyze', 'study', 'investigate', 'find', 'what is', 'how does', 'explain', 'tell me about']
  },
  summary: {
    name: 'Summary Agent',
    icon: '📝',
    systemPrompt: `You are a specialized Summary Agent expert at condensing information.
Create clear, structured summaries with: Key Points, Main Themes, Important Findings, and Actionable Insights.
Use bullet points, numbered lists, and clear headings. Be concise yet comprehensive.`,
    keywords: ['summarize', 'summary', 'brief', 'overview', 'tldr', 'key points', 'main points', 'highlight']
  },
  code: {
    name: 'Code Agent',
    icon: '💻',
    systemPrompt: `You are a specialized Code Agent and expert software engineer.
Help with: writing code, debugging, code review, architecture design, and technical explanations.
Always provide working code examples with proper formatting using markdown code blocks.
Explain the logic clearly and suggest best practices.`,
    keywords: ['code', 'program', 'function', 'debug', 'error', 'bug', 'implement', 'write', 'build', 'develop', 'script', 'algorithm']
  },
  decision: {
    name: 'Decision Agent',
    icon: '🎯',
    systemPrompt: `You are a specialized Decision Agent and strategic advisor.
Help with: roadmaps, planning, startup strategy, product decisions, execution strategies.
Generate structured outputs: PRDs, roadmaps, tech stacks, architecture plans.
Use clear frameworks, numbered steps, and actionable recommendations.`,
    keywords: ['plan', 'roadmap', 'strategy', 'decision', 'startup', 'prd', 'architecture', 'design', 'approach', 'recommend', 'should i']
  },
  general: {
    name: 'General Assistant',
    icon: '🤖',
    systemPrompt: `You are NeuroDesk AI, an intelligent knowledge assistant.
Provide helpful, accurate, and well-structured responses. Use the provided context from documents to give grounded answers.
When context is available, prioritize it over general knowledge. Be conversational yet informative.`,
    keywords: []
  }
};

class AgentOrchestrator {
  detectAgent(query) {
    const lowerQuery = query.toLowerCase();
    for (const [agentType, agent] of Object.entries(AGENTS)) {
      if (agentType === 'general') continue;
      if (agent.keywords.some(kw => lowerQuery.includes(kw))) {
        return agentType;
      }
    }
    return 'general';
  }

  async buildRAGContext(query, userId, documentIds = []) {
    const contextDocs = await documentService.retrieveContext(query, userId, documentIds);
    if (!contextDocs.length) return { contextText: '', sources: [] };

    const contextText = contextDocs
      .map((doc, i) => `[Source ${i + 1}] ${doc.metadata?.title || 'Document'}\n${doc.text}`)
      .join('\n\n---\n\n');

    const sources = contextDocs.map(doc => ({
      title: doc.metadata?.title || 'Unknown',
      documentId: doc.metadata?.document_id,
      score: doc.score?.toFixed(3)
    }));

    return { contextText, sources };
  }

  async *orchestrate(query, userId, conversationHistory = [], options = {}) {
    const { agentType: forcedAgent, documentIds = [], model, explainReasoning } = options;
    
    // Detect best agent
    const selectedAgentType = forcedAgent || this.detectAgent(query);
    const agent = AGENTS[selectedAgentType] || AGENTS.general;

    // Emit agent selection info
    yield JSON.stringify({ type: 'agent', data: { type: selectedAgentType, name: agent.name, icon: agent.icon } }) + '\n';

    // Build RAG context
    const { contextText, sources } = await this.buildRAGContext(query, userId, documentIds);
    
    if (sources.length > 0) {
      yield JSON.stringify({ type: 'sources', data: sources }) + '\n';
    }

    // Build system prompt with context
    let systemPrompt = agent.systemPrompt;
    if (contextText) {
      systemPrompt += `\n\n## Retrieved Context from Knowledge Base:\n${contextText}\n\nIMPORTANT: Use the above context to ground your response. Reference specific details from the sources.`;
    }

    if (explainReasoning) {
      systemPrompt += '\n\nNote: The user has enabled "Explain Reasoning" mode. Briefly explain your retrieval process and reasoning at the start of your response.';
    }

    // Build message history
    const messages = conversationHistory.map(m => ({
      role: m.role,
      content: m.content
    }));
    messages.push({ role: 'user', content: query });

    // Stream response
    yield JSON.stringify({ type: 'start' }) + '\n';
    
    let fullResponse = '';
    for await (const chunk of aiService.streamResponse(messages, model, systemPrompt)) {
      fullResponse += chunk;
      yield JSON.stringify({ type: 'token', data: chunk }) + '\n';
    }

    yield JSON.stringify({ type: 'done', data: { agent: selectedAgentType, responseLength: fullResponse.length } }) + '\n';
  }
}

const orchestrator = new AgentOrchestrator();
module.exports = { orchestrator, AGENTS };
