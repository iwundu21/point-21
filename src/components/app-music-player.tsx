
'use client';

import { useState, useEffect, useRef } from 'react';
import { getAppSettings } from '@/lib/database';

const AppMusicPlayer = () => {
    const [musicUrl, setMusicUrl] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        const fetchMusic = async () => {
            try {
                const settings = await getAppSettings();
                if (settings.backgroundMusicUrl) {
                    setMusicUrl(settings.backgroundMusicUrl);
                }
            } catch (error) {
                console.error("Failed to fetch background music URL:", error);
            }
        };
        fetchMusic();
    }, []);

    useEffect(() => {
        if (musicUrl && audioRef.current) {
            audioRef.current.play().catch(error => {
                // Autoplay was prevented. This is common in browsers.
                // We can't force it, but we can log it.
                console.log("Autoplay prevented:", error);
            });
        }
    }, [musicUrl]);
    
    // Listen for user interaction to attempt to play audio again if it was blocked
    useEffect(() => {
        const handleInteraction = () => {
            if (audioRef.current && audioRef.current.paused) {
                 audioRef.current.play().catch(e => console.log("Still couldn't play audio after interaction", e));
            }
        }
        window.addEventListener('click', handleInteraction, { once: true });
        window.addEventListener('touchend', handleInteraction, { once: true });
        
        return () => {
            window.removeEventListener('click', handleInteraction);
            window.removeEventListener('touchend', handleInteraction);
        }
    }, []);

    if (!musicUrl) {
        return null;
    }

    return (
        <audio
            ref={audioRef}
            src={musicUrl}
            loop
            autoPlay
            hidden
        />
    );
};

export default AppMusicPlayer;
