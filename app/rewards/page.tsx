"use client"

import { useState, useEffect } from "react"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { getUserData, saveUserData } from "@/lib/storage"
import { useToast } from "@/hooks/use-toast"
import { Gift, Star, Coins, Trophy, Zap, Crown, Gem, Award, CheckCircle } from "lucide-react"

const DAILY_REWARDS = [
  { day: 1, coins: 50, xp: 25, type: "coins" },
  { day: 2, coins: 75, xp: 35, type: "coins" },
  { day: 3, coins: 100, xp: 50, type: "badge", badge: "Daily Streak" },
  { day: 4, coins: 125, xp: 60, type: "coins" },
  { day: 5, coins: 150, xp: 75, type: "coins" },
  { day: 6, coins: 200, xp: 100, type: "coins" },
  { day: 7, coins: 300, xp: 150, type: "badge", badge: "Weekly Champion" },
]

const MILESTONE_REWARDS = [
  {
    id: "level_5_reward",
    title: "Level 5 Milestone",
    description: "Congratulations on reaching level 5!",
    coins: 200,
    xp: 100,
    requirement: 5,
    claimed: false,
  },
  {
    id: "level_10_reward",
    title: "Level 10 Milestone",
    description: "Amazing! You've reached level 10!",
    coins: 500,
    xp: 250,
    requirement: 10,
    claimed: false,
  },
  {
    id: "score_1000_reward",
    title: "Score Master",
    description: "You've scored over 1000 points!",
    coins: 150,
    xp: 75,
    requirement: 1000,
    type: "score",
    claimed: false,
  },
  {
    id: "coins_500_reward",
    title: "Coin Collector",
    description: "You've collected 500 coins!",
    coins: 100,
    xp: 100,
    requirement: 500,
    type: "coins",
    claimed: false,
  },
]

export default function RewardsPage() {
  const [userData, setUserData] = useState(getUserData())
  const [dailyStreak, setDailyStreak] = useState(0)
  const [lastClaimDate, setLastClaimDate] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    const data = getUserData()
    setUserData(data)

    // Check daily streak
    const today = new Date().toDateString()
    const lastClaim = localStorage.getItem("lastDailyReward")
    const streak = Number.parseInt(localStorage.getItem("dailyStreak") || "0")

    setLastClaimDate(lastClaim)
    setDailyStreak(streak)
  }, [])

  const canClaimDaily = () => {
    if (!lastClaimDate) return true
    const today = new Date().toDateString()
    return lastClaimDate !== today
  }

  const claimDailyReward = () => {
    if (!canClaimDaily()) return

    const today = new Date().toDateString()
    const yesterday = new Date(Date.now() - 86400000).toDateString()

    let newStreak = dailyStreak
    if (lastClaimDate === yesterday) {
      newStreak = Math.min(dailyStreak + 1, 7)
    } else {
      newStreak = 1
    }

    const reward = DAILY_REWARDS[newStreak - 1]
    const newCoins = userData.coins + reward.coins
    const newXP = userData.xp + reward.xp

    // Update user data
    const updatedData = {
      ...userData,
      coins: newCoins,
      xp: newXP,
    }

    if (reward.type === "badge" && reward.badge) {
      updatedData.achievements = [...userData.achievements, reward.badge]
    }

    setUserData(updatedData)
    saveUserData(updatedData)

    // Update streak tracking
    localStorage.setItem("lastDailyReward", today)
    localStorage.setItem("dailyStreak", newStreak.toString())
    setLastClaimDate(today)
    setDailyStreak(newStreak)

    toast({
      title: "Daily Reward Claimed!",
      description: `+${reward.coins} coins, +${reward.xp} XP${reward.badge ? `, +${reward.badge} badge` : ""}`,
    })
  }

  const claimMilestoneReward = (rewardId: string) => {
    const reward = MILESTONE_REWARDS.find((r) => r.id === rewardId)
    if (!reward) return

    const newCoins = userData.coins + reward.coins
    const newXP = userData.xp + reward.xp

    const updatedData = {
      ...userData,
      coins: newCoins,
      xp: newXP,
    }

    // Mark reward as claimed
    const claimedRewards = JSON.parse(localStorage.getItem("claimedMilestones") || "[]")
    claimedRewards.push(rewardId)
    localStorage.setItem("claimedMilestones", JSON.stringify(claimedRewards))

    setUserData(updatedData)
    saveUserData(updatedData)

    toast({
      title: "Milestone Reward Claimed!",
      description: `+${reward.coins} coins, +${reward.xp} XP`,
    })
  }

  const isRewardAvailable = (reward: any) => {
    const claimedRewards = JSON.parse(localStorage.getItem("claimedMilestones") || "[]")
    if (claimedRewards.includes(reward.id)) return false

    if (reward.type === "score") {
      return userData.score >= reward.requirement
    } else if (reward.type === "coins") {
      return userData.coins >= reward.requirement
    } else {
      return userData.level >= reward.requirement
    }
  }

  const isRewardClaimed = (rewardId: string) => {
    const claimedRewards = JSON.parse(localStorage.getItem("claimedMilestones") || "[]")
    return claimedRewards.includes(rewardId)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-blue-900 dark:to-purple-900">
      <Navigation />

      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent mb-4">
            Rewards Center
          </h1>
          <p className="text-xl text-muted-foreground">Claim your daily rewards and milestone achievements</p>
        </div>

        {/* Player Inventory */}
        <Card className="mb-8 max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-yellow-500" />
              Your Inventory
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-3xl font-bold text-yellow-600 flex items-center justify-center gap-1">
                  <Coins className="w-6 h-6" />
                  {userData.coins}
                </div>
                <div className="text-sm text-muted-foreground">Coins</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-blue-600 flex items-center justify-center gap-1">
                  <Star className="w-6 h-6" />
                  {userData.xp}
                </div>
                <div className="text-sm text-muted-foreground">Experience</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-purple-600 flex items-center justify-center gap-1">
                  <Trophy className="w-6 h-6" />
                  {userData.achievements.length}
                </div>
                <div className="text-sm text-muted-foreground">Achievements</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Daily Rewards */}
        <Card className="mb-8 max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-green-500" />
              Daily Rewards
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span>Daily Streak</span>
                <span>{dailyStreak}/7 days</span>
              </div>
              <Progress value={(dailyStreak / 7) * 100} className="h-2" />
            </div>

            <div className="grid grid-cols-7 gap-2 mb-4">
              {DAILY_REWARDS.map((reward, index) => (
                <div
                  key={reward.day}
                  className={`p-3 rounded-lg border text-center text-xs ${
                    index < dailyStreak
                      ? "bg-green-100 border-green-300 dark:bg-green-900/30"
                      : index === dailyStreak && canClaimDaily()
                        ? "bg-yellow-100 border-yellow-300 dark:bg-yellow-900/30"
                        : "bg-gray-100 border-gray-300 dark:bg-gray-800"
                  }`}
                >
                  <div className="font-semibold">Day {reward.day}</div>
                  <div className="text-yellow-600">{reward.coins} coins</div>
                  <div className="text-blue-600">{reward.xp} XP</div>
                  {reward.badge && <div className="text-purple-600 text-xs mt-1">{reward.badge}</div>}
                </div>
              ))}
            </div>

            <div className="text-center">
              <Button onClick={claimDailyReward} disabled={!canClaimDaily()} className="flex items-center gap-2">
                <Gift className="w-4 h-4" />
                {canClaimDaily() ? "Claim Daily Reward" : "Come Back Tomorrow"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Milestone Rewards */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Award className="w-6 h-6 text-purple-500" />
            Milestone Rewards
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            {MILESTONE_REWARDS.map((reward) => {
              const available = isRewardAvailable(reward)
              const claimed = isRewardClaimed(reward.id)

              return (
                <Card
                  key={reward.id}
                  className={`${
                    claimed
                      ? "border-green-200 bg-green-50 dark:bg-green-900/20"
                      : available
                        ? "border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20"
                        : "border-gray-200 bg-gray-50 dark:bg-gray-800/50 opacity-75"
                  }`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{reward.title}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">{reward.description}</p>
                      </div>
                      {claimed ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : available ? (
                        <Gem className="w-5 h-5 text-yellow-500" />
                      ) : (
                        <Zap className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex gap-4 text-sm">
                        <span className="flex items-center gap-1">
                          <Coins className="w-4 h-4 text-yellow-500" />+{reward.coins}
                        </span>
                        <span className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-blue-500" />+{reward.xp}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground mb-3">
                      Requirement:{" "}
                      {reward.type === "score"
                        ? `${reward.requirement} points`
                        : reward.type === "coins"
                          ? `${reward.requirement} coins`
                          : `Level ${reward.requirement}`}
                    </div>

                    <Button
                      onClick={() => claimMilestoneReward(reward.id)}
                      disabled={!available || claimed}
                      className="w-full"
                      variant={claimed ? "outline" : available ? "default" : "secondary"}
                    >
                      {claimed ? "Claimed" : available ? "Claim Reward" : "Not Available"}
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}
