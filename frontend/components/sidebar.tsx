"use client"

import { UserCircle, Settings, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { useState } from 'react'

export function Sidebar() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="hidden md:flex flex-col gap-6 h-screen w-[60px] bg-card p-2">
        <UserCircle className="w-8 h-8 text-muted-foreground" />
        <Settings className="w-8 h-8 text-muted-foreground mt-auto" />
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild className="md:hidden absolute top-4 left-4">
          <Button variant="ghost" size="icon">
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[60px] p-2">
          <div className="flex flex-col gap-6">
            <UserCircle className="w-8 h-8 text-muted-foreground" />
            <Settings className="w-8 h-8 text-muted-foreground mt-auto" />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}