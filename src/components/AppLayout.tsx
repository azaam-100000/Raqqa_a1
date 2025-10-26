import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
// FIX: Added .tsx extension to import path as it is required by the module resolver.
import BottomNavBar from './BottomNavBar.tsx';
// FIX: Added .ts extension to import path as it is required by the module resolver.
import { useAuth } from '../hooks/useAuth.ts';

interface AppLayoutProps {
  installPrompt: Event | null;
}

const AppLayout: React.FC<AppLayoutProps> = ({ installPrompt }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isGuestFromShare } = useAuth();
  const isGuest = isGuestFromShare && !user;

  const isWatchScreen = location.pathname.startsWith('/watch');
  const isSalesAssistantScreen = location.pathname === '/sales-assistant';

  const hideBottomNav = isWatchScreen || isSalesAssistantScreen;

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-zinc-950">
      <main className={`flex-1 overflow-y-auto ${hideBottomNav ? 'pb-0' : 'pb-16'}`}>
        <Outlet context={{ installPrompt }} />
      </main>
      {!hideBottomNav && (
        isGuest ? (
            <div 
                className="fixed bottom-0 left-0 right-0 h-16 bg-black/60 backdrop-blur-sm z-20 flex items-center justify-center cursor-pointer border-t border-zinc-700"
                onClick={() => navigate('/login')}
            >
                <p className="text-white font-bold">سجل الدخول للتصفح</p>
            </div>
        ) : (
            <BottomNavBar />
        )
      )}
    </div>
  );
};

export default AppLayout;