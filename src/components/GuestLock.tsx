import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.ts';

const GuestLock: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isGuestFromShare } = useAuth();
    const navigate = useNavigate();

    if (!isGuestFromShare) {
        return <>{children}</>;
    }

    return (
        <div className="relative">
            <div className="filter blur-sm pointer-events-none" aria-hidden="true">
                {children}
            </div>
            <div
                className="absolute inset-0 flex items-center justify-center cursor-pointer z-10"
                onClick={() => navigate('/login')}
                role="button"
                aria-label="سجل الدخول للمتابعة"
            >
                <div className="text-center font-bold text-white bg-zinc-900/70 backdrop-blur-sm px-4 py-2 rounded-lg border border-zinc-700">
                    <p>سجل الدخول</p>
                    <p className="text-xs font-normal">لرؤية المزيد</p>
                </div>
            </div>
        </div>
    );
};

export default GuestLock;
