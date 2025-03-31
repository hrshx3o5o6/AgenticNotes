import { NextResponse } from 'next/server'
import { initializeAI, processExamPaper } from '/Users/Harsha/Downloads/Harsha_Stuff/Projects/Agentic-Ai /notesParse/index.js'
import path from 'path'

let executor: any = null

export async function POST(request: Request) {
  try {
    const { type, data } = await request.json()

    switch (type) {
      case 'analyze-question':
        if (!executor) {
          executor = await initializeAI()
        }
        const result = await executor.invoke({
          input: data.question,
        })
        return NextResponse.json({ success: true, analysis: result })

      case 'process-pdf':
        const pdfPath = path.join(process.cwd(), '../data', data.filename)
        const analysis = await processExamPaper(pdfPath)
        return NextResponse.json({ success: true, analysis })

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid request type' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Server error'
      },
      { status: 500 }
    )
  }
}