'use client';

import { useState, useEffect } from 'react';

const MODULES = [
    { name: 'Core_Connection.sys', weight: 10 },
    { name: 'Deep_Laughter_V2.dll', weight: 15 },
    { name: 'Trust_Protocol.pkg', weight: 20 },
    { name: 'Late_Night_Talks.bin', weight: 12 },
    { name: 'Adventure_Logs.dat', weight: 18 },
    { name: 'Unconditional_Support.exe', weight: 25 },
];

export default function LoveCompilerClient() {
    const [progress, setProgress] = useState(0);
    const [logs, setLogs] = useState<string[]>([]);
    const [isFinished, setIsFinished] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        startCompilation();
    }, []);

    const startCompilation = async () => {
        setLogs(['[SYSTEM] Initializing Love Compiler v2.14...', '[SYSTEM] Checking relationship compatibility... STATUS: 100%']);

        for (const mod of MODULES) {
            await new Promise(r => setTimeout(r, 800 + Math.random() * 1000));
            setLogs(prev => [...prev, `[BUILD] Compiling ${mod.name}...`, `[SUCCESS] ${mod.name} optimized.`]);
            setProgress(prev => Math.min(prev + mod.weight, 100));
        }

        await new Promise(r => setTimeout(r, 1000));
        setLogs(prev => [...prev, '', '[FINAL] Linking all romantic modules...', '[COMPLETE] Binary "Eternity.exe" successfully compiled.']);

        await new Promise(r => setTimeout(r, 1500));
        setIsFinished(true);
    };

    if (!mounted) return null;

    return (
        <div className="compiler-container">
            <style jsx>{`
                .compiler-container {
                    min-height: 100vh;
                    background: #0a0a0c;
                    color: #ff2d55;
                    font-family: 'JetBrains Mono', 'Fira Code', monospace;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                    overflow: hidden;
                    position: relative;
                }

                .scanline {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(to bottom, transparent 50%, rgba(255, 45, 85, 0.02) 50%);
                    background-size: 100% 4px;
                    pointer-events: none;
                    z-index: 100;
                }

                .glow {
                    position: absolute;
                    width: 400px;
                    height: 400px;
                    background: radial-gradient(circle, rgba(255, 45, 85, 0.1) 0%, transparent 70%);
                    pointer-events: none;
                }

                .terminal-card {
                    width: 100%;
                    max-width: 650px;
                    background: rgba(20, 20, 25, 0.8);
                    border: 1px solid rgba(255, 45, 85, 0.2);
                    border-radius: 12px;
                    padding: 30px;
                    box-shadow: 0 0 50px rgba(0, 0, 0, 0.5), inset 0 0 20px rgba(255, 45, 85, 0.05);
                    backdrop-filter: blur(10px);
                    position: relative;
                }

                .progress-bar-container {
                    width: 100%;
                    height: 4px;
                    background: rgba(255, 45, 85, 0.1);
                    margin: 20px 0;
                    border-radius: 2px;
                    overflow: hidden;
                }

                .progress-bar-fill {
                    height: 100%;
                    background: #ff2d55;
                    box-shadow: 0 0 10px #ff2d55;
                    transition: width 0.5s ease-out;
                }

                .log-area {
                    height: 300px;
                    overflow-y: auto;
                    font-size: 13px;
                    line-height: 1.6;
                    color: #ff2d55;
                    opacity: 0.8;
                }

                .log-line {
                    margin-bottom: 4px;
                }

                .status-ready {
                    color: #fff;
                    font-weight: bold;
                    margin-top: 15px;
                    text-transform: uppercase;
                    letter-spacing: 2px;
                    animation: blink 1s infinite;
                }

                @keyframes blink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }

                .reveal-btn {
                    margin-top: 25px;
                    background: #ff2d55;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    padding: 12px 25px;
                    font-size: 14px;
                    font-weight: bold;
                    cursor: pointer;
                    width: 100%;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    box-shadow: 0 0 20px rgba(255, 45, 85, 0.4);
                    transition: transform 0.2s;
                }

                .reveal-btn:hover {
                    transform: scale(1.02);
                }
            `}</style>

            <div className="scanline" />
            <div className="glow" style={{ top: '10%', left: '10%' }} />
            <div className="glow" style={{ bottom: '10%', right: '10%' }} />

            <div className="terminal-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '11px', opacity: 0.5 }}>KERNEL: 0xLOVE_V2</span>
                    <span style={{ fontSize: '11px', opacity: 0.5 }}>{progress}%</span>
                </div>

                <h2 style={{ fontSize: '18px', margin: 0, letterSpacing: '2px' }}>&gt; LOVE_COMPILER.SH</h2>

                <div className="progress-bar-container">
                    <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
                </div>

                <div className="log-area">
                    {logs.map((log, i) => (
                        <div key={i} className="log-line">{log}</div>
                    ))}
                    {!isFinished && <div className="log-line" style={{ animation: 'blink 1s infinite' }}>_</div>}
                </div>

                {isFinished && (
                    <div style={{ textAlign: 'center' }}>
                        <div className="status-ready">[ COMPILATION SUCCESSFUL ]</div>
                        <button className="reveal-btn" onClick={() => window.location.href = '/valentine-2'}>
                            EXECUTE VALENTINE_SURPRISE_V2.EXE ✨
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
