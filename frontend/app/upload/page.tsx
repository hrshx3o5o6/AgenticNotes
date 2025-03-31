"use client"

import { useState } from 'react'
import { Upload, FileType, Loader2 } from 'lucide-react'
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Sidebar } from "@/components/sidebar"
import { useRef } from 'react'

export default function UploadPage() {
  const [files, setFiles] = useState<FileList | null>(null)
  const [uploading, setUploading] = useState(false)
const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setFiles(e.dataTransfer.files)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!files) return

    setUploading(true)
    const formData = new FormData()
    Array.from(files).forEach(file => {
      formData.append('files', file)
    })

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      if (response.ok) {
        alert('Files uploaded successfully!')
        setFiles(null)
      }
    } catch (error) {
      console.error('Upload failed:', error)
      alert('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Upload Study Materials</h1>
          
          <Card className="p-8">
            <form onSubmit={handleUpload}>
              <div 
                className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-12 space-y-4"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={handleClick}
              >
                <Upload className="w-12 h-12 text-muted-foreground" />
                <div className="text-center">
                  <p className="text-lg font-medium">Drag & drop your PDF files here</p>
                  <p className="text-sm text-muted-foreground">or click to browse</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => setFiles(e.target.files)}
                />
              </div>
              
              {files && (
                <div className="mt-6 space-y-2">
                  <p className="font-medium">Selected files:</p>
                  {Array.from(files).map((file, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <FileType className="w-4 h-4" />
                      <span>{file.name}</span>
                    </div>
                  ))}
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full mt-6" 
                disabled={!files || uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  'Upload Files'
                )}
              </Button>
            </form>
          </Card>
        </div>
      </main>
    </div>
  )
}