"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { getUserData, saveUserData, resetUserData } from "@/lib/storage"
import { useToast } from "@/hooks/use-toast"
import { useTheme } from "next-themes"
import { SettingsIcon, Volume2, VolumeX, Sun, Moon, Monitor, RotateCcw, Download, Upload } from "lucide-react"

export default function SettingsPage() {
  const [userData, setUserData] = useState(getUserData())
  const [soundEnabled, setSoundEnabled] = useState(userData.settings.sound)
  const { theme, setTheme } = useTheme()
  const { toast } = useToast()

  useEffect(() => {
    setUserData(getUserData())
    setSoundEnabled(userData.settings.sound)
  }, [])

  const handleSoundToggle = (enabled: boolean) => {
    setSoundEnabled(enabled)
    const newSettings = { ...userData.settings, sound: enabled }
    const newUserData = { ...userData, settings: newSettings }
    setUserData(newUserData)
    saveUserData({ settings: newSettings })

    toast({
      title: enabled ? "Sound Enabled" : "Sound Disabled",
      description: `Game sounds are now ${enabled ? "on" : "off"}.`,
    })
  }

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme)
    const newSettings = { ...userData.settings, theme: newTheme as "light" | "dark" | "system" }
    const newUserData = { ...userData, settings: newSettings }
    setUserData(newUserData)
    saveUserData({ settings: newSettings })

    toast({
      title: "Theme Changed",
      description: `Theme set to ${newTheme}.`,
    })
  }

  const handleResetData = () => {
    if (confirm("Are you sure you want to reset all your game data? This action cannot be undone.")) {
      resetUserData()
      setUserData(getUserData())
      setSoundEnabled(true)

      toast({
        title: "Data Reset",
        description: "All your game data has been reset to default.",
        variant: "destructive",
      })
    }
  }

  const handleExportData = () => {
    const dataStr = JSON.stringify(userData, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = "puzzle-adventure-data.json"
    link.click()
    URL.revokeObjectURL(url)

    toast({
      title: "Data Exported",
      description: "Your game data has been downloaded as a JSON file.",
    })
  }

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const importedData = JSON.parse(e.target?.result as string)
          saveUserData(importedData)
          setUserData(getUserData())
          setSoundEnabled(importedData.settings?.sound ?? true)

          toast({
            title: "Data Imported",
            description: "Your game data has been successfully imported.",
          })
        } catch (error) {
          toast({
            title: "Import Failed",
            description: "The file format is invalid. Please select a valid backup file.",
            variant: "destructive",
          })
        }
      }
      reader.readAsText(file)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-blue-900 dark:to-purple-900">
      <Navigation />

      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-4">
            Settings
          </h1>
          <p className="text-xl text-muted-foreground">Customize your game experience</p>
        </div>

        <div className="max-w-2xl mx-auto space-y-6">
          {/* Audio Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                Audio Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="sound-toggle" className="text-base font-medium">
                    Game Sounds
                  </Label>
                  <p className="text-sm text-muted-foreground">Enable or disable sound effects and audio feedback</p>
                </div>
                <Switch id="sound-toggle" checked={soundEnabled} onCheckedChange={handleSoundToggle} />
              </div>
            </CardContent>
          </Card>

          {/* Theme Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="w-5 h-5" />
                Appearance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-medium">Theme</Label>
                  <p className="text-sm text-muted-foreground mb-3">Choose your preferred color scheme</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Button
                    variant={theme === "light" ? "default" : "outline"}
                    onClick={() => handleThemeChange("light")}
                    className="flex items-center gap-2"
                  >
                    <Sun className="w-4 h-4" />
                    Light
                  </Button>
                  <Button
                    variant={theme === "dark" ? "default" : "outline"}
                    onClick={() => handleThemeChange("dark")}
                    className="flex items-center gap-2"
                  >
                    <Moon className="w-4 h-4" />
                    Dark
                  </Button>
                  <Button
                    variant={theme === "system" ? "default" : "outline"}
                    onClick={() => handleThemeChange("system")}
                    className="flex items-center gap-2"
                  >
                    <Monitor className="w-4 h-4" />
                    System
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Game Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="w-5 h-5" />
                Game Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">{userData.level}</div>
                  <div className="text-sm text-muted-foreground">Current Level</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{userData.score}</div>
                  <div className="text-sm text-muted-foreground">Total Score</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">{userData.xp}</div>
                  <div className="text-sm text-muted-foreground">Experience</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-600">{userData.coins}</div>
                  <div className="text-sm text-muted-foreground">Coins</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5" />
                Data Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <Button onClick={handleExportData} variant="outline" className="flex-1 flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Export Data
                </Button>
                <div className="flex-1">
                  <input type="file" accept=".json" onChange={handleImportData} className="hidden" id="import-data" />
                  <Button
                    onClick={() => document.getElementById("import-data")?.click()}
                    variant="outline"
                    className="w-full flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Import Data
                  </Button>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button onClick={handleResetData} variant="destructive" className="w-full flex items-center gap-2">
                  <RotateCcw className="w-4 h-4" />
                  Reset All Data
                </Button>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  This will permanently delete all your progress, achievements, and custom content
                </p>
              </div>
            </CardContent>
          </Card>

          {/* About */}
          <Card>
            <CardHeader>
              <CardTitle>About Puzzle Adventure</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Version 1.0.0</p>
                <p>A brain-challenging puzzle adventure game with adaptive difficulty.</p>
                <p>Navigate mazes, collect keys, avoid traps, and unlock achievements!</p>
                <p className="pt-2 text-xs">Your progress is automatically saved to your browser's local storage.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
