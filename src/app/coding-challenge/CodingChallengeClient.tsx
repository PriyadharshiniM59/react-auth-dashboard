'use client';

import { useState, useEffect, useRef } from 'react';

export default function CodingChallengeClient() {
    const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [step, setStep] = useState(0); // 0: initial, 1: running, 2: prompt, 3: result, 4: reveal
    const [mounted, setMounted] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    const cCode = `#include <stdio.h>

int main() {
    char s[100];

    // Prompt the user to enter a response
    printf("WHO U ARE TO ME: ");

    // Read the string from the user
    scanf("%s", s);

    // Print the entered response
    printf("IM UR : %s\\n", s);

    return 0;
}`;

    const handleRun = () => {
        setStep(1);
        setTerminalOutput(['$ gcc valentine.c -o valentine', '$ ./valentine']);

        setTimeout(() => {
            setTerminalOutput(prev => [...prev, 'WHO U ARE TO ME: ']);
            setStep(2);
        }, 1500);
    };

    const handleInputSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        setStep(3);
        setTerminalOutput(prev => [
            ...prev.slice(0, -1),
            `WHO U ARE TO ME: ${inputValue}`,
            `IM UR : ${inputValue}`,
            '',
            'Process finished with exit code 0',
            '----------------------------------',
            '✨ SYSTEM: A hidden module has been unlocked!'
        ]);

        setTimeout(() => {
            setStep(4);
        }, 2000);
    };

    useEffect(() => {
        if (step === 2 && inputRef.current) {
            inputRef.current.focus();
        }
    }, [step]);

    if (!mounted) return null;

    return (
        <div className="ide-container">
            <style jsx>{`
                .ide-container {
                    min-height: 100vh;
                    background: #1e1e1e;
                    color: #d4d4d4;
                    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
                    display: flex;
                    flex-direction: column;
                }

                /* HEADER */
                .ide-header {
                    background: #333333;
                    padding: 8px 16px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    font-size: 13px;
                    border-bottom: 1px solid #444;
                }

                .tabs {
                    display: flex;
                    gap: 1px;
                }

                .tab {
                    background: #1e1e1e;
                    padding: 8px 20px;
                    border-top: 2px solid #007acc;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .run-btn {
                    background: #28a745;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    padding: 4px 12px;
                    font-size: 12px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    transition: opacity 0.2s;
                }

                .run-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                /* EDITOR */
                .editor-content {
                    flex: 1;
                    display: flex;
                    overflow: hidden;
                }

                .line-numbers {
                    background: #1e1e1e;
                    color: #858585;
                    padding: 20px 15px;
                    text-align: right;
                    border-right: 1px solid #333;
                    user-select: none;
                }

                .code-area {
                    flex: 1;
                    padding: 20px;
                    white-space: pre;
                    font-size: 14px;
                    line-height: 1.5;
                    color: #9cdcfe;
                }

                .keyword { color: #569cd6; }
                .comment { color: #6a9955; }
                .string { color: #ce9178; }

                /* TERMINAL */
                .terminal {
                    background: #1e1e1e;
                    border-top: 1px solid #444;
                    height: 250px;
                    padding: 10px 20px;
                    font-size: 13px;
                    overflow-y: auto;
                }

                .terminal-header {
                    color: #858585;
                    font-size: 11px;
                    text-transform: uppercase;
                    margin-bottom: 10px;
                }

                .output-line {
                    margin-bottom: 4px;
                }

                .reveal-overlay {
                    position: fixed;
                    top: 0;
                    right: 0;
                    bottom: 0;
                    left: 0;
                    background: rgba(0,0,0,0.85);
                    backdrop-filter: blur(10px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 100;
                    animation: fadeIn 0.5s ease-out;
                }

                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

                .reveal-card {
                    background: #2d2d2d;
                    padding: 40px;
                    border-radius: 20px;
                    text-align: center;
                    border: 1px solid #ff2d55;
                    box-shadow: 0 0 30px rgba(255, 45, 85, 0.3);
                }

                .surprise-btn {
                    background: #ff2d55;
                    color: white;
                    border: none;
                    border-radius: 10px;
                    padding: 15px 30px;
                    font-size: 18px;
                    font-weight: bold;
                    cursor: pointer;
                    margin-top: 20px;
                }
            `}</style>

            <header className="ide-header">
                <div className="tabs">
                    <div className="tab">
                        <span>📄</span> valentine.c
                    </div>
                </div>
                <button
                    className="run-btn"
                    onClick={handleRun}
                    disabled={step !== 0}
                >
                    ▶ Run
                </button>
            </header>

            <div className="editor-content">
                <div className="line-numbers">
                    {Array.from({ length: 20 }, (_, i) => i + 1).map(n => <div key={n}>{n}</div>)}
                </div>
                <div className="code-area">
                    <span className="keyword">#include</span> <span className="string">&lt;stdio.h&gt;</span><br /><br />
                    <span className="keyword">int</span> main() {'{'}<br />
                    &nbsp;&nbsp;&nbsp;&nbsp;<span className="keyword">char</span> s[<span className="string">100</span>];<br /><br />
                    &nbsp;&nbsp;&nbsp;&nbsp;<span className="comment">// Prompt the user to enter a response</span><br />
                    &nbsp;&nbsp;&nbsp;&nbsp;printf(<span className="string">"WHO U ARE TO ME: "</span>);<br /><br />
                    &nbsp;&nbsp;&nbsp;&nbsp;<span className="comment">// Read the string from the user</span><br />
                    &nbsp;&nbsp;&nbsp;&nbsp;scanf(<span className="string">"%s"</span>, s);<br /><br />
                    &nbsp;&nbsp;&nbsp;&nbsp;<span className="comment">// Print the entered response</span><br />
                    &nbsp;&nbsp;&nbsp;&nbsp;printf(<span className="string">"IM UR : %s\\n"</span>, s);<br /><br />
                    &nbsp;&nbsp;&nbsp;&nbsp;<span className="keyword">return</span> <span className="string">0</span>;<br />
                    {'}'}
                </div>
            </div>

            <div className="terminal">
                <div className="terminal-header">Terminal</div>
                {terminalOutput.map((line, i) => (
                    <div key={i} className="output-line">{line}</div>
                ))}

                {step === 2 && (
                    <form onSubmit={handleInputSubmit} style={{ display: 'inline' }}>
                        <input
                            ref={inputRef}
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#fff',
                                fontFamily: 'inherit',
                                fontSize: 'inherit',
                                outline: 'none',
                                width: '200px'
                            }}
                        />
                    </form>
                )}
            </div>

            {step === 4 && (
                <div className="reveal-overlay">
                    <div className="reveal-card">
                        <h2 style={{ color: '#fff' }}>Simulation Successful! 💖</h2>
                        <p style={{ color: '#aaa', marginTop: '10px' }}>You've unlocked a hidden message.</p>
                        <button
                            className="surprise-btn"
                            onClick={() => window.location.href = '/valentine'}
                        >
                            Open My Surprise ✨
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
