import { NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import path from 'path'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const files = formData.getAll('files')

    const uploadDir = path.join(process.cwd(), '../data')
    
    for (const file of files) {
      const buffer = Buffer.from(await (file as File).arrayBuffer())
      const filename = (file as File).name
      await writeFile(path.join(uploadDir, filename), buffer)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Upload failed' },
      { status: 500 }
    )
  }
}