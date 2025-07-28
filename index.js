import Tesseract from "tesseract.js";
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import natural from "natural";  
import { glob } from "glob";
// import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { OllamaEmbeddings } from "@langchain/ollama";
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { AgentExecutor, createOpenAIFunctionsAgent, createReactAgent } from "langchain/agents";
import { ChatOllama } from "@langchain/ollama";
import { createRetrieverTool } from "langchain/tools/retriever";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { SupabaseVectorStore} from "@langchain/community/vectorstores/supabase"
import { createClient } from "@supabase/supabase-js";
// import {ReActSingleInputOutputParser} from "langchain/agents/react/output_parser"
import { StructuredOutputParser } from "@langchain/core/output_parsers";

// ✅ Load environment variables
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_API_KEY
);

// ✅ Fix PDF Path
const pdfDirectory = path.resolve("/Users/Harsha/Downloads/Harsha_Stuff/Projects/Agentic-Ai /notesParse/data"); // Make sure this path is correct
if (!fs.existsSync(pdfDirectory)) {
    console.error(`❌ PDF file not found at path: ${pdfDirectory}`);
    process.exit(1);
}

// ✅ Extract text from PDF (OCR for handwritten content)
// function used for all sorts of pdfs
async function extractTextFromPDF(pdfPath) {
    try {
        console.log("\n📂 Reading PDF:", pdfPath);
        
        const dataBuffer = fs.readFileSync(pdfPath); // Read the PDF file
        console.log("\n🔄 Parsing PDF...");
        
        const pdfData = await pdfParse(dataBuffer, {timeout: 200000}); // Extract raw text

        console.log("\n✅ PDF successfully parsed!");
        return pdfData.text;
    } catch (error) {
        console.error("❌ Error processing PDF:", error);
        throw error;
    }
}

function cosineSimilarity(vec1, vec2) {
    let dotProduct = 0, magA = 0, magB = 0;
    for (let i = 0; i < vec1.length; i++) {
        dotProduct += vec1[i] * vec2[i];
        magA += vec1[i] ** 2;
        magB += vec2[i] ** 2;
    }
    return dotProduct / (Math.sqrt(magA) * Math.sqrt(magB));
}

//function to extract similar questions from the pdf parsed
function findSimilarQuestion(questions){
    const tokenizer = new natural.WordTokenizer();
    const tfidf = new natural.TfIdf();
    
    questions.forEach(q => { tfidf.addDocument(tokenizer.tokenize(q));
    });

    let similarQuestions = [];
    for (let i = 0; i < questions.length; i++) {
        for (let j = i + 1; j < questions.length; j++) {
            let vec1 = [], vec2 = [];
            tfidf.tfidfs(questions[i], (index, measure) => vec1[index] = measure);
            tfidf.tfidfs(questions[j], (index, measure) => vec2[index] = measure);
            let similarity = cosineSimilarity(vec1, vec2);

            //let similarity = tfidf.tfidf(questions[i], j);
            if (similarity > 0.6) { // Adjust threshold as needed
                similarQuestions.push({ q1: questions[i], q2: questions[j], similarity });
            }
        }
    }

    return similarQuestions;
}

function extractQuestions(text) {
    console.log("extract questions from pdf")
    // Updated regex to match questions with numbers at start and possible (a), (b) parts
    const questionPatterns = [
        // Main numbered questions (1, 2, 3, etc.)
        /(?:\d+[\s.)])\s*([^()\n]+(?:\([a-z]\)[^()\n]+)*)/gim,
        
        // Sub-questions with (a), (b) format
        /\(([a-z])\)\s*([^\n]+)/gim
    ];

    const questions = [];
    
    // Process main questions
    let match;
    questionPatterns.forEach(pattern => {
        while ((match = pattern.exec(text)) !== null) {
            const question = match[1]?.trim() || match[2]?.trim();
            if (question) {
                questions.push(question);
            }
        }
    });

    console.log("\n✅ Questions extracted from PDF!");
    return questions;
}

async function processExamPaper(pdfPath){
    const text = await extractTextFromPDF(pdfPath);
    const extractedQuestions = extractQuestions(text);
    console.log("Extracted questions: ", extractedQuestions);
    const similarQuestions = findSimilarQuestion(extractedQuestions);
    console.log("Similar questions: ", similarQuestions);
    return similarQuestions;
}

// ✅ Store extracted text in vector database
async function storeNotesInVectorStore(notesText) {
    const embeddings = new OllamaEmbeddings({ 
        model: "mistral:latest", 
        baseUrl: "http://localhost:11434", 
    });
    //using mistral to convert text to vector embeddings
    
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
// let executor;
// (async () => {
//     try {
//         console.log("\n📂 Processing your handwritten PDF...");
//         const extractedText = await extractTextFromPDF(pdfPath);

//         console.log("\n✅ Extracted Text (Preview):\n", extractedText.substring(0, 500), "...");

//         console.log("\n🔄 Storing notes for AI retrieval...");
//         const retriever = await storeNotesInVectorStore(extractedText);

//         console.log("\n✅ Notes stored successfully! Setting up AI...");

//         // ✅ Create AI model
//         const chatModel = new ChatOllama({
//             baseUrl: "http://localhost:11434",
//             model: "llama3.1:latest"
//         });

//         // ✅ Create retriever & web search tools
//         const retrieverTool = createRetrieverTool(retriever, {
//             name: "notes-search",
//             description: "Searches and returns relevant information from handwritten notes.",
//         });

//         const webSearchTool = new TavilySearchResults({
//             apiKey: process.env.TAVILY_API_KEY,
//         });

//         const tools = [retrieverTool, webSearchTool];

//         // ✅ Create Prompt
//         const prompt = ChatPromptTemplate.fromMessages([
//             ["system", "You are a helpful AI assistant that uses the provided PDF and tools to answer questions. Available tools: {tools}. Tool names: {tool_names}."],
//             ["human", "{input}"],
//             ["assistant", "{agent_scratchpad}"]
//         ]);

//         // ✅ Create AI Agent
//         const agent = await createReactAgent({
//             llm: chatModel,
//             tools: tools,
//             prompt: prompt,
//             outputParser: new StructuredOutputParser({
//                 output_key: "answer",
//                 verbose: true,
//             }),
//         });

//         // ✅ Initialize the AI agent
//         const executor = new AgentExecutor({
//             agent,
//             tools,
//             verbose: true,
//         });

//         console.log("\n🎉 AI is ready! Run `node cli.js` to start chatting.");

//         // Fix the export for ES modules
        
//     } catch (error) {
//         console.error("\n❌ Something went wrong:", error);
//     }
// })();

async function processMultiplePDFs(pdfDirectory) {
    const pdfFiles = glob.sync(path.join(pdfDirectory, "*.pdf"));
    console.log(`\n📂 Processing PDFs... Found ${pdfFiles.length} PDF files`);

    let allText = '';
    let allAnalysis = [];

    for (const pdfFile of pdfFiles) {
        console.log(`\n📂 Processing PDF: ${pdfFile}`);
        // Process exam paper analysis
        const analysis = await processExamPaper(pdfFile);
        console.log("\n📊 Question Analysis for", path.basename(pdfFile));
        analysis.forEach(({q1, q2, similarity}) => {
            console.log(`\n🔄 Similarity: ${(similarity * 100).toFixed(2)}%`);
            console.log(`Q1: ${q1}`);
            console.log(`Q2: ${q2}`);
        });
        allAnalysis.push({ file: path.basename(pdfFile), analysis });

        // Get text for vector store
        const text = await extractTextFromPDF(pdfFile);
        allText += '\n' + text;
    }
    
    return { allText, allAnalysis };
}

class QuestionAnalysisTool{
    constructor() {
        this.name = "question analysis";
        this.description = "Analyzes the question and provides information about the question type similar questions in the documents uploaded.";
    }

    async _call(input){
        const extractedQuestions = extractQuestions(input);
        const similarQuestions = findSimilarQuestion(extractedQuestions);
        return {
            totalQuestions: extractedQuestions.length,
            similarQuestions: similarQuestions,
            message: `Found ${similarQuestions.length} pairs of similar questions in ${extractedQuestions.length} questions.`
        };
    }

}


// Create the initialization function
async function initializeAI() {
    console.log("\n📂 Processing your PDF files...");
    const pdfDirectory = path.resolve("/Users/Harsha/Downloads/Harsha_Stuff/Projects/Agentic-Ai /notesParse/data");
    const { allText, allAnalysis } = await processMultiplePDFs(pdfDirectory);

    console.log("\n📊 Summary of Question Analysis:");
    allAnalysis.forEach(({ file, analysis }) => {
        console.log(`\n📑 File: ${file}`);
        console.log(`Found ${analysis.length} sets of similar questions`);
    });

    console.log("\n✅ Extracted Text (Preview):\n", allText.substring(0, 500), "...");

    console.log("\n🔄 Storing notes for AI retrieval...");
    const retriever = await storeNotesInVectorStore(allText);
    console.log("\n✅ Notes stored successfully! Setting up AI...");
    
    const chatModel = new ChatOllama({
        baseUrl: "http://localhost:11434",
        model: "llama3.1:latest"
    });

    const retrieverTool = createRetrieverTool(retriever, {
        name: "notes-search",
        description: "Searches and returns relevant information from handwritten notes.",
    });

    const questionAnalysisTool = new QuestionAnalysisTool();

    const webSearchTool = new TavilySearchResults({
        apiKey: process.env.TAVILY_API_KEY,
    });

    // const voiceConvertTool = new VoiceConvertTool(retriever, {
    //     name:"voice coverter tool", 
    //     description: "Converts voice to text and searches and returns relevant information from handwritten notes and the web.",
    //     // create a function that takes in a voice file and returns a text string
        

    // }
    // );
    // write logic for voice converter from open ai whisperapis

    const tools = [retrieverTool, webSearchTool, questionAnalysisTool];
    
    const prompt = ChatPromptTemplate.fromMessages([
        ["system", "You are a helpful AI assistant who helps user analysing previous year question papers using the provided PDF and tools to answer questions. Available tools: {tools}. Tool names: {tool_names}."],
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
export { initializeAI, processExamPaper, processMultiplePDFs, extractQuestions, findSimilarQuestion };
// export { executor };

