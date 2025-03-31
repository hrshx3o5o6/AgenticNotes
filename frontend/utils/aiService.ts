import { ChatOllama } from '@langchain/ollama'
import { TavilySearchResults } from '@langchain/community/tools/tavily_search'
import { AgentExecutor, createReactAgent } from 'langchain/agents'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { createRetrieverTool } from 'langchain/tools/retriever'
import { OllamaEmbeddings } from '@langchain/ollama'
import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase'
import { createClient } from '@supabase/supabase-js'
import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import { JsonOutputParser } from "@langchain/core/output_parsers";
import { analyzeQuestions } from './questionService'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_API_KEY!
)

async function createRetriever() {
  const embeddings = new OllamaEmbeddings({
    model: "mistral:latest",
    baseUrl: "http://localhost:11434",
  })

  const vectorStore = await SupabaseVectorStore.fromExistingIndex(
    embeddings,
    {
      client: supabase,
      tableName: "documents",
      queryName: "match_documents",
    }
  )

  return vectorStore.asRetriever()
}

export async function processAndAnalyze() {
  const chatModel = new ChatOllama({
    baseUrl: "http://localhost:11434",
    model: "mistral:latest"
  })

  // Create retriever tool
  const retriever = await createRetriever()
  const retrieverTool = createRetrieverTool(retriever, {
    name: "notes_search",
    description: "Searches through uploaded study materials and notes",
  })

  // Create web search tool
  const webSearchTool = new TavilySearchResults({
    apiKey: process.env.TAVILY_API_KEY,
  })

  //Create question analysis tool
  const questionAnalysisTool = new DynamicStructuredTool({
    name: "question_analysis",
    description: "Analyzes questions and finds similar questions in the documents",
    schema: z.object({
      question: z.string().describe("The question to analyze")
    }),
    func: async ({ question }) => {
      const response = await fetch('/api/analyse-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
      })
      const result = await response.json()
      return JSON.stringify(result)
    }
    // func: async ({ question }) => {
    //   const analysis = await analyzeQuestions(question)
    //   return JSON.stringify(analysis)
    // }
  })

  const tools = [retrieverTool, webSearchTool, questionAnalysisTool]

  const JsonParser = new JsonOutputParser();

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", `You are a helpful AI assistant that analyzes questions from uploaded PDFs. 
    You must ALWAYS structure your final response in this exact JSON format:
    {
      "response": "your detailed answer here",
      "analysis": "your analysis of the question here",
      "sources": "sources used for the answer"
    }
    Available tools: {tools}. Tool names: {tool_names}.`],
    ["human", "{input}"],
    ["assistant", "{agent_scratchpad}"]
  ])

  const agent = await createReactAgent({
    llm: chatModel, 
    tools: tools,
    prompt: prompt,
  })

  return new AgentExecutor({
    agent,
    tools,
    verbose: true,
    returnIntermediateSteps: true,
  })
}