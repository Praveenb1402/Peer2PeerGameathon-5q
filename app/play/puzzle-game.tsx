"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Trophy, Clock, Move, RotateCcw, Star, Key, Home } from "lucide-react"
import { getUserData, saveUserData } from "@/lib/storage"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import clsx from 'clsx'

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

interface CompletionData {
  timeToComplete: number
  movesUsed: number
  retriesUsed: number
  hintsUsed: number
  difficultyScore: number
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
  completionData?: CompletionData
}

interface LevelMetrics {
  timeToComplete: number
  movesUsed: number
  retriesUsed: number
  hintsUsed: number
  difficultyScore: number
}

// Get difficulty from localStorage
const getDifficulty = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('puzzleDifficulty') || 'medium';
  }
  return 'medium';
};

export default function PuzzleAdventureGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { toast } = useToast()
  const [userData, setUserData] = useState(getUserData())

  const [gameState, setGameState] = useState<GameState>({
    level: userData.level,
    score: userData.score,
    xp: userData.xp,
    coins: userData.coins,
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
  const [shake, setShake] = useState(false)
  const [dangerBg, setDangerBg] = useState(false)
  const [reachableTiles, setReachableTiles] = useState<{x: number, y: number}[]>([])

  const themes = Object.keys(THEMES) as (keyof typeof THEMES)[]

  // Update theme on every level change
  useEffect(() => {
    setGameState((prev) => ({
      ...prev,
      theme: themes[(prev.level - 1) % themes.length],
    }))
  }, [gameState.level])

  // Save progress to localStorage
  const saveProgress = useCallback(() => {
    saveUserData({
      level: gameState.level,
      score: gameState.score,
      xp: gameState.xp,
      coins: gameState.coins,
    })
  }, [gameState])

  // ML-powered adaptive level generation with proper pathfinding
  const generateAdaptiveLevel = useCallback((metrics: LevelMetrics | null, level: number) => {
    const difficultySetting = getDifficulty();
    let baseSize = 10;
    let wallMultiplier = 6;
    let trapMultiplier = 0.5;
    if (difficultySetting === 'easy') {
      baseSize = 8;
      wallMultiplier = 4;
      trapMultiplier = 0.3;
    } else if (difficultySetting === 'hard') {
      baseSize = 16;
      wallMultiplier = 10;
      trapMultiplier = 1.2;
    } else if (difficultySetting === 'medium') {
      baseSize = 12;
      wallMultiplier = 7;
      trapMultiplier = 0.7;
    }
    let difficulty = Math.min(level * 0.3, 4)
    if (metrics) {
      if (metrics.timeToComplete < 30000) difficulty += 0.3
      if (metrics.movesUsed < 25) difficulty += 0.2
      if (metrics.retriesUsed > 2) difficulty -= 0.4
      if (metrics.hintsUsed > 1) difficulty -= 0.3
    }
    difficulty = Math.max(0.5, Math.min(difficulty, 4))
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

    const startPos = { x: 1, y: 1 }
    const goalPos = { x: baseSize - 2, y: baseSize - 2 }
    map[goalPos.y][goalPos.x] = TILES.GOAL

    // Create guaranteed path
    const createPath = (from: { x: number; y: number }, to: { x: number; y: number }) => {
      const current = { ...from }
      const path = [current]

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

    const mainPath = createPath(startPos, goalPos)

    // Add walls strategically
    const wallCount = Math.floor(difficulty * wallMultiplier)
    let wallsPlaced = 0
    let attempts = 0

    while (wallsPlaced < wallCount && attempts < 50) {
      const x = Math.floor(Math.random() * (baseSize - 2)) + 1
      const y = Math.floor(Math.random() * (baseSize - 2)) + 1

      const isOnMainPath = mainPath.some((p) => p.x === x && p.y === y)

      if (!isOnMainPath && map[y][x] === TILES.EMPTY) {
        map[y][x] = TILES.WALL

        if (isPathExists(map, startPos, goalPos, baseSize)) {
          wallsPlaced++
        } else {
          map[y][x] = TILES.EMPTY
        }
      }
      attempts++
    }

    // Add keys
    const keyCount = Math.max(1, Math.floor(difficulty / 2))
    let keysPlaced = 0
    attempts = 0

    while (keysPlaced < keyCount && attempts < 30) {
      const x = Math.floor(Math.random() * (baseSize - 2)) + 1
      const y = Math.floor(Math.random() * (baseSize - 2)) + 1

      if (
        map[y][x] === TILES.EMPTY &&
        !(x === startPos.x && y === startPos.y) &&
        isPathExists(map, startPos, { x, y }, baseSize)
      ) {
        map[y][x] = TILES.KEY
        keysPlaced++
      }
      attempts++
    }

    // Add doors
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

    // Add traps
    const trapCount = Math.floor(difficulty * trapMultiplier * baseSize)
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

  // Handle player movement
  const movePlayer = useCallback(
    (dx: number, dy: number) => {
      if (gameState.gameStatus !== "playing") return

      setGameState((prev) => {
        const newX = prev.playerPos.x + dx
        const newY = prev.playerPos.y + dy
        const map = [...prev.currentMap.map((row) => [...row])]

        if (newX < 0 || newX >= map[0].length || newY < 0 || newY >= map.length) {
          return prev
        }

        const targetTile = map[newY][newX]

        if (targetTile === TILES.WALL) {
          return prev
        }

        if (targetTile === TILES.DOOR && prev.keysCollected === 0) {
          toast({
            title: "Door Locked!",
            description: "You need a key to pass through this door.",
            variant: "destructive",
          })
          return prev
        }

        const newState = { ...prev }
        newState.playerPos = { x: newX, y: newY }
        newState.moves += 1

        if (targetTile === TILES.KEY) {
          map[newY][newX] = TILES.EMPTY
          newState.keysCollected += 1
          newState.coins += 10
          newState.currentMap = map
          toast({
            title: "Key Collected!",
            description: "+10 coins earned",
          })
          playSound('/key.mp3')
        } else if (targetTile === TILES.DOOR && prev.keysCollected > 0) {
          map[newY][newX] = TILES.EMPTY
          newState.keysCollected -= 1
          newState.currentMap = map
          newState.score += 50
          toast({
            title: "Door Unlocked!",
            description: "+50 points earned",
          })
        } else if (targetTile === TILES.TRAP) {
          newState.playerPos = { x: 1, y: 1 }
          newState.retries += 1
          newState.score = Math.max(0, newState.score - 25)
          toast({
            title: "Trap Triggered!",
            description: "You've been reset to the start. -25 points",
            variant: "destructive",
          })
          playSound('/danger.mp3')
          setShake(true)
          setDangerBg(true)
          setTimeout(() => {
            setShake(false)
            setDangerBg(false)
          }, 600)
        } else if (targetTile === TILES.GOAL) {
          newState.gameStatus = "completed"

          const timeToComplete = Date.now() - prev.startTime
          const timeBonus = Math.max(0, Math.floor((120000 - timeToComplete) / 1000))
          const moveBonus = Math.max(0, (100 - newState.moves) * 5)
          const levelBonus = prev.level * 100
          const perfectBonus = newState.retries === 0 ? prev.level * 50 : 0

          newState.score += timeBonus + moveBonus + levelBonus + perfectBonus
          newState.xp += prev.level * 50 + perfectBonus
          newState.coins += prev.level * 20

          // Store completion data for later processing
          newState.completionData = {
            timeToComplete,
            movesUsed: newState.moves,
            retriesUsed: newState.retries,
            hintsUsed: newState.hintsUsed,
            difficultyScore: prev.level * 0.5,
          }

          toast({
            title: "Level Complete!",
            description: `+${timeBonus + moveBonus + levelBonus + perfectBonus} points earned!`,
          })
        }

        return newState
      })
    },
    [gameState.gameStatus, toast],
  )

  const initializeLevel = useCallback(() => {
    const { map, totalKeys } = generateAdaptiveLevel(levelMetrics, gameState.level)
    const themes = Object.keys(THEMES) as (keyof typeof THEMES)[]
    const theme = themes[Math.floor(Math.random() * themes.length)]

    setGameState((prev) => ({
      ...prev,
      currentMap: map,
      playerPos: { x: 1, y: 1 },
      keysCollected: 0,
      totalKeys: totalKeys,
      gameStatus: "playing",
      startTime: Date.now(),
      moves: 0,
      theme,
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
          useHint()
          break
        case "r":
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

    ctx.fillStyle = theme.bg
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)

    gameState.currentMap.forEach((row, y) => {
      row.forEach((tile, x) => {
        const pixelX = x * TILE_SIZE
        const pixelY = y * TILE_SIZE

        // Highlight reachable tiles
        if (reachableTiles.some(t => t.x === x && t.y === y)) {
          ctx.fillStyle = "rgba(0,255,0,0.3)";
          ctx.fillRect(pixelX, pixelY, TILE_SIZE, TILE_SIZE);
        }

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

    // Draw the player icon (👤) at the player's current position
    ctx.fillStyle = "#FFF"
    ctx.font = "16px Arial"
    ctx.textAlign = "center"
    ctx.fillText("👤", playerPixelX + TILE_SIZE / 2, playerPixelY + TILE_SIZE / 2 + 5)
  }, [gameState, reachableTiles])

  // Initialize first level
  useEffect(() => {
    initializeLevel()
  }, [])

  // Render game loop
  useEffect(() => {
    renderGame()
  }, [renderGame])

  // Save progress when game state changes
  useEffect(() => {
    saveProgress()
  }, [saveProgress])

  // Handle level completion
  useEffect(() => {
    if (gameState.gameStatus === "completed" && gameState.completionData) {
      const metrics: LevelMetrics = gameState.completionData
      setLevelMetrics(metrics)
      setShowLevelComplete(true)

      // Check for achievements
      const achievements = []
      if (gameState.retries === 0) achievements.push("Perfect Run")
      if (metrics.timeToComplete < 30000) achievements.push("Speed Runner")
      if (metrics.movesUsed < 25) achievements.push("Efficient Navigator")

      if (achievements.length > 0) {
        const currentUserData = getUserData()
        const newAchievements = [...currentUserData.achievements, ...achievements]
        saveUserData({ achievements: newAchievements })
      }

      // Clear completion data
      setGameState((prev) => ({ ...prev, completionData: undefined }))
    }
  }, [gameState.gameStatus, gameState.completionData, gameState.retries])

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
    toast({
      title: "Hint",
      description: "Look for keys (🗝️) first, then unlock doors (🚪) to reach the goal (🎯)!",
    })
    // Compute reachable tiles from player position
    const map = gameState.currentMap;
    const size = map.length;
    const visited = Array(size).fill(null).map(() => Array(size).fill(false));
    const queue = [gameState.playerPos];
    visited[gameState.playerPos.y][gameState.playerPos.x] = true;
    const reachable: {x: number, y: number}[] = [];
    const directions = [
      { x: 0, y: 1 },
      { x: 1, y: 0 },
      { x: 0, y: -1 },
      { x: -1, y: 0 },
    ];
    while (queue.length > 0) {
      const current = queue.shift()!;
      reachable.push(current);
      for (const dir of directions) {
        const newX = current.x + dir.x;
        const newY = current.y + dir.y;
        if (
          newX >= 0 && newX < size &&
          newY >= 0 && newY < size &&
          !visited[newY][newX] &&
          map[newY][newX] !== TILES.WALL &&
          map[newY][newX] !== TILES.TRAP
        ) {
          visited[newY][newX] = true;
          queue.push({ x: newX, y: newY });
        }
      }
    }
    setReachableTiles(reachable);
    setTimeout(() => setReachableTiles([]), 3000);
  }

  const elapsedTime = Math.floor((Date.now() - gameState.startTime) / 1000)

  function playSound(src: string) {
    const audio = new window.Audio(src)
    audio.play()
  }

  // Move traps (bombs) every 2-3 seconds
  useEffect(() => {
    const difficultySetting = getDifficulty();
    if (gameState.gameStatus !== "playing" || difficultySetting === 'easy') return;
    const interval = setInterval(() => {
      setGameState((prev) => {
        const map = prev.currentMap.map((row) => [...row]);
        const trapPositions: { x: number; y: number }[] = [];
        // Find all current traps
        for (let y = 0; y < map.length; y++) {
          for (let x = 0; x < map[y].length; x++) {
            if (map[y][x] === TILES.TRAP) {
              trapPositions.push({ x, y });
            }
          }
        }
        // Remove all traps
        trapPositions.forEach(({ x, y }) => {
          map[y][x] = TILES.EMPTY;
        });
        // Place traps at new random empty positions
        trapPositions.forEach(() => {
          let placed = false;
          let attempts = 0;
          while (!placed && attempts < 50) {
            const x = Math.floor(Math.random() * map[0].length);
            const y = Math.floor(Math.random() * map.length);
            if (
              map[y][x] === TILES.EMPTY &&
              !(x === prev.playerPos.x && y === prev.playerPos.y)
            ) {
              map[y][x] = TILES.TRAP;
              placed = true;
            }
            attempts++;
          }
        });
        return { ...prev, currentMap: map };
      });
    }, 2000 + Math.random() * 1000); // 2-3 seconds
    return () => clearInterval(interval);
  }, [gameState.gameStatus]);

  return (
    <div
      className={clsx(
        "flex flex-col items-center gap-4 p-4",
        shake && "animate-shake",
      )}
      style={{
        background: dangerBg ? '#ff0000' : THEMES[gameState.theme].bg,
        minHeight: '100vh',
        transition: 'background 0.5s',
      }}
    >
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-2">Puzzle Adventure</h1>
        <p className="text-gray-600 dark:text-gray-400">Navigate mazes, collect keys, avoid traps!</p>
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
          <Link href="/">
            <Button size="sm" variant="outline">
              <Home className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Controls Info */}
      <div className="text-center text-sm text-gray-600 dark:text-gray-400">
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
