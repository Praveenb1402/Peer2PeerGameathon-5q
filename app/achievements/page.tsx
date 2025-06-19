"use client"

import { useState, useEffect } from "react"
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { getUserData } from "@/lib/storage"
import { Trophy, Star, Zap, Target, Clock, Shield, Crown, Gem, Lock, CheckCircle } from "lucide-react"

const ACHIEVEMENTS = [
  {
    id: "first_steps",
    title: "First Steps",
    description: "Complete your first level",
    icon: Target,
    requirement: "Complete 1 level",
    points: 50,
    unlockCondition: (userData: any) => userData.level > 1,
  },
  {
    id: "perfect_run",
    title: "Perfect Run",
    description: "Complete a level without any retries",
    icon: Star,
    requirement: "Zero retries in a level",
    points: 100,
    unlockCondition: (userData: any) => userData.achievements.includes("Perfect Run"),
  },
  {
    id: "speed_runner",
    title: "Speed Runner",
    description: "Complete a level in under 30 seconds",
    icon: Clock,
    requirement: "Complete level < 30 seconds",
    points: 150,
    unlockCondition: (userData: any) => userData.achievements.includes("Speed Runner"),
  },
  {
    id: "efficient_navigator",
    title: "Efficient Navigator",
    description: "Complete a level with minimal moves",
    icon: Zap,
    requirement: "Complete level < 25 moves",
    points: 125,
    unlockCondition: (userData: any) => userData.achievements.includes("Efficient Navigator"),
  },
  {
    id: "level_5",
    title: "Rising Star",
    description: "Reach level 5",
    icon: Shield,
    requirement: "Reach level 5",
    points: 200,
    unlockCondition: (userData: any) => userData.level >= 5,
  },
  {
    id: "level_10",
    title: "Puzzle Master",
    description: "Reach level 10",
    icon: Crown,
    requirement: "Reach level 10",
    points: 500,
    unlockCondition: (userData: any) => userData.level >= 10,
  },
  {
    id: "coin_collector",
    title: "Coin Collector",
    description: "Collect 500 coins",
    icon: Gem,
    requirement: "Collect 500 coins",
    points: 300,
    unlockCondition: (userData: any) => userData.coins >= 500,
  },
  {
    id: "high_scorer",
    title: "High Scorer",
    description: "Reach 5000 points",
    icon: Trophy,
    requirement: "Reach 5000 points",
    points: 400,
    unlockCondition: (userData: any) => userData.score >= 5000,
  },
]

export default function AchievementsPage() {
  const [userData, setUserData] = useState(getUserData())

  useEffect(() => {
    setUserData(getUserData())
  }, [])

  const unlockedAchievements = ACHIEVEMENTS.filter((achievement) => achievement.unlockCondition(userData))
  const lockedAchievements = ACHIEVEMENTS.filter((achievement) => !achievement.unlockCondition(userData))

  const totalPoints = unlockedAchievements.reduce((sum, achievement) => sum + achievement.points, 0)
  const maxPoints = ACHIEVEMENTS.reduce((sum, achievement) => sum + achievement.points, 0)
  const completionPercentage = (unlockedAchievements.length / ACHIEVEMENTS.length) * 100

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-blue-900 dark:to-purple-900">
      <Navigation />

      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent mb-4">
            Achievements
          </h1>
          <p className="text-xl text-muted-foreground">Track your progress and unlock rewards</p>
        </div>

        {/* Progress Overview */}
        <Card className="mb-8 max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Achievement Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Completion</span>
                <span>
                  {unlockedAchievements.length}/{ACHIEVEMENTS.length}
                </span>
              </div>
              <Progress value={completionPercentage} className="h-3" />
            </div>

            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-yellow-600">{totalPoints}</div>
                <div className="text-sm text-muted-foreground">Points Earned</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{Math.round(completionPercentage)}%</div>
                <div className="text-sm text-muted-foreground">Complete</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Unlocked Achievements */}
        {unlockedAchievements.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-green-500" />
              Unlocked ({unlockedAchievements.length})
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {unlockedAchievements.map((achievement) => {
                const Icon = achievement.icon
                return (
                  <Card
                    key={achievement.id}
                    className="border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800"
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-green-100 dark:bg-green-800">
                            <Icon className="w-6 h-6 text-green-600" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{achievement.title}</CardTitle>
                            <Badge variant="secondary" className="mt-1">
                              +{achievement.points} pts
                            </Badge>
                          </div>
                        </div>
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-2">{achievement.description}</p>
                      <p className="text-xs text-green-600 font-medium">✓ {achievement.requirement}</p>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )}

        {/* Locked Achievements */}
        {lockedAchievements.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Lock className="w-6 h-6 text-gray-400" />
              Locked ({lockedAchievements.length})
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {lockedAchievements.map((achievement) => {
                const Icon = achievement.icon
                return (
                  <Card
                    key={achievement.id}
                    className="border-gray-200 bg-gray-50 dark:bg-gray-800/50 dark:border-gray-700 opacity-75"
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-gray-100 dark:bg-gray-700">
                            <Icon className="w-6 h-6 text-gray-400" />
                          </div>
                          <div>
                            <CardTitle className="text-lg text-gray-600 dark:text-gray-400">
                              {achievement.title}
                            </CardTitle>
                            <Badge variant="outline" className="mt-1">
                              {achievement.points} pts
                            </Badge>
                          </div>
                        </div>
                        <Lock className="w-5 h-5 text-gray-400" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-2">{achievement.description}</p>
                      <p className="text-xs text-gray-500 font-medium">🔒 {achievement.requirement}</p>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )}

        {/* Achievement Tips */}
        <Card className="mt-8 max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              Achievement Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Complete levels quickly to unlock the Speed Runner achievement</li>
              <li>• Plan your moves carefully to become an Efficient Navigator</li>
              <li>• Avoid traps and retries for Perfect Run achievements</li>
              <li>• Keep playing to reach higher levels and unlock more rewards</li>
              <li>• Collect keys and coins to progress towards collection achievements</li>
            </ul>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
