import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Profile } from '../types';
import Avatar from './ui/Avatar';
import Button from './ui/Button';

const AcceptIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.02.74-.25 1.02l-2.2 2.2z"/>
    </svg>
);

const DeclineIcon = () => (
     <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2c5.52 0 10 4.48 10 10s-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2zm1 14.17l3.88 3.88a9.018 9.018 0 0 1-9.76 0l3.88-3.88c.54.34 1.16.55 1.83.55s1.29-.21 1.83-.55zm-7.76-3.88l-3.88 3.88A9.018 9.018 0 0 1 2 12c0-1.83.55-3.54 1.47-4.99l3.88 3.88c-.34.54-.55 1.16-.55 1.83s.21 1.29.55 1.83zm11.64-5.28L3.01 4.12a9.018 9.018 0 0 1 9.76 0l3.88 3.88z"/>
    </svg>
);

interface IncomingCallModalProps {
    caller: Profile;
    callType: 'video' | 'audio';
    onAccept: () => void;
    onDecline: () => void;
}

const IncomingCallModal: React.FC<IncomingCallModalProps> = ({ caller, callType, onAccept, onDecline }) => {
    const modalRoot = document.getElementById('modal-root');
    const audioRef = useRef<HTMLAudioElement>(null);
    
    useEffect(() => {
        const playSound = async () => {
            if (audioRef.current) {
                try {
                    audioRef.current.loop = true;
                    await audioRef.current.play();
                } catch (error) {
                    console.warn("Ringtone playback was blocked by the browser.");
                }
            }
        };
        playSound();

        return () => {
            audioRef.current?.pause();
        };
    }, []);

    if (!modalRoot) return null;

    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
            <audio ref={audioRef} src="https://assets.mixkit.co/sfx/preview/mixkit-classic-short-alarm-993.mp3" />
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-sm flex flex-col items-center p-8 text-center text-white">
                <Avatar url={caller.avatar_url} size={128} />
                <h2 className="text-3xl font-bold mt-6">{caller.full_name}</h2>
                <p className="text-zinc-400 mt-2">
                    مكالمة {callType === 'video' ? 'فيديو' : 'صوتية'} واردة...
                </p>
                <div className="flex justify-around w-full mt-10">
                    <div className="flex flex-col items-center gap-2">
                        <button onClick={onDecline} className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center hover:bg-red-700">
                            <DeclineIcon />
                        </button>
                        <span className="font-semibold">رفض</span>
                    </div>
                     <div className="flex flex-col items-center gap-2">
                        <button onClick={onAccept} className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center hover:bg-green-700">
                            <AcceptIcon />
                        </button>
                        <span className="font-semibold">قبول</span>
                    </div>
                </div>
            </div>
        </div>,
        modalRoot
    );
};

export default IncomingCallModal;