# 2d puzzle game design

*Automatically synced with your [v0.dev](https://v0.dev) deployments*

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/praveenb1402-2127s-projects/v0-2d-puzzle-game-design)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.dev-black?style=for-the-badge)](https://v0.dev/chat/projects/9XAkEfNa89o)

🕹️ Peer2Peer Gameathon
A fun, interactive puzzle adventure game built with Next.js and React!
Navigate mazes, collect keys, avoid traps, and reach the goal. Features dynamic difficulty, custom challenges, sound effects, and a modern UI.
🚀 Features
Dynamic Puzzle Adventure: Procedurally generated mazes with increasing difficulty.
3D Character Support: (Optional) Integrate animated 3D characters.
Sound Effects: Audio feedback for collecting keys, triggering traps, and more.
Moving Traps: Traps (bombs) move every few seconds on higher difficulties.
Difficulty Selection: Choose from Easy, Medium, or Hard before playing.
Map Rotation: In Hard mode, the map rotates and randomizes every 20 moves.
Hints: Get visual hints for your next move.
Responsive Design: Game grid always fits your screen.
Custom Challenges: Create and play your own custom levels (via the Add Content page).
Modern UI: Playful fonts, badges, gradients, and animations.

🗺️ Project Structure

app/
  play/                # Main game logic and UI
  add-content/         # Create custom challenges
  rewards/             # Rewards and achievements
  settings/            # Game settings
components/            # Reusable UI components
lib/                   # Utility and storage helpers
public/                # Static assets (images, sounds, 3D models)
styles/                # Global and Tailwind CSS


🎮 Controls
WASD / Arrow Keys: Move player
H: Show hint
R: Restart level
Click Buttons: Retry, Hint, etc.

📝 Custom Challenges
Go to /add-content to create your own levels!
Fill in the challenge details and map, then save.


📦 Dependencies
Next.js
React
Tailwind CSS
Lucide React (icons)
clsx (utility)
Three.js (optional, for 3D)


