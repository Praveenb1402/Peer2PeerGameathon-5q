"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Home, Play, Trophy, Settings, Gift, Plus, Menu, Gamepad2 } from "lucide-react"
import { cn } from "@/lib/utils"

const navigation = [
  { name: "Home", href: "/", icon: Home },
  { name: "Play", href: "/play", icon: Play },
  { name: "Add Content", href: "/add-content", icon: Plus },
  { name: "Achievements", href: "/achievements", icon: Trophy },
  { name: "Rewards", href: "/rewards", icon: Gift },
  { name: "Settings", href: "/settings", icon: Settings },
]

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  const NavItems = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      {navigation.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href

        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={() => mobile && setIsOpen(false)}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 hover:scale-105",
              isActive
                ? "bg-primary text-primary-foreground shadow-lg"
                : "hover:bg-accent hover:text-accent-foreground",
              mobile ? "text-base" : "text-sm",
            )}
          >
            <Icon className="w-5 h-5" />
            {item.name}
          </Link>
        )
      })}
    </>
  )

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden md:flex items-center justify-between p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl">
          <Gamepad2 className="w-8 h-8 text-primary" />
          Puzzle Adventure
        </Link>

        <div className="flex items-center gap-2">
          <NavItems />
        </div>
      </nav>

      {/* Mobile Navigation */}
      <nav className="md:hidden flex items-center justify-between p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <Gamepad2 className="w-6 h-6 text-primary" />
          Puzzle Adventure
        </Link>

        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="w-6 h-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-64">
            <div className="flex flex-col gap-4 mt-8">
              <NavItems mobile />
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </>
  )
}
