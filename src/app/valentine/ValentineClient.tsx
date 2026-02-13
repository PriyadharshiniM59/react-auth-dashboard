'use client';

import { useState, useEffect, useRef } from 'react';

/**
 * VALENTINE SURPRISE CONFIGURATION
 * You can edit these values to customize the surprise!
 */
const CONFIG = {
    secretCode: 'FOREVER', // The code to unlock the page
    partnerName: 'My Love', // Your partner's name
    specialDate: 'February 14, 2026',
    message: `You are the most amazing person I've ever known. Every day with you is a gift, and I'm so lucky to have you in my life. Happy Valentine's Day! ❤️`,
    videoUrl: '/assets/valentine-video.mp4', // Linked your Valentine video! 🎬
    imageUrl: '',
};

export default function ValentineClient() {
    const [code, setCode] = useState('');
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [error, setError] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleUnlock = (e: React.FormEvent) => {
        e.preventDefault();
        if (code.toUpperCase() === CONFIG.secretCode) {
            setIsUnlocked(true);
            setError(false);
        } else {
            setError(true);
            setTimeout(() => setError(false), 2000);
        }
    };

    if (!mounted) return null;

    return (
        <div className="valentine-container">
            <style jsx>{`
                .valentine-container {
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #050505;
                    font-family: 'Inter', sans-serif;
                    overflow: hidden;
                    position: relative;
                }

                .bg-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: url('/assets/valentine-bg.png') no-repeat center center;
                    background-size: cover;
                    opacity: 0.4;
                    filter: blur(5px);
                    z-index: 1;
                }

                .content-wrapper {
                    position: relative;
                    z-index: 10;
                    width: 90%;
                    max-width: 500px;
                    text-align: center;
                }

                .glass-card {
                    background: rgba(40, 40, 45, 0.6);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 30px;
                    padding: 3rem 2rem;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                    animation: float 6s ease-in-out infinite;
                }

                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }

                .heart-icon {
                    font-size: 4rem;
                    margin-bottom: 1.5rem;
                    display: inline-block;
                    animation: pulse 2s infinite;
                }

                @keyframes pulse {
                    0% { transform: scale(1); filter: drop-shadow(0 0 0 rgba(255, 45, 85, 0)); }
                    50% { transform: scale(1.1); filter: drop-shadow(0 0 15px rgba(255, 45, 85, 0.6)); }
                    100% { transform: scale(1); filter: drop-shadow(0 0 0 rgba(255, 45, 85, 0)); }
                }

                h1 {
                    color: white;
                    font-size: 2.5rem;
                    font-weight: 800;
                    margin-bottom: 1rem;
                    letter-spacing: -0.02em;
                }

                p {
                    color: #a0a0b0;
                    line-height: 1.6;
                    margin-bottom: 2rem;
                }

                input {
                    width: 100%;
                    background: rgba(255, 255, 255, 0.05);
                    border: 2px solid rgba(255, 255, 255, 0.1);
                    border-radius: 15px;
                    padding: 1rem 1.5rem;
                    color: white;
                    font-size: 1rem;
                    text-align: center;
                    letter-spacing: 4px;
                    transition: all 0.3s ease;
                    outline: none;
                }

                input:focus {
                    border-color: #ff2d55;
                    background: rgba(255, 45, 85, 0.05);
                }

                input.error {
                    border-color: #ff3b30;
                    animation: shake 0.5s;
                }

                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }

                .btn-unlock {
                    margin-top: 1.5rem;
                    background: linear-gradient(135deg, #ff2d55 0%, #ff5263 100%);
                    color: white;
                    border: none;
                    border-radius: 15px;
                    padding: 1rem 2rem;
                    font-weight: 700;
                    width: 100%;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    box-shadow: 0 10px 20px -5px rgba(255, 45, 85, 0.4);
                }

                .reveal-card {
                    animation: slideUp 1s cubic-bezier(0.16, 1, 0.3, 1);
                }

                @keyframes slideUp {
                    from { transform: translateY(50px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }

                .partner-media {
                    width: 100%;
                    max-width: 300px;
                    border-radius: 20px;
                    border: 4px solid #ff2d55;
                    margin: 0 auto 2rem;
                    overflow: hidden;
                    box-shadow: 0 0 30px rgba(255, 45, 85, 0.3);
                }

                .partner-media video, .partner-media img {
                    width: 100%;
                    display: block;
                }

                .pic-placeholder {
                    width: 100px;
                    height: 100px;
                    border-radius: 50%;
                    background: radial-gradient(circle, #ff5263, #ff2d55);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 2rem;
                    margin: 0 auto 2rem;
                }

                .romantic-message {
                    color: white;
                    font-size: 1.25rem;
                    font-style: italic;
                    margin-bottom: 2rem;
                }
                .sound-toggle {
                    position: absolute;
                    bottom: 20px;
                    right: 20px;
                    background: rgba(0, 0, 0, 0.4);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    color: white;
                    border-radius: 50%;
                    width: 40px;
                    height: 40px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    font-size: 1.2rem;
                    z-index: 10;
                    transition: all 0.2s ease;
                }

                .sound-toggle:hover {
                    background: rgba(255, 45, 85, 0.6);
                    transform: scale(1.1);
                }

                .message-container { position: relative; }
            `}</style>

            <div className="bg-overlay" />

            <div className="content-wrapper">
                {!isUnlocked ? (
                    <div className="glass-card fade-in">
                        <div className="heart-icon">🔒</div>
                        <h1>A Private Message</h1>
                        <p>Enter the secret code to unlock your Valentine's surprise.</p>

                        <form onSubmit={handleUnlock}>
                            <input
                                type="text"
                                placeholder="••••••••"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                className={error ? 'error' : ''}
                            />
                            <button type="submit" className="btn-unlock">
                                Check Secret Code
                            </button>
                        </form>
                    </div>
                ) : (
                    <div className="glass-card reveal-card">
                        <div className="heart-icon">❤️</div>

                        {CONFIG.videoUrl ? (
                            <div className="partner-media" style={{ position: 'relative' }}>
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    loop
                                    muted={isMuted}
                                    playsInline
                                    style={{ borderRadius: '15px' }}
                                >
                                    <source src={CONFIG.videoUrl} type="video/mp4" />
                                    Your browser does not support the video tag.
                                </video>
                                <button
                                    className="sound-toggle"
                                    onClick={() => setIsMuted(!isMuted)}
                                    title={isMuted ? "Unmute" : "Mute"}
                                >
                                    {isMuted ? "🔇" : "🔊"}
                                </button>
                            </div>
                        ) : CONFIG.imageUrl ? (
                            <div className="partner-media">
                                <img src={CONFIG.imageUrl} alt="Valentine" />
                            </div>
                        ) : (
                            <div className="pic-placeholder">📷</div>
                        )}

                        <h1>Happy Valentine's Day!</h1>
                        <div className="romantic-message">
                            "{CONFIG.message}"
                        </div>
                        <p style={{ color: '#ff2d55', fontWeight: 700 }}>
                            {CONFIG.specialDate}
                        </p>
                        <div style={{ marginTop: '2rem', fontSize: '0.8rem', color: '#666' }}>
                            Forever Yours, {CONFIG.partnerName}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
