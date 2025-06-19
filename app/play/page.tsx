"use client"

import { Navigation } from "@/components/navigation"
import PuzzleAdventureGame from "./puzzle-game"

export default function PlayPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-blue-900 dark:to-purple-900">
      <Navigation />
      <PuzzleAdventureGame />
    </div>
  )
}
