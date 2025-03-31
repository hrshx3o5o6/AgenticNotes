import natural from 'natural'
import fs from 'fs'
// @ts-ignore
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
// @ts-ignore
import { pdf } from 'pdf-parse'
import path from 'path'
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { SupabaseVectorStore} from "@langchain/community/vectorstores/supabase"
import { OllamaEmbeddings } from "@langchain/ollama";
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_API_KEY!
)

async function storeNotesInVectorStore(notesText: string) {
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
        }
    );
    console.log("\n✅ Notes stored in supabase database!");
    return vectorStore.asRetriever();
}

async function extractTextFromPDF(pdfPath: string): Promise<string> {
    console.log("\n📂 Reading PDF:", pdfPath);
    const dataBuffer = fs.readFileSync(pdfPath)
    console.log("\n🔄 Parsing PDF...")
    
    const data = await pdfParse(dataBuffer)
    console.log("✅ PDF successfully parsed!")
    return data.text
}

function cosineSimilarity(vec1: number[], vec2: number[]): number {
    let dotProduct = 0, magA = 0, magB = 0
    for (let i = 0; i < vec1.length; i++) {
        dotProduct += vec1[i] * vec2[i]
        magA += vec1[i] ** 2
        magB += vec2[i] ** 2
    }
    return dotProduct / (Math.sqrt(magA) * Math.sqrt(magB))
}

export function findSimilarQuestions(questions: string[]) {
    const tokenizer = new natural.WordTokenizer()
    const tfidf = new natural.TfIdf()
    
    questions.forEach(q => {
        tfidf.addDocument(tokenizer.tokenize(q))
    })

    let similarQuestions = []
    for (let i = 0; i < questions.length; i++) {
        for (let j = i + 1; j < questions.length; j++) {
            let vec1: number[] = [], vec2: number[] = []
            tfidf.tfidfs(questions[i], (index, measure) => vec1[index] = measure)
            tfidf.tfidfs(questions[j], (index, measure) => vec2[index] = measure)
            let similarity = cosineSimilarity(vec1, vec2)

            if (similarity > 0.6) {
                similarQuestions.push({ q1: questions[i], q2: questions[j], similarity })
            }
        }
    }

    return similarQuestions
}


export function extractQuestions(text: string): string[] {
    const questionPatterns = [
        /(?:\d+[\s.)])\s*([^()\n]+(?:\([a-z]\)[^()\n]+)*)/gim,
        /\(([a-z])\)\s*([^\n]+)/gim
    ]

    const questions: string[] = []
    
    questionPatterns.forEach(pattern => {
        let match
        while ((match = pattern.exec(text)) !== null) {
            const question = match[1]?.trim() || match[2]?.trim()
            if (question) {
                questions.push(question)
            }
        }
    })

    return questions
}

export async function analyzeQuestions(text: string) {
    const extractedQuestions = extractQuestions(text)
    const similarQuestions = findSimilarQuestions(extractedQuestions)
    
    return {
        totalQuestions: extractedQuestions.length,
        questions: extractedQuestions,
        similarQuestions: similarQuestions,
        summary: `Found ${similarQuestions.length} pairs of similar questions in ${extractedQuestions.length} total questions.`
    }
}

// class QuestionAnalysisTool{
//     constructor() {
//         this.name = "question analysis";
//         this.description = "Analyzes the question and provides information about the question type similar questions in the documents uploaded.";
//     }

//     async _call(input){
//         const extractedQuestions = extractQuestions(input);
//         const similarQuestions = findSimilarQuestion(extractedQuestions);
//         return {
//             totalQuestions: extractedQuestions.length,
//             similarQuestions: similarQuestions,
//             message: `Found ${similarQuestions.length} pairs of similar questions in ${extractedQuestions.length} questions.`
//         };
//     }

// }



export async function processMultiplePDFs(pdfDirectory: string) {
    const pdfFiles = fs.readdirSync(pdfDirectory).filter(file => file.endsWith('.pdf'))
    console.log(`\n📂 Processing PDFs... Found ${pdfFiles.length} PDF files`)

    let allText = ''
    let allAnalysis = []

    for (const pdfFile of pdfFiles) {
        console.log(`\n📂 Processing PDF: ${pdfFile}`)
        const text = await extractTextFromPDF(path.join(pdfDirectory, pdfFile))
        const questions = extractQuestions(text)
        const similarities = findSimilarQuestions(questions)
        
        console.log("\n📊 Question Analysis for", path.basename(pdfFile))
        similarities.forEach(({q1, q2, similarity}) => {
            console.log(`\n🔄 Similarity: ${(similarity * 100).toFixed(2)}%`)
            console.log(`Q1: ${q1}`)
            console.log(`Q2: ${q2}`)
        })
        
        allAnalysis.push({ 
            file: path.basename(pdfFile), 
            analysis: similarities,
            text: text
        })
        allText += '\n' + text
    }
    
    return { allText, allAnalysis }
}

export { storeNotesInVectorStore }
