"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Navigation } from "@/components/navigation"
import { getUserData } from "@/lib/storage"
import { Play, Trophy, Star, Zap, Target, Sparkles, ArrowRight } from "lucide-react"
import clsx from "clsx"

const THEMES = {
  FOREST: { bg: "#2d5016", wall: "#8B4513", empty: "#90EE90" },
  CAVE: { bg: "#2F2F2F", wall: "#696969", empty: "#D3D3D3" },
  CYBER: { bg: "#0a0a0a", wall: "#00ffff", empty: "#1a1a2e" },
  OCEAN: { bg: "#0077be", wall: "#005073", empty: "#a2d5f2" },
  SUNSET: { bg: "#ff9966", wall: "#ff5e62", empty: "#ffe5b4" },
  LAVENDER: { bg: "#b57edc", wall: "#7c5295", empty: "#e6e6fa" },
  DESERT: { bg: "#edc9af", wall: "#c2b280", empty: "#fff8dc" },
  blue: { bg: "#e0f7fa", wall: "#0288d1", player: "#0066FF" },
  green: { bg: "#e8f5e9", wall: "#388e3c", player: "#43a047" },
  purple: { bg: "#f3e5f5", wall: "#8e24aa", player: "#6a1b9a" },
  // Add more themes!
}

const useHint = () => {
  // ...hint logic...
};

export default function HomePage() {
  const [userData, setUserData] = useState(getUserData())
  const [isLoaded, setIsLoaded] = useState(false)
  const [bgColor, setBgColor] = useState(THEMES.blue.bg) // Default to blue theme
  const [showDifficulty, setShowDifficulty] = useState(false)
  const [isRotating, setIsRotating] = useState(false)

  useEffect(() => {
    setUserData(getUserData())
    setIsLoaded(true)
  }, [])

  const features = [
    {
      icon: Target,
      title: "Adaptive Puzzles",
      description: "AI-powered levels that adapt to your skill level",
    },
    {
      icon: Trophy,
      title: "Achievements",
      description: "Unlock badges and rewards as you progress",
    },
    {
      icon: Zap,
      title: "Power-ups",
      description: "Collect coins and special abilities",
    },
    {
      icon: Sparkles,
      title: "Custom Content",
      description: "Add your own images and challenges",
    },
  ]

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-blue-900 dark:to-purple-900">
        <Navigation />
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-blue-900 dark:to-purple-900">
      <Navigation />

      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="mb-6">
            <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
              Puzzle Adventure
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
              Navigate mazes, solve puzzles, and unlock achievements in this epic brain-challenging adventure!
            </p>
          </div>

          {/* Player Stats */}
          {userData.level > 1 && (
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              <Badge variant="secondary" className="flex items-center gap-1">
                <Trophy className="w-4 h-4" />
                Level {userData.level}
              </Badge>
              <Badge variant="secondary" className="text-lg px-4 py-2">
                <Star className="w-5 h-5 mr-2" />
                {userData.score} Points
              </Badge>
              <Badge variant="secondary" className="text-lg px-4 py-2">
                <Zap className="w-5 h-5 mr-2" />
                {userData.coins} Coins
              </Badge>
            </div>
          )}

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button
              size="lg"
              className="text-lg px-8 py-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
              onClick={() => setShowDifficulty(true)}
            >
              <Play className="w-6 h-6 mr-2" />
              {userData.level > 1 ? "Continue Playing" : "Start Adventure"}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>

            {showDifficulty && (
              <div className="flex flex-col gap-2 bg-white p-4 rounded shadow-lg mt-4">
                <span className="font-bold mb-2">Select Difficulty:</span>
                <Button onClick={() => { localStorage.setItem('puzzleDifficulty', 'easy'); window.location.href = '/play'; }}>Easy</Button>
                <Button onClick={() => { localStorage.setItem('puzzleDifficulty', 'medium'); window.location.href = '/play'; }}>Medium</Button>
                <Button onClick={() => { localStorage.setItem('puzzleDifficulty', 'hard'); window.location.href = '/play'; }}>Hard</Button>
                <Button variant="outline" onClick={() => setShowDifficulty(false)}>Cancel</Button>
              </div>
            )}

            {userData.level > 1 && (
              <Link href="/achievements">
                <Button
                  variant="outline"
                  size="lg"
                  className="text-lg px-8 py-6 hover:scale-105 transition-all duration-200"
                >
                  <Trophy className="w-6 h-6 mr-2" />
                  View Progress
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <Card
                key={feature.title}
                className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-2 cursor-pointer"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="p-6 text-center">
                  <div className="mb-4 flex justify-center">
                    <div className="p-3 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <Icon className="w-8 h-8 text-primary" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Recent Achievements */}
        {userData.achievements.length > 0 && (
          <Card className="mb-8">
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold mb-4 flex items-center">
                <Trophy className="w-6 h-6 mr-2 text-yellow-500" />
                Recent Achievements
              </h2>
              <div className="flex flex-wrap gap-2">
                {userData.achievements.slice(-5).map((achievement, index) => (
                  <Badge key={index} variant="outline" className="text-sm">
                    {achievement}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link href="/add-content">
            <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer">
              <CardContent className="p-6 text-center">
                <div className="mb-3 flex justify-center">
                  <div className="p-2 rounded-full bg-green-100 dark:bg-green-900 group-hover:bg-green-200 dark:group-hover:bg-green-800 transition-colors">
                    <Sparkles className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <h3 className="font-semibold">Add Content</h3>
                <p className="text-sm text-muted-foreground">Create custom challenges</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/rewards">
            <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer">
              <CardContent className="p-6 text-center">
                <div className="mb-3 flex justify-center">
                  <div className="p-2 rounded-full bg-yellow-100 dark:bg-yellow-900 group-hover:bg-yellow-200 dark:group-hover:bg-yellow-800 transition-colors">
                    <Star className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
                <h3 className="font-semibold">Rewards</h3>
                <p className="text-sm text-muted-foreground">Claim your prizes</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/settings">
            <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer">
              <CardContent className="p-6 text-center">
                <div className="mb-3 flex justify-center">
                  <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900 group-hover:bg-blue-200 dark:group-hover:bg-blue-800 transition-colors">
                    <Zap className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <h3 className="font-semibold">Settings</h3>
                <p className="text-sm text-muted-foreground">Customize your experience</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </main>
    </div>
  )
}
