import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.ts';
import Button from './ui/Button.tsx';

const BellIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-teal-400">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
);

const NotificationPrompt: React.FC = () => {
    const { setupPushNotifications } = useAuth();
    const [showPrompt, setShowPrompt] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Check if notifications are supported and permission is 'default'
        if ('Notification' in window && Notification.permission === 'default') {
            // Also check if the user has dismissed it before
            if (localStorage.getItem('notification_prompt_dismissed') !== 'true') {
                // Show the prompt after a short delay to not overwhelm the user
                const timer = setTimeout(() => {
                    setShowPrompt(true);
                }, 5000); // 5 second delay
                return () => clearTimeout(timer);
            }
        }
    }, []);

    const handleEnable = async () => {
        setLoading(true);
        setError(null);
        try {
            await setupPushNotifications();
            setShowPrompt(false); // Hide on success
        } catch (err) {
            setError("فشل تفعيل الإشعارات. يرجى المحاولة مرة أخرى من إعدادات المتصفح.");
        } finally {
            setLoading(false);
        }
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        localStorage.setItem('notification_prompt_dismissed', 'true');
    };

    if (!showPrompt) {
        return null;
    }

    return (
        <div 
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-md bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl shadow-2xl p-4 flex flex-col items-center text-center animate-fade-in-up"
            role="alert"
            aria-live="assertive"
        >
            <BellIcon />
            <p className="font-bold text-zinc-900 dark:text-white mt-2">لا تفوت أي جديد!</p>
            <p className="text-sm text-zinc-600 dark:text-zinc-300 mt-1 mb-4">
                فعّل الإشعارات لتصلك آخر التحديثات والرسائل المهمة فور وصولها.
            </p>
            {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
            <div className="w-full flex gap-3">
                <Button variant="secondary" onClick={handleDismiss} className="flex-1 !py-2 !text-sm">
                    لاحقاً
                </Button>
                <Button onClick={handleEnable} loading={loading} className="flex-1 !py-2 !text-sm">
                    تفعيل الإشعارات
                </Button>
            </div>
        </div>
    );
};

// Keyframes animation for the prompt
const style = document.createElement('style');
style.innerHTML = `
    @keyframes fade-in-up {
        0% { opacity: 0; transform: translate(-50%, 20px); }
        100% { opacity: 1; transform: translate(-50%, 0); }
    }
    .animate-fade-in-up {
        animation: fade-in-up 0.5s ease-out forwards;
    }
`;
document.head.appendChild(style);


export default NotificationPrompt;
