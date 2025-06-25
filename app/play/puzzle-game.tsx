"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Trophy, Clock, Move, RotateCcw, Star, Key, Home, Lightbulb } from "lucide-react"
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

// Helper to rotate a 2D array 90 degrees clockwise
function rotateMatrix(matrix: number[][]): number[][] {
  const N = matrix.length;
  const result = Array.from({ length: N }, () => Array(N).fill(0));
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      result[x][N - 1 - y] = matrix[y][x];
    }
  }
  return result;
}

// Helper to rotate a position 90 degrees clockwise in an NxN grid
function rotatePos(pos: {x: number, y: number}, N: number): {x: number, y: number} {
  return { x: N - 1 - pos.y, y: pos.x };
}

// Helper to get all empty positions
function getEmptyPositions(map: number[][]): {x: number, y: number}[] {
  const positions: {x: number, y: number}[] = [];
  for (let y = 0; y < map.length; y++) {
    for (let x = 0; x < map.length; x++) {
      if (map[y][x] === TILES.EMPTY) positions.push({ x, y });
    }
  }
  return positions;
}

export default function PuzzleAdventureGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { toast } = useToast()
  const [isClient, setIsClient] = useState(false);
  const [userData, setUserData] = useState({
    level: 1,
    score: 0,
    xp: 0,
    coins: 0,
  });
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
    startTime: 0,
    moves: 0,
    retries: 0,
    hintsUsed: 0,
    theme: "FOREST",
  });
  const [showLevelComplete, setShowLevelComplete] = useState(false);
  const [levelMetrics, setLevelMetrics] = useState<LevelMetrics | null>(null);
  const [shake, setShake] = useState(false);
  const [dangerBg, setDangerBg] = useState(false);
  const [reachableTiles, setReachableTiles] = useState<{x: number, y: number}[]>([]);
  const [isRotating, setIsRotating] = useState(false);
  const themes = Object.keys(THEMES) as (keyof typeof THEMES)[];
  const [difficulty, setDifficulty] = useState('medium');
  const [score, setScore] = useState<number | null>(null);
  const [hintTile, setHintTile] = useState<{x: number, y: number} | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load user data on client side to prevent hydration mismatch
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedUserData = getUserData();
      setUserData(savedUserData);
      setGameState(prev => ({
        ...prev,
        level: savedUserData.level,
        score: savedUserData.score,
        xp: savedUserData.xp,
        coins: savedUserData.coins,
        startTime: Date.now(),
      }));
      
      // Load difficulty setting
      const savedDifficulty = localStorage.getItem('puzzleDifficulty') || 'medium';
      setDifficulty(savedDifficulty);
    }
  }, []);

  // Touch controls for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!canvasRef.current || gameState.gameStatus !== "playing") return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    // Convert touch position to grid coordinates
    const gridSize = gameState.currentMap.length;
    const tileSize = Math.min(rect.width, rect.height) / gridSize;
    const gridX = Math.floor(x / tileSize);
    const gridY = Math.floor(y / tileSize);
    
    // Check if touch is on a valid adjacent tile
    const playerX = gameState.playerPos.x;
    const playerY = gameState.playerPos.y;
    
    if (gridX === playerX && gridY === playerY - 1) {
      movePlayer(0, -1); // Up
    } else if (gridX === playerX && gridY === playerY + 1) {
      movePlayer(0, 1); // Down
    } else if (gridX === playerX - 1 && gridY === playerY) {
      movePlayer(-1, 0); // Left
    } else if (gridX === playerX + 1 && gridY === playerY) {
      movePlayer(1, 0); // Right
    }
  }, [gameState.playerPos, gameState.currentMap.length, gameState.gameStatus]);

  // Swipe controls for mobile
  const [touchStart, setTouchStart] = useState<{x: number, y: number} | null>(null);
  
  const handleTouchStartSwipe = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
  }, []);

  const handleTouchEndSwipe = useCallback((e: React.TouchEvent) => {
    if (!touchStart || gameState.gameStatus !== "playing") return;
    
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;
    const minSwipeDistance = 30;
    
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal swipe
      if (Math.abs(deltaX) > minSwipeDistance) {
        if (deltaX > 0) {
          movePlayer(1, 0); // Right
        } else {
          movePlayer(-1, 0); // Left
        }
      }
    } else {
      // Vertical swipe
      if (Math.abs(deltaY) > minSwipeDistance) {
        if (deltaY > 0) {
          movePlayer(0, 1); // Down
        } else {
          movePlayer(0, -1); // Up
        }
      }
    }
    
    setTouchStart(null);
  }, [touchStart, gameState.gameStatus]);

  const saveProgress = useCallback(() => {
    saveUserData({
      level: gameState.level,
      score: gameState.score,
      xp: gameState.xp,
      coins: gameState.coins,
    });
  }, [gameState.level, gameState.score, gameState.xp, gameState.coins]);

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
      baseSize = 20;
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

    // Ensure the goal is present after all placements
    let goalFound = false;
    for (let y = 0; y < baseSize; y++) {
      for (let x = 0; x < baseSize; x++) {
        if (map[y][x] === TILES.GOAL) goalFound = true;
      }
    }
    if (!goalFound) {
      // Place goal on a random non-wall, non-player tile
      const candidates: {x: number, y: number}[] = [];
      for (let y = 0; y < baseSize; y++) {
        for (let x = 0; x < baseSize; x++) {
          if (map[y][x] !== TILES.WALL && !(x === startPos.x && y === startPos.y)) {
            candidates.push({ x, y });
          }
        }
      }
      if (candidates.length > 0) {
        const idx = Math.floor(Math.random() * candidates.length);
        const { x, y } = candidates[idx];
        map[y][x] = TILES.GOAL;
      }
    }

    return { map, totalKeys: keyCount }
  }, [getDifficulty])

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

        // Clear hint highlights after a move
        setHintTile(null);
        setReachableTiles([]);

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

        if (getDifficulty() === 'hard' && (newState.moves > 0 && newState.moves % 20 === 0)) {
          setIsRotating(true)
          setTimeout(() => setIsRotating(false), 700)
          // Rotate map
          const N = map.length;
          const rotatedMap = rotateMatrix(map);
          // Rotate player position
          newState.playerPos = rotatePos(newState.playerPos, N);
          // Move keys and goal to new random empty positions
          // Remove all keys and goal
          for (let y = 0; y < N; y++) {
            for (let x = 0; x < N; x++) {
              if (rotatedMap[y][x] === TILES.KEY || rotatedMap[y][x] === TILES.GOAL) {
                rotatedMap[y][x] = TILES.EMPTY;
              }
            }
          }
          // Place keys
          let keysToPlace = newState.totalKeys;
          let empty = getEmptyPositions(rotatedMap);
          while (keysToPlace > 0 && empty.length > 0) {
            const idx = Math.floor(Math.random() * empty.length);
            const { x, y } = empty[idx];
            rotatedMap[y][x] = TILES.KEY;
            empty.splice(idx, 1);
            keysToPlace--;
          }
          // Place goal
          empty = getEmptyPositions(rotatedMap);
          if (empty.length > 0) {
            const idx = Math.floor(Math.random() * empty.length);
            const { x, y } = empty[idx];
            rotatedMap[y][x] = TILES.GOAL;
          } else {
            // If no empty tile, forcibly replace a random non-wall tile with the goal
            const candidates: {x: number, y: number}[] = [];
            for (let y = 0; y < N; y++) {
              for (let x = 0; x < N; x++) {
                if (rotatedMap[y][x] !== TILES.WALL) candidates.push({ x, y });
              }
            }
            if (candidates.length > 0) {
              const idx = Math.floor(Math.random() * candidates.length);
              const { x, y } = candidates[idx];
              rotatedMap[y][x] = TILES.GOAL;
            }
          }
          newState.currentMap = rotatedMap;
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

  // Initialize first level
  useEffect(() => {
    initializeLevel()
  }, [])

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
    // Find the goal position
    const map = gameState.currentMap;
    const size = map.length;
    let goal: {x: number, y: number} | null = null;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (map[y][x] === TILES.GOAL) {
          goal = { x, y };
          break;
        }
      }
      if (goal) break;
    }
    if (!goal) {
      toast({ title: "No goal found!", description: "Cannot provide a hint." });
      return;
    }
    // BFS to find shortest path
    const visited = Array(size).fill(null).map(() => Array(size).fill(false));
    const parent: ({x:number,y:number}|null)[][] = Array(size).fill(null).map(() => Array(size).fill(null));
    const queue = [gameState.playerPos];
    visited[gameState.playerPos.y][gameState.playerPos.x] = true;
    const directions = [
      { x: 0, y: 1 },
      { x: 1, y: 0 },
      { x: 0, y: -1 },
      { x: -1, y: 0 },
    ];
    let found = false;
    while (queue.length > 0 && !found) {
      const current = queue.shift()!;
      for (const dir of directions) {
        const newX = current.x + dir.x;
        const newY = current.y + dir.y;
        if (
          newX >= 0 && newX < size &&
          newY >= 0 && newY < size &&
          !visited[newY][newX]
        ) {
          const tile = map[newY][newX];
          // Allow movement if tile is EMPTY, KEY, GOAL, or DOOR (if player has a key)
          if (
            tile === TILES.EMPTY ||
            tile === TILES.KEY ||
            tile === TILES.GOAL ||
            (tile === TILES.DOOR && gameState.keysCollected > 0)
          ) {
            visited[newY][newX] = true;
            parent[newY][newX] = current;
            queue.push({ x: newX, y: newY });
            if (newX === goal.x && newY === goal.y) {
              found = true;
              break;
            }
          }
          // Still block WALL and TRAP
        }
      }
    }
    if (!found) {
      // No path to goal: highlight all adjacent possible moves
      const possibleMoves: {x: number, y: number}[] = [];
      for (const dir of directions) {
        const newX = gameState.playerPos.x + dir.x;
        const newY = gameState.playerPos.y + dir.y;
        if (
          newX >= 0 && newX < size &&
          newY >= 0 && newY < size
        ) {
          const tile = map[newY][newX];
          if (
            tile === TILES.EMPTY ||
            tile === TILES.KEY ||
            tile === TILES.GOAL ||
            (tile === TILES.DOOR && gameState.keysCollected > 0)
          ) {
            possibleMoves.push({ x: newX, y: newY });
          }
        }
      }
      if (possibleMoves.length > 0) {
        setReachableTiles(possibleMoves);
        setTimeout(() => setReachableTiles([]), 3000);
        toast({ title: "No path to goal!", description: "Try moving to a highlighted square!" });
      } else {
        toast({ title: "No moves available!", description: "You are stuck." });
      }
      return;
    }
    // Reconstruct path from goal to player
    let path = [];
    let cur = goal;
    while (cur && (cur.x !== gameState.playerPos.x || cur.y !== gameState.playerPos.y)) {
      path.push(cur);
      const next = parent[cur.y][cur.x];
      if (!next) break;
      cur = next;
    }
    path = path.reverse();
    // The first step is path[0] (next move)
    if (path.length > 0) {
      setHintTile(path[0]);
      setTimeout(() => setHintTile(null), 3000);
      toast({ title: "Hint", description: "Try moving to the highlighted square!" });
    } else {
      toast({ title: "Already at goal!", description: "You're already at the goal." });
    }
  };

  const elapsedTime = Math.floor((Date.now() - gameState.startTime) / 1000)

  function playSound(src: string) {
    try {
      if (typeof window !== 'undefined' && window.Audio) {
        const audio = new window.Audio(src);
        audio.play().catch((error) => {
          console.warn('Audio playback failed:', error);
        });
      }
    } catch (error) {
      console.warn('Audio creation failed:', error);
    }
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

  // Responsive grid: dynamically calculate TILE_SIZE based on window size and grid size
  const [containerSize, setContainerSize] = useState<{ width: number; height: number } | null>(null);
  useEffect(() => {
    function updateSize() {
      if (isMobile) {
        setContainerSize({
          width: Math.min(window.innerWidth * 0.95, 400),
          height: Math.min(window.innerHeight * 0.5, 400),
        });
      } else {
        setContainerSize({
          width: window.innerWidth * 0.9,
          height: window.innerHeight * 0.7,
        });
      }
    }
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [isMobile]);
  
  const gridSize = gameState.currentMap.length || 10;
  const TILE_SIZE = containerSize ? Math.floor(Math.min(containerSize.width, containerSize.height) / gridSize) : 0;
  const canvasWidth = TILE_SIZE * gridSize;
  const canvasHeight = TILE_SIZE * gridSize;

  const isLoading = !isClient || !containerSize || !gridSize || !TILE_SIZE || isNaN(canvasWidth) || isNaN(canvasHeight);

  useEffect(() => {
    if (gameState.level > 10) {
      // Use setTimeout to avoid setState during render
      setTimeout(() => {
        toast({ title: "Level up!" });
      }, 0);
    }
  }, [gameState.level, toast]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    // Get score from localStorage or calculate it here
    setScore(gameState.score);
  }, [gameState.score]);

  const renderGame = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const theme = THEMES[gameState.theme]

    ctx.fillStyle = theme.bg
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)

    gameState.currentMap.forEach((row, y) => {
      row.forEach((tile, x) => {
        const pixelX = x * TILE_SIZE
        const pixelY = y * TILE_SIZE
        // Draw the tile (no highlight overlays here)
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
    // Draw reachableTiles highlight overlays
    reachableTiles.forEach(({x, y}) => {
      const pixelX = x * TILE_SIZE;
      const pixelY = y * TILE_SIZE;
      ctx.fillStyle = "rgba(0,255,0,0.3)";
      ctx.fillRect(pixelX, pixelY, TILE_SIZE, TILE_SIZE);
    });
    // Draw hintTile highlight overlay
    if (hintTile) {
      const pixelX = hintTile.x * TILE_SIZE;
      const pixelY = hintTile.y * TILE_SIZE;
      ctx.fillStyle = "rgba(30,144,255,0.5)"; // DodgerBlue overlay
      ctx.fillRect(pixelX, pixelY, TILE_SIZE, TILE_SIZE);
    }

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
  }, [gameState, reachableTiles, hintTile, canvasWidth, canvasHeight, TILE_SIZE])

  // Render game loop
  useEffect(() => {
    renderGame()
  }, [renderGame])

  return (
    isLoading ? (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-2">Puzzle Adventure</h1>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    ) : (
      <div className="flex flex-col items-center">
        <div className="flex justify-center gap-4 mb-4">
          <Button size="icon" variant="outline" onClick={restartLevel} aria-label="Retry">
            <RotateCcw className="w-5 h-5" />
          </Button>
          <Button size="icon" variant="outline" onClick={useHint} aria-label="Hint">
            <Lightbulb className="w-5 h-5" />
          </Button>
        </div>
        <div className="game-box">
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
              <h1 className={clsx("text-3xl font-bold text-gray-800 dark:text-gray-200 mb-2", isMobile && "mobile-text text-2xl")}>Puzzle Adventure</h1>
              <p className={clsx("text-gray-600 dark:text-gray-400", isMobile && "mobile-text")}>Navigate mazes, collect keys, avoid traps!</p>
            </div>

            {/* Game Stats */}
            <div className={clsx("flex flex-wrap gap-4 justify-center", isMobile && "mobile-spacing")}>
              <Badge variant="secondary" className={clsx("flex items-center gap-1", isMobile && "mobile-badge")}>
                <Trophy className="w-4 h-4" />
                Level {gameState.level}
              </Badge>
              <Badge variant="secondary" className={clsx("flex items-center gap-1", isMobile && "mobile-badge")}>
                <Star className="w-4 h-4" />
                Score: {score !== null ? score : ''}
              </Badge>
              <Badge variant="secondary" className={clsx("flex items-center gap-1", isMobile && "mobile-badge")}>
                <Key className="w-4 h-4" />
                Keys: {gameState.keysCollected}/{gameState.totalKeys}
              </Badge>
              <Badge variant="secondary" className={clsx("flex items-center gap-1", isMobile && "mobile-badge")}>
                <Clock className="w-4 h-4" />
                Time: {elapsedTime}s
              </Badge>
              <Badge variant="secondary" className={clsx("flex items-center gap-1", isMobile && "mobile-badge")}>
                <Move className="w-4 h-4" />
                Moves: {gameState.moves}
              </Badge>
            </div>

            {/* Game Canvas */}
            <div className={clsx("relative", isRotating && "rotate-animation")}>
              <canvas
                ref={canvasRef}
                width={canvasWidth}
                height={canvasHeight}
                className="border-2 border-gray-300 rounded-lg shadow-lg bg-white"
                onTouchStart={isMobile ? handleTouchStartSwipe : handleTouchStart}
                onTouchEnd={isMobile ? handleTouchEndSwipe : undefined}
                style={{
                  maxWidth: '100vw',
                  maxHeight: '60vh',
                  touchAction: 'none', // Prevent default touch behaviors
                }}
              />
              
              {/* Mobile Touch Controls */}
              {isMobile && (
                <div className="mt-4 grid grid-cols-3 gap-2 max-w-xs mx-auto">
                  <div></div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-12 h-12 rounded-full mobile-control-btn touch-active"
                    onClick={() => movePlayer(0, -1)}
                  >
                    ↑
                  </Button>
                  <div></div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-12 h-12 rounded-full mobile-control-btn touch-active"
                    onClick={() => movePlayer(-1, 0)}
                  >
                    ←
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-12 h-12 rounded-full mobile-control-btn touch-active"
                    onClick={() => movePlayer(0, 1)}
                  >
                    ↓
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-12 h-12 rounded-full mobile-control-btn touch-active"
                    onClick={() => movePlayer(1, 0)}
                  >
                    →
                  </Button>
                </div>
              )}
            </div>

            {/* Controls Info */}
            <div className={clsx("text-center text-sm text-gray-600 dark:text-gray-400", isMobile && "mobile-text")}>
              {isMobile ? (
                <div>
                  <p>Tap adjacent tiles or use arrow buttons to move</p>
                  <p>Swipe on the game area for quick movement</p>
                  <p>Collect keys 🗝️ to unlock doors 🚪 • Avoid traps ⚠️ • Reach the goal 🎯</p>
                </div>
              ) : (
                <div>
                  <p>Use WASD or Arrow Keys to move • H for Hint • R to Restart</p>
                  <p>Collect keys 🗝️ to unlock doors 🚪 • Avoid traps ⚠️ • Reach the goal 🎯</p>
                </div>
              )}
            </div>

            {/* Player Progress */}
            <Card className={clsx("w-full max-w-md", isMobile && "mobile-card")}>
              <CardHeader className="pb-2">
                <CardTitle className={clsx("text-lg", isMobile && "mobile-text")}>Player Progress</CardTitle>
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
        </div>
      </div>
    )
  )
}
