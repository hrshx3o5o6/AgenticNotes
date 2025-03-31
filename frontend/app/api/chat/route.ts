import { NextResponse } from 'next/server'
import { ChatOllama } from '@langchain/ollama'
import { TavilySearchResults } from '@langchain/community/tools/tavily_search'
import { AgentExecutor, createReactAgent } from 'langchain/agents'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { createRetrieverTool } from 'langchain/tools/retriever'
import { processMultiplePDFs, storeNotesInVectorStore } from '@/utils/questionService'
import path from 'path'
import { processAndAnalyze } from '@/utils/aiService'

let executor: any = null

export async function GET() {
  try {
    console.log("\n📂 Processing your PDF files...")
    const pdfDirectory = path.resolve("/Users/Harsha/Downloads/Harsha_Stuff/Projects/Agentic-Ai /notesParse/data")
    const { allText, allAnalysis } = await processMultiplePDFs(pdfDirectory)

    console.log("\n📊 Summary of Question Analysis:")
    allAnalysis.forEach(({ file, analysis }) => {
        console.log(`\n📑 File: ${file}`)
        console.log(`Found ${analysis.length} sets of similar questions`)
    })

    const retriever = await storeNotesInVectorStore(allText)
    
    const chatModel = new ChatOllama({
        baseUrl: "http://localhost:11434",
        model: "mistral:latest"
    })

    const retrieverTool = createRetrieverTool(retriever, {
        name: "notes_search",
        description: "Searches through uploaded study materials and notes",
    })

    const webSearchTool = new TavilySearchResults({
        apiKey: process.env.TAVILY_API_KEY,
    })

    const tools = [retrieverTool, webSearchTool]
    
    const prompt = ChatPromptTemplate.fromMessages([
        ["system", "You are a helpful AI assistant who helps user analysing previous year question papers using the provided PDF and tools to answer questions. Available tools: {tools}. Tool names: {tool_names}."],
        ["human", "{input}"],
        ["assistant", "{agent_scratchpad}"]
    ])

    const agent = await createReactAgent({
        llm: chatModel,
        tools: tools,
        prompt: prompt,
    })

    executor = new AgentExecutor({
        agent,
        tools,
        verbose: true,
    })

    return NextResponse.json({ 
      success: true, 
      results: allAnalysis,
      summary: {
        totalFiles: allAnalysis.length,
        processingStatus: "✅ All PDFs processed successfully!",
        fileAnalysis: allAnalysis.map(a => {
          const similarityDetails = a.analysis.map(({q1, q2, similarity}) => 
            `\n🔄 ${(similarity * 100).toFixed(2)}% similar:\nQ1: ${q1}\nQ2: ${q2}`
          ).join('\n')
          
          return `📑 File: ${a.file}\nFound ${a.analysis.length} sets of similar questions${similarityDetails}`
        }).join('\n\n')
      }
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to process PDFs' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    console.log("🔄 Received request...");
    const { message } = await request.json()
    console.log("📩 Message from frontend:", message);

    if (!executor) {
      executor = await processAndAnalyze()
    }

    console.log("Invoking AI");
    const result = await executor.invoke({
      input: message,
    })

    // Handle different response formats
    let response = ''
    if (typeof result === 'string') {
      response = result
    } else if (result.output) {
      response = result.output
    } else if (result.response) {
      response = result.response
    } else if (result.generations?.[0]?.[0]?.text) {
      response = result.generations[0][0].text
    } else {
      console.log('Raw response:', result)
      response = JSON.stringify(result)
    }

    return NextResponse.json({ 
      success: true,
      response: response
    })
  } catch (error) {
    console.error('Chat API Error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to process request' },
      { status: 500 }
    )
  }
}