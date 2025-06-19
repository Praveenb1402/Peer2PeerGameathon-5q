"use client"

export interface UserData {
  level: number
  score: number
  xp: number
  coins: number
  achievements: string[]
  settings: {
    sound: boolean
    theme: "light" | "dark" | "system"
  }
  customContent: Array<{
    id: string
    type: "image" | "text"
    content: string
    title: string
    createdAt: string
  }>
  rewards: Array<{
    id: string
    type: "badge" | "coin" | "xp"
    title: string
    description: string
    claimed: boolean
    earnedAt: string
  }>
}

const defaultUserData: UserData = {
  level: 1,
  score: 0,
  xp: 0,
  coins: 0,
  achievements: [],
  settings: {
    sound: true,
    theme: "system",
  },
  customContent: [],
  rewards: [],
}

export const getUserData = (): UserData => {
  if (typeof window === "undefined") return defaultUserData

  try {
    const data = localStorage.getItem("puzzleAdventureData")
    return data ? { ...defaultUserData, ...JSON.parse(data) } : defaultUserData
  } catch {
    return defaultUserData
  }
}

export const saveUserData = (data: Partial<UserData>) => {
  if (typeof window === "undefined") return

  try {
    const currentData = getUserData()
    const newData = { ...currentData, ...data }
    localStorage.setItem("puzzleAdventureData", JSON.stringify(newData))
  } catch (error) {
    console.error("Failed to save user data:", error)
  }
}

export const resetUserData = () => {
  if (typeof window === "undefined") return

  localStorage.removeItem("puzzleAdventureData")
}
