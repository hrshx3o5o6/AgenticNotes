import Tesseract from "tesseract.js";
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { OllamaEmbeddings } from "@langchain/ollama";
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { AgentExecutor, createOpenAIFunctionsAgent, createReactAgent } from "langchain/agents";
import { ChatOllama } from "@langchain/ollama";
import { createRetrieverTool } from "langchain/tools/retriever";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { SupabaseVectorStore} from "@langchain/community/vectorstores/supabase"
import { createClient } from "@supabase/supabase-js";
import {ReActSingleInputOutputParser} from "langchain/agents/react/output_parser"

// ✅ Load environment variables
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_API_KEY
);

// ✅ Fix PDF Path
const pdfPath = path.resolve("/Users/Harsha/Downloads/Harsha_Stuff/Projects/Agentic-Ai /notesParse/data/data.pdf"); // Make sure this path is correct
if (!fs.existsSync(pdfPath)) {
    console.error(`❌ PDF file not found at path: ${pdfPath}`);
    process.exit(1);
}

// ✅ Extract text from PDF (OCR for handwritten content)
async function extractTextFromPDF(pdfPath) {
    try {
        console.log("\n📂 Reading PDF:", pdfPath);
        
        const dataBuffer = fs.readFileSync(pdfPath); // Read the PDF file
        console.log("\n🔄 Parsing PDF...");
        
        const pdfData = await pdfParse(dataBuffer); // Extract raw text

        console.log("\n✅ PDF successfully parsed!");
        return pdfData.text;
    } catch (error) {
        console.error("❌ Error processing PDF:", error);
        throw error;
    }
}

// ✅ Store extracted text in vector database
async function storeNotesInVectorStore(notesText) {
    const embeddings = new OllamaEmbeddings({ 
        model: "mistral:latest", 
        baseUrl: "http://localhost:11434", 
    });
    
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 512,
        chunkOverlap: 50,
    });
    console.log("Splitting extracted text into chunks");
    const splitTexts = await splitter.createDocuments([notesText]);

    console.log(`✅ Text split into ${splitTexts.length} chunks.`);
    console.log("\n📚 Storing notes in supabase database...")

    // const vectorStore = await MemoryVectorStore.fromTexts(
    //     splitTexts.map(doc => doc.pageContent),  // Extract text from documents
    //     splitTexts.map((_, i) => ({ source: `chunk-${i}` })),  // Create metadata for each chunk
    //     embeddings
    // );
    const vectorStore = await SupabaseVectorStore.fromDocuments(
        splitTexts,
        embeddings,
        {
            client: supabase,
            tableName: "documents", // ✅ Uses the newly created table
            queryName: "match_documents",
            namespace: "notes_data", 
        }
    );
    console.log("\n✅ Notes stored in supabase database!");
    return vectorStore.asRetriever();
}

// ✅ Run the main function
let executor;
(async () => {
    try {
        console.log("\n📂 Processing your handwritten PDF...");
        const extractedText = await extractTextFromPDF(pdfPath);

        console.log("\n✅ Extracted Text (Preview):\n", extractedText.substring(0, 500), "...");

        console.log("\n🔄 Storing notes for AI retrieval...");
        const retriever = await storeNotesInVectorStore(extractedText);

        console.log("\n✅ Notes stored successfully! Setting up AI...");

        // ✅ Create AI model
        const chatModel = new ChatOllama({
            baseUrl: "http://localhost:11434",
            model: "llama3.1:latest"
        });

        // ✅ Create retriever & web search tools
        const retrieverTool = createRetrieverTool(retriever, {
            name: "notes-search",
            description: "Searches and returns relevant information from handwritten notes.",
        });

        const webSearchTool = new TavilySearchResults({
            apiKey: process.env.TAVILY_API_KEY,
        });

        const tools = [retrieverTool, webSearchTool];

        // ✅ Create Prompt
        const prompt = ChatPromptTemplate.fromMessages([
            ["system", "You are a helpful AI assistant that uses the provided PDF and tools to answer questions. Available tools: {tools}. Tool names: {tool_names}."],
            ["human", "{input}"],
            ["assistant", "{agent_scratchpad}"]
        ]);

        // ✅ Create AI Agent
        const agent = await createReactAgent({
            llm: chatModel,
            tools: tools,
            prompt: prompt,
            outputParser: ReActSingleInputOutputParser(),
        });

        // ✅ Initialize the AI agent
        const executor = new AgentExecutor({
            agent,
            tools,
            verbose: true,
        });

        console.log("\n🎉 AI is ready! Run `node cli.js` to start chatting.");

        // Fix the export for ES modules
        
    } catch (error) {
        console.error("\n❌ Something went wrong:", error);
    }
})();

// Create the initialization function
async function initializeAI() {
    const extractedText = await extractTextFromPDF(pdfPath);
    const retriever = await storeNotesInVectorStore(extractedText);
    
    const chatModel = new ChatOllama({
        baseUrl: "http://localhost:11434",
        model: "llama3.1:latest"
    });

    const retrieverTool = createRetrieverTool(retriever, {
        name: "notes-search",
        description: "Searches and returns relevant information from handwritten notes.",
    });

    const webSearchTool = new TavilySearchResults({
        apiKey: process.env.TAVILY_API_KEY,
    });

    const tools = [retrieverTool, webSearchTool];
    
    const prompt = ChatPromptTemplate.fromMessages([
        ["system", "You are a helpful AI assistant that uses the provided PDF and tools to answer questions. Available tools: {tools}. Tool names: {tool_names}."],
        ["human", "{input}"],
        ["assistant", "{agent_scratchpad}"]
    ]);

    const agent = await createReactAgent({
        llm: chatModel,
        tools: tools,
        prompt: prompt,
    });

    return new AgentExecutor({
        agent,
        tools,
        verbose: true,
    });
}

// Remove the IIFE and export the initialization function
export { initializeAI };
export { executor };