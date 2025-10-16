import React, { useState, useCallback, useEffect, useRef } from 'react';
import GameCanvas from './components/GameCanvas';
import { GameState, HighScore, Snake } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { ZOOM_MIN, ZOOM_MAX, ZOOM_STEP, LEADERBOARD_MAX_ENTRIES, PLAYER_NAME, MAP_WIDTH, MAP_HEIGHT } from './constants';

const GithubIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.91 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
    </svg>
);


interface ModalProps {
    children: React.ReactNode;
}
const Modal: React.FC<ModalProps> = ({ children }) => (
    <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-20 backdrop-blur-sm">
        <div className="bg-slate-900 bg-opacity-70 border border-cyan-500 rounded-lg shadow-2xl shadow-cyan-500/20 p-6 md:p-8 text-white w-full max-w-md animate-fade-in-up">
            {children}
        </div>
        <style>{`
            .orbitron { font-family: 'Orbitron', sans-serif; }
            @keyframes fade-in-up {
                from { opacity: 0; transform: translateY(20px) scale(0.95); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }
            .animate-fade-in-up {
                animation: fade-in-up 0.5s ease-out forwards;
            }
            @keyframes text-glow {
                0%, 100% { text-shadow: 0 0 5px #06b6d4, 0 0 10px #06b6d4; }
                50% { text-shadow: 0 0 10px #06b6d4, 0 0 20px #06b6d4; }
            }
            .text-glow {
                animation: text-glow 2s ease-in-out infinite;
            }
        `}</style>
    </div>
);

interface MenuProps {
  onStart: () => void;
}
const StartMenu: React.FC<MenuProps> = ({ onStart }) => (
    <Modal>
        <h1 className="text-4xl md:text-5xl font-bold text-center text-cyan-400 mb-4 tracking-wider orbitron text-glow">Cosmic Serpent</h1>
        <p className="text-gray-300 text-center mb-6">Consume stardust to grow your serpent. Avoid others in the cosmic void.</p>
        <div className="bg-slate-800 bg-opacity-50 p-4 rounded-lg mb-6 text-sm border border-slate-700">
            <h2 className="font-bold text-lg mb-2 text-cyan-300 orbitron">Controls:</h2>
            <ul className="list-disc list-inside space-y-1 text-gray-200">
                <li><span className="font-semibold text-cyan-400">Move:</span> Your serpent follows the pointer.</li>
                <li><span className="font-semibold text-cyan-400">Boost:</span> Hold click/touch to speed up (costs stardust!).</li>
                <li><span className="font-semibold text-cyan-400">Zoom:</span> Use mouse wheel or on-screen buttons.</li>
            </ul>
        </div>
        <button onClick={onStart} className="w-full bg-cyan-500 hover:bg-cyan-400 text-gray-900 font-bold py-3 px-4 rounded-lg text-xl transition-all transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-cyan-300 shadow-lg shadow-cyan-500/50 hover:shadow-cyan-400/50 orbitron">
            Enter the Void
        </button>
    </Modal>
);

interface GameOverProps {
    score: number;
    highScores: HighScore[];
    onRestart: () => void;
}
const GameOverMenu: React.FC<GameOverProps> = ({ score, highScores, onRestart }) => (
    <Modal>
        <h1 className="text-4xl font-bold text-center text-red-500 mb-2 orbitron">Supernova</h1>
        <p className="text-gray-300 text-center text-2xl mb-6">Final mass: <span className="font-bold text-white">{score}</span></p>
        <Leaderboard highScores={highScores} currentScore={score} />
        <button onClick={onRestart} className="mt-6 w-full bg-cyan-500 hover:bg-cyan-400 text-gray-900 font-bold py-3 px-4 rounded-lg text-xl transition-all transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-cyan-300 shadow-lg shadow-cyan-500/50 hover:shadow-cyan-400/50 orbitron">
            Rebirth
        </button>
    </Modal>
);

interface LeaderboardProps {
    highScores: HighScore[];
    currentScore?: number;
}
const Leaderboard: React.FC<LeaderboardProps> = ({ highScores, currentScore }) => (
    <div className="bg-slate-800 bg-opacity-50 p-4 rounded-lg border border-slate-700">
        <h2 className="text-2xl font-bold mb-4 text-center text-cyan-300 orbitron">Cosmic Legends</h2>
        <ol className="list-decimal list-inside space-y-2 text-gray-200">
            {highScores.length === 0 && <p className="text-center text-gray-400">The void is empty. Be the first legend.</p>}
            {highScores.map((entry, index) => (
                <li key={index} className={`flex justify-between p-2 rounded ${currentScore === entry.score ? 'bg-cyan-600/50' : ''}`}>
                    <span className="font-semibold">{index + 1}. {entry.name}</span>
                    <span className="font-bold">{entry.score}</span>
                </li>
            ))}
        </ol>
    </div>
);

interface MinimapProps {
    playerSnake: Snake | null;
    allSnakes: Snake[];
}
const Minimap: React.FC<MinimapProps> = ({ playerSnake, allSnakes }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const size = 150; // size of the minimap in pixels

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, size, size);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.5)'; // bg-slate-900 with opacity
        ctx.fillRect(0, 0, size, size);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)'; // border-sky-400
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, size, size);

        const scaleX = (x: number) => (x / MAP_WIDTH) * size;
        const scaleY = (y: number) => (y / MAP_HEIGHT) * size;

        allSnakes.forEach(snake => {
            if (snake.body.length > 0) {
                ctx.fillStyle = snake.isPlayer ? 'white' : snake.color;
                ctx.shadowColor = snake.isPlayer ? 'white' : snake.color;
                ctx.shadowBlur = 5;
                ctx.beginPath();
                ctx.arc(scaleX(snake.body[0].x), scaleY(snake.body[0].y), snake.isPlayer ? 3 : 2, 0, 2 * Math.PI);
                ctx.fill();
            }
        });
        ctx.shadowBlur = 0;

    }, [allSnakes]);

    return <canvas ref={canvasRef} width={size} height={size} className="rounded-lg border-2 border-slate-700/50" />;
};


interface HudProps {
    score: number;
    allSnakes: Snake[];
    onZoomIn: () => void;
    onZoomOut: () => void;
}
const HUD: React.FC<HudProps> = ({ score, allSnakes, onZoomIn, onZoomOut }) => {
    const topSnakes = [...allSnakes].sort((a,b) => b.score - a.score).slice(0, 5);
    const playerSnake = allSnakes.find(s => s.isPlayer) || null;

    return (
        <>
            {/* Top-left: Score & Zoom */}
            <div className="absolute top-4 left-4 text-white z-10 orbitron" style={{ textShadow: '0 0 5px black' }}>
                <h2 className="text-2xl font-bold">Mass: {score}</h2>
                <div className="flex flex-col items-start pointer-events-auto mt-4">
                    <button onClick={onZoomIn} className="bg-slate-800 bg-opacity-50 hover:bg-opacity-75 rounded-full w-10 h-10 flex items-center justify-center text-2xl font-bold mb-2 transition-opacity border-2 border-slate-700">+</button>
                    <button onClick={onZoomOut} className="bg-slate-800 bg-opacity-50 hover:bg-opacity-75 rounded-full w-10 h-10 flex items-center justify-center text-2xl font-bold transition-opacity border-2 border-slate-700">-</button>
                </div>
            </div>

            {/* Top-right: Leaderboard */}
            <div className="absolute top-4 right-4 text-white z-10 w-64 bg-slate-900 bg-opacity-25 p-3 rounded-lg text-sm orbitron" style={{ backdropFilter: 'blur(2px)' }}>
                <h3 className="text-lg font-bold text-center mb-2 text-cyan-300">Top Serpents</h3>
                <ol className="space-y-1">
                    {topSnakes.map((snake, index) => (
                        <li key={snake.id} className={`flex justify-between p-1 rounded ${snake.isPlayer ? 'bg-cyan-600 bg-opacity-50' : ''}`}>
                            <span className="truncate"><span className="text-gray-400">{index + 1}.</span> {snake.name}</span>
                            <span className="font-bold">{Math.floor(snake.score)}</span>
                        </li>
                    ))}
                </ol>
            </div>

            {/* Bottom-left: Minimap */}
            <div className="absolute bottom-4 left-4 z-10 pointer-events-auto">
                <Minimap playerSnake={playerSnake} allSnakes={allSnakes} />
            </div>
        </>
    );
};


const Footer: React.FC = () => (
    <div className="absolute bottom-4 right-4 z-10 text-gray-400 hover:text-cyan-400 transition-colors">
        <a href="https://github.com/gemini-ui" target="_blank" rel="noopener noreferrer" aria-label="Github Repo">
            <GithubIcon />
        </a>
    </div>
);


const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [score, setScore] = useState(0);
  const [allSnakes, setAllSnakes] = useState<Snake[]>([]);
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [highScores, setHighScores] = useLocalStorage<HighScore[]>('slither-high-scores', []);

  const handleStart = () => {
    setScore(0);
    setAllSnakes([]);
    setGameState(GameState.PLAYING);
  };
  
  const handleRestart = () => {
    setGameState(GameState.MENU);
  };

  const addHighScore = useCallback((newScore: number) => {
    const newEntry: HighScore = { name: PLAYER_NAME, score: newScore, date: new Date().toISOString() };
    setHighScores(currentHighScores => 
      [...currentHighScores, newEntry]
        .sort((a, b) => b.score - a.score)
        .slice(0, LEADERBOARD_MAX_ENTRIES)
    );
  }, [setHighScores]);

  const handleGameOver = useCallback((finalScore: number) => {
    addHighScore(finalScore);
    setGameState(GameState.GAME_OVER);
  }, [addHighScore]);

  const handleZoom = useCallback((direction: 'in' | 'out') => {
    setZoomLevel(prev => {
        const newZoom = direction === 'in' ? prev + ZOOM_STEP : prev - ZOOM_STEP;
        return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, newZoom));
    });
  }, []);
  
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
        if (e.deltaY < 0) handleZoom('in');
        else handleZoom('out');
    };
    window.addEventListener('wheel', handleWheel);
    return () => window.removeEventListener('wheel', handleWheel);
  }, [handleZoom]);

  return (
    <div className="w-screen h-screen overflow-hidden bg-gray-900 font-sans" style={{fontFamily: "'Roboto', sans-serif"}}>
      {gameState === GameState.PLAYING && (
        <>
          <HUD score={score} allSnakes={allSnakes} onZoomIn={() => handleZoom('in')} onZoomOut={() => handleZoom('out')} />
          <GameCanvas setScore={setScore} onGameOver={handleGameOver} onSnakesUpdate={setAllSnakes} zoomLevel={zoomLevel} />
        </>
      )}
      {gameState === GameState.MENU && <StartMenu onStart={handleStart} />}
      {/* FIX: Changed `Game.GAME_OVER` to `GameState.GAME_OVER` to correctly reference the enum. */}
      {gameState === GameState.GAME_OVER && (
        <GameOverMenu score={score} highScores={highScores} onRestart={handleRestart} />
      )}
      <Footer />
    </div>
  );
};

export default App;
