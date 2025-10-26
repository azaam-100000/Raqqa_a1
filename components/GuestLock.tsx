import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const LockIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 text-white mb-2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
);

const GuestLock: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, isGuestFromShare } = useAuth();
    const navigate = useNavigate();
    const isLocked = isGuestFromShare && !user;

    if (!isLocked) {
        return <>{children}</>;
    }

    return (
        <div className="relative flex-1">
            <div className="blur-sm opacity-50 pointer-events-none">{children}</div>
            <div 
                className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 rounded-lg p-4 text-center cursor-pointer group backdrop-blur-sm"
                onClick={() => navigate('/login')}
                role="button"
                tabIndex={0}
                aria-label="تسجيل الدخول لعرض هذه الميزة"
            >
                <div className="transform group-hover:scale-110 transition-transform">
                    <LockIcon />
                    <p className="font-bold text-white">يجب تسجيل الدخول</p>
                    <p className="text-sm text-zinc-300">انضم إلينا لعرض هذه الميزة.</p>
                </div>
            </div>
        </div>
    );
};

export default GuestLock;
