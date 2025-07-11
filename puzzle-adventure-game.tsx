"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Trophy, Clock, Move, RotateCcw, Star, Key } from "lucide-react"

// Game constants
const TILE_SIZE = 40
const GAME_WIDTH = 400
const GAME_HEIGHT = 400

// Tile types
const TILES = {
  EMPTY: 0,
  WALL: 1,
  PLAYER: 2,
  KEY: 3,
  DOOR: 4,
  GOAL: 5,
  TRAP: 6,
  ENEMY: 7,
  PRESSURE_PLATE: 8,
}

// Game themes
const THEMES = {
  FOREST: { bg: "#2d5016", wall: "#8B4513", empty: "#90EE90" },
  CAVE: { bg: "#2F2F2F", wall: "#696969", empty: "#D3D3D3" },
  CYBER: { bg: "#0a0a0a", wall: "#00ffff", empty: "#1a1a2e" },
}

interface GameState {
  level: number
  score: number
  xp: number
  coins: number
  currentMap: number[][]
  playerPos: { x: number; y: number }
  keysCollected: number
  totalKeys: number
  gameStatus: "playing" | "completed" | "failed"
  startTime: number
  moves: number
  retries: number
  hintsUsed: number
  theme: keyof typeof THEMES
}

interface LevelMetrics {
  timeToComplete: number
  movesUsed: number
  retriesUsed: number
  hintsUsed: number
  difficultyScore: number
}

export default function PuzzleAdventureGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [gameState, setGameState] = useState<GameState>({
    level: 1,
    score: 0,
    xp: 0,
    coins: 0,
    currentMap: [],
    playerPos: { x: 1, y: 1 },
    keysCollected: 0,
    totalKeys: 0,
    gameStatus: "playing",
    startTime: Date.now(),
    moves: 0,
    retries: 0,
    hintsUsed: 0,
    theme: "FOREST",
  })

  const [showLevelComplete, setShowLevelComplete] = useState(false)
  const [levelMetrics, setLevelMetrics] = useState<LevelMetrics | null>(null)

  // ML-powered adaptive level generation with proper pathfinding
  const generateAdaptiveLevel = useCallback((metrics: LevelMetrics | null, level: number) => {
    const baseSize = 10
    let difficulty = Math.min(level * 0.3, 4) // Reduced difficulty scaling

    // Adjust difficulty based on previous performance
    if (metrics) {
      if (metrics.timeToComplete < 30000) difficulty += 0.3
      if (metrics.movesUsed < 25) difficulty += 0.2
      if (metrics.retriesUsed > 2) difficulty -= 0.4
      if (metrics.hintsUsed > 1) difficulty -= 0.3
    }

    difficulty = Math.max(0.5, Math.min(difficulty, 4))

    // Initialize empty map
    const map = Array(baseSize)
      .fill(null)
      .map(() => Array(baseSize).fill(TILES.EMPTY))

    // Add border walls
    for (let i = 0; i < baseSize; i++) {
      map[0][i] = TILES.WALL
      map[baseSize - 1][i] = TILES.WALL
      map[i][0] = TILES.WALL
      map[i][baseSize - 1] = TILES.WALL
    }

    // Set start and goal positions
    const startPos = { x: 1, y: 1 }
    const goalPos = { x: baseSize - 2, y: baseSize - 2 }
    map[goalPos.y][goalPos.x] = TILES.GOAL

    // Create a guaranteed path from start to goal first
    const createPath = (from: { x: number; y: number }, to: { x: number; y: number }) => {
      const current = { ...from }
      const path = [current]

      // Move horizontally first, then vertically
      while (current.x !== to.x) {
        current.x += current.x < to.x ? 1 : -1
        path.push({ ...current })
        if (map[current.y][current.x] === TILES.WALL) {
          map[current.y][current.x] = TILES.EMPTY
        }
      }

      while (current.y !== to.y) {
        current.y += current.y < to.y ? 1 : -1
        path.push({ ...current })
        if (map[current.y][current.x] === TILES.WALL) {
          map[current.y][current.x] = TILES.EMPTY
        }
      }

      return path
    }

    // Create main path
    const mainPath = createPath(startPos, goalPos)

    // Add some strategic walls (but not blocking the main path)
    const wallCount = Math.floor(difficulty * 6)
    let wallsPlaced = 0
    let attempts = 0

    while (wallsPlaced < wallCount && attempts < 50) {
      const x = Math.floor(Math.random() * (baseSize - 2)) + 1
      const y = Math.floor(Math.random() * (baseSize - 2)) + 1

      // Don't place walls on start, goal, or main path
      const isOnMainPath = mainPath.some((p) => p.x === x && p.y === y)

      if (!isOnMainPath && map[y][x] === TILES.EMPTY) {
        map[y][x] = TILES.WALL

        // Check if goal is still reachable using simple pathfinding
        if (isPathExists(map, startPos, goalPos, baseSize)) {
          wallsPlaced++
        } else {
          // Remove wall if it blocks the path
          map[y][x] = TILES.EMPTY
        }
      }
      attempts++
    }

    // Add keys (fewer keys, balanced with doors)
    const keyCount = Math.max(1, Math.floor(difficulty / 2))
    let keysPlaced = 0
    attempts = 0

    while (keysPlaced < keyCount && attempts < 30) {
      const x = Math.floor(Math.random() * (baseSize - 2)) + 1
      const y = Math.floor(Math.random() * (baseSize - 2)) + 1

      if (map[y][x] === TILES.EMPTY && !(x === startPos.x && y === startPos.y)) {
        map[y][x] = TILES.KEY
        keysPlaced++
      }
      attempts++
    }

    // Add doors (always fewer than or equal to keys)
    const doorCount = Math.max(0, keyCount - 1)
    let doorsPlaced = 0
    attempts = 0

    while (doorsPlaced < doorCount && attempts < 30) {
      const x = Math.floor(Math.random() * (baseSize - 2)) + 1
      const y = Math.floor(Math.random() * (baseSize - 2)) + 1

      if (
        map[y][x] === TILES.EMPTY &&
        !(x === startPos.x && y === startPos.y) &&
        !(x === goalPos.x && y === goalPos.y)
      ) {
        map[y][x] = TILES.DOOR
        doorsPlaced++
      }
      attempts++
    }

    // Add fewer traps and not on critical paths
    const trapCount = Math.floor(difficulty * 0.5)
    for (let i = 0; i < trapCount; i++) {
      let attempts = 0
      while (attempts < 20) {
        const x = Math.floor(Math.random() * (baseSize - 2)) + 1
        const y = Math.floor(Math.random() * (baseSize - 2)) + 1

        if (
          map[y][x] === TILES.EMPTY &&
          !(x === startPos.x && y === startPos.y) &&
          !(x === goalPos.x && y === goalPos.y) &&
          !mainPath.some((p) => p.x === x && p.y === y)
        ) {
          map[y][x] = TILES.TRAP
          break
        }
        attempts++
      }
    }

    return { map, totalKeys: keyCount }
  }, [])

  // Simple pathfinding to check if goal is reachable
  const isPathExists = (
    map: number[][],
    start: { x: number; y: number },
    goal: { x: number; y: number },
    size: number,
  ): boolean => {
    const visited = Array(size)
      .fill(null)
      .map(() => Array(size).fill(false))
    const queue = [start]
    visited[start.y][start.x] = true

    const directions = [
      { x: 0, y: 1 },
      { x: 1, y: 0 },
      { x: 0, y: -1 },
      { x: -1, y: 0 },
    ]

    while (queue.length > 0) {
      const current = queue.shift()!

      if (current.x === goal.x && current.y === goal.y) {
        return true
      }

      for (const dir of directions) {
        const newX = current.x + dir.x
        const newY = current.y + dir.y

        if (
          newX >= 0 &&
          newX < size &&
          newY >= 0 &&
          newY < size &&
          !visited[newY][newX] &&
          map[newY][newX] !== TILES.WALL
        ) {
          visited[newY][newX] = true
          queue.push({ x: newX, y: newY })
        }
      }
    }

    return false
  }

  // Handle player movement with fixed door logic
  const movePlayer = useCallback(
    (dx: number, dy: number) => {
      if (gameState.gameStatus !== "playing") return

      setGameState((prev) => {
        const newX = prev.playerPos.x + dx
        const newY = prev.playerPos.y + dy
        const map = [...prev.currentMap.map((row) => [...row])] // Deep copy

        // Check bounds
        if (newX < 0 || newX >= map[0].length || newY < 0 || newY >= map.length) {
          return prev
        }

        const targetTile = map[newY][newX]

        // Check collision with walls
        if (targetTile === TILES.WALL) {
          return prev
        }

        // Check doors - need at least one key to pass through
        if (targetTile === TILES.DOOR && prev.keysCollected === 0) {
          return prev
        }

        const newState = { ...prev }
        newState.playerPos = { x: newX, y: newY }
        newState.moves += 1

        // Handle tile interactions
        if (targetTile === TILES.KEY) {
          map[newY][newX] = TILES.EMPTY
          newState.keysCollected += 1
          newState.coins += 10
          newState.currentMap = map
        } else if (targetTile === TILES.DOOR && prev.keysCollected > 0) {
          map[newY][newX] = TILES.EMPTY
          newState.keysCollected -= 1
          newState.currentMap = map
          newState.score += 50 // Bonus for using key strategically
        } else if (targetTile === TILES.TRAP) {
          // Reset to start position
          newState.playerPos = { x: 1, y: 1 }
          newState.retries += 1
          newState.score = Math.max(0, newState.score - 25) // Penalty for trap
        } else if (targetTile === TILES.GOAL) {
          newState.gameStatus = "completed"
          const timeToComplete = Date.now() - prev.startTime
          const metrics: LevelMetrics = {
            timeToComplete,
            movesUsed: newState.moves,
            retriesUsed: newState.retries,
            hintsUsed: newState.hintsUsed,
            difficultyScore: prev.level * 0.5,
          }
          setLevelMetrics(metrics)
          setShowLevelComplete(true)

          // Calculate rewards based on performance
          const timeBonus = Math.max(0, Math.floor((120000 - timeToComplete) / 1000)) // 2 minute par time
          const moveBonus = Math.max(0, (100 - newState.moves) * 5) // Efficiency bonus
          const levelBonus = prev.level * 100
          const perfectBonus = newState.retries === 0 ? prev.level * 50 : 0

          newState.score += timeBonus + moveBonus + levelBonus + perfectBonus
          newState.xp += prev.level * 50 + perfectBonus
          newState.coins += prev.level * 20
        }

        return newState
      })
    },
    [gameState.gameStatus],
  )

  const initializeLevel = useCallback(() => {
    const { map, totalKeys } = generateAdaptiveLevel(levelMetrics, gameState.level)
    setGameState((prev) => ({
      ...prev,
      currentMap: map,
      playerPos: { x: 1, y: 1 },
      keysCollected: 0,
      totalKeys: totalKeys,
      gameStatus: "playing",
      startTime: Date.now(),
      moves: 0,
    }))
  }, [generateAdaptiveLevel, levelMetrics, gameState.level])

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case "w":
        case "arrowup":
          e.preventDefault()
          movePlayer(0, -1)
          break
        case "s":
        case "arrowdown":
          e.preventDefault()
          movePlayer(0, 1)
          break
        case "a":
        case "arrowleft":
          e.preventDefault()
          movePlayer(-1, 0)
          break
        case "d":
        case "arrowright":
          e.preventDefault()
          movePlayer(1, 0)
          break
        case "h":
          // Hint system
          setGameState((prev) => ({ ...prev, hintsUsed: prev.hintsUsed + 1 }))
          break
        case "r":
          // Restart level
          initializeLevel()
          break
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [movePlayer, initializeLevel])

  // Render game
  const renderGame = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const theme = THEMES[gameState.theme]

    // Clear canvas
    ctx.fillStyle = theme.bg
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)

    // Render tiles
    gameState.currentMap.forEach((row, y) => {
      row.forEach((tile, x) => {
        const pixelX = x * TILE_SIZE
        const pixelY = y * TILE_SIZE

        switch (tile) {
          case TILES.WALL:
            ctx.fillStyle = theme.wall
            ctx.fillRect(pixelX, pixelY, TILE_SIZE, TILE_SIZE)
            break
          case TILES.KEY:
            ctx.fillStyle = "#FFD700"
            ctx.fillRect(pixelX + 8, pixelY + 8, TILE_SIZE - 16, TILE_SIZE - 16)
            ctx.fillStyle = "#000"
            ctx.font = "20px Arial"
            ctx.textAlign = "center"
            ctx.fillText("🗝️", pixelX + TILE_SIZE / 2, pixelY + TILE_SIZE / 2 + 7)
            break
          case TILES.DOOR:
            ctx.fillStyle = "#8B4513"
            ctx.fillRect(pixelX, pixelY, TILE_SIZE, TILE_SIZE)
            ctx.fillStyle = "#000"
            ctx.font = "20px Arial"
            ctx.textAlign = "center"
            ctx.fillText("🚪", pixelX + TILE_SIZE / 2, pixelY + TILE_SIZE / 2 + 7)
            break
          case TILES.GOAL:
            ctx.fillStyle = "#00FF00"
            ctx.fillRect(pixelX, pixelY, TILE_SIZE, TILE_SIZE)
            ctx.fillStyle = "#000"
            ctx.font = "20px Arial"
            ctx.textAlign = "center"
            ctx.fillText("🎯", pixelX + TILE_SIZE / 2, pixelY + TILE_SIZE / 2 + 7)
            break
          case TILES.TRAP:
            ctx.fillStyle = "#FF0000"
            ctx.fillRect(pixelX + 4, pixelY + 4, TILE_SIZE - 8, TILE_SIZE - 8)
            ctx.fillStyle = "#000"
            ctx.font = "16px Arial"
            ctx.textAlign = "center"
            ctx.fillText("⚠️", pixelX + TILE_SIZE / 2, pixelY + TILE_SIZE / 2 + 5)
            break
          default:
            ctx.fillStyle = theme.empty
            ctx.fillRect(pixelX, pixelY, TILE_SIZE, TILE_SIZE)
            break
        }

        // Grid lines
        ctx.strokeStyle = "#333"
        ctx.lineWidth = 1
        ctx.strokeRect(pixelX, pixelY, TILE_SIZE, TILE_SIZE)
      })
    })

    // Render player
    const playerPixelX = gameState.playerPos.x * TILE_SIZE
    const playerPixelY = gameState.playerPos.y * TILE_SIZE

    ctx.fillStyle = "#0066FF"
    ctx.beginPath()
    ctx.arc(playerPixelX + TILE_SIZE / 2, playerPixelY + TILE_SIZE / 2, TILE_SIZE / 3, 0, 2 * Math.PI)
    ctx.fill()

    ctx.fillStyle = "#FFF"
    ctx.font = "16px Arial"
    ctx.textAlign = "center"
    ctx.fillText("👤", playerPixelX + TILE_SIZE / 2, playerPixelY + TILE_SIZE / 2 + 5)
  }, [gameState])

  // Initialize first level
  useEffect(() => {
    initializeLevel()
  }, [])

  // Render game loop
  useEffect(() => {
    renderGame()
  }, [renderGame])

  const nextLevel = () => {
    setGameState((prev) => ({ ...prev, level: prev.level + 1 }))
    setShowLevelComplete(false)
    initializeLevel()
  }

  const restartLevel = () => {
    setGameState((prev) => ({ ...prev, retries: prev.retries + 1 }))
    initializeLevel()
  }

  const useHint = () => {
    setGameState((prev) => ({ ...prev, hintsUsed: prev.hintsUsed + 1 }))
    // Simple hint: highlight path to nearest key or goal
    alert("Hint: Look for keys (🗝️) first, then unlock doors (🚪) to reach the goal (🎯)!")
  }

  const elapsedTime = Math.floor((Date.now() - gameState.startTime) / 1000)

  return (
    <div className="flex flex-col items-center gap-4 p-4 bg-gradient-to-br from-blue-50 to-purple-50 min-h-screen">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Puzzle Adventure</h1>
        <p className="text-gray-600">Navigate mazes, collect keys, avoid traps!</p>
      </div>

      {/* Game Stats */}
      <div className="flex flex-wrap gap-4 justify-center">
        <Badge variant="secondary" className="flex items-center gap-1">
          <Trophy className="w-4 h-4" />
          Level {gameState.level}
        </Badge>
        <Badge variant="secondary" className="flex items-center gap-1">
          <Star className="w-4 h-4" />
          Score: {gameState.score}
        </Badge>
        <Badge variant="secondary" className="flex items-center gap-1">
          <Key className="w-4 h-4" />
          Keys: {gameState.keysCollected}/{gameState.totalKeys}
        </Badge>
        <Badge variant="secondary" className="flex items-center gap-1">
          <Clock className="w-4 h-4" />
          Time: {elapsedTime}s
        </Badge>
        <Badge variant="secondary" className="flex items-center gap-1">
          <Move className="w-4 h-4" />
          Moves: {gameState.moves}
        </Badge>
      </div>

      {/* Game Canvas */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={GAME_WIDTH}
          height={GAME_HEIGHT}
          className="border-2 border-gray-300 rounded-lg shadow-lg bg-white"
        />

        {/* Game Controls Overlay */}
        <div className="absolute top-2 right-2 flex flex-col gap-1">
          <Button size="sm" variant="outline" onClick={useHint}>
            💡 Hint
          </Button>
          <Button size="sm" variant="outline" onClick={restartLevel}>
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Controls Info */}
      <div className="text-center text-sm text-gray-600">
        <p>Use WASD or Arrow Keys to move • H for Hint • R to Restart</p>
        <p>Collect keys 🗝️ to unlock doors 🚪 • Avoid traps ⚠️ • Reach the goal 🎯</p>
      </div>

      {/* Player Progress */}
      <Card className="w-full max-w-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Player Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>XP</span>
              <span>{gameState.xp}</span>
            </div>
            <Progress value={gameState.xp % 100} className="h-2" />
          </div>
          <div className="flex justify-between text-sm">
            <span>Coins: {gameState.coins}</span>
            <span>Retries: {gameState.retries}</span>
          </div>
        </CardContent>
      </Card>

      {/* Level Complete Modal */}
      {showLevelComplete && levelMetrics && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl text-green-600">Level Complete!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-4xl mb-2">🎉</div>
                <p className="text-lg font-semibold">Level {gameState.level} Completed!</p>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Time:</span>
                  <span>{Math.floor(levelMetrics.timeToComplete / 1000)}s</span>
                </div>
                <div className="flex justify-between">
                  <span>Moves:</span>
                  <span>{levelMetrics.movesUsed}</span>
                </div>
                <div className="flex justify-between">
                  <span>Retries:</span>
                  <span>{levelMetrics.retriesUsed}</span>
                </div>
                <div className="flex justify-between">
                  <span>Hints Used:</span>
                  <span>{levelMetrics.hintsUsed}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={nextLevel} className="flex-1">
                  Next Level
                </Button>
                <Button onClick={restartLevel} variant="outline">
                  Replay
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
