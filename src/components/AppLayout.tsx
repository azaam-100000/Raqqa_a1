import React, { useState, TouchEvent } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
// FIX: Added .tsx extension to import path to resolve module error.
import BottomNavBar from './BottomNavBar.tsx';
// FIX: Added .ts extension to import path to resolve module error.
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

  // State for swipe navigation
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  
  // The minimum distance in pixels for a swipe to be registered
  const minSwipeDistance = 75; 

  // Order of the main screens for navigation
  const navOrder = ['/home', '/rates', '/watch', '/stores', '/rentals', '/groups'];

  const handleTouchStart = (e: TouchEvent) => {
    setTouchEnd(null); // Reset touch end on new touch
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    const currentIndex = navOrder.indexOf(location.pathname);
    
    if (currentIndex === -1) return; // Not a main screen, do nothing

    if (isLeftSwipe) { // Swipe Left (e.g., from right to left) -> Go to next screen
      if (currentIndex < navOrder.length - 1) {
        navigate(navOrder[currentIndex + 1]);
      }
    }

    if (isRightSwipe) { // Swipe Right (e.g., from left to right) -> Go to previous screen
      if (currentIndex > 0) {
        navigate(navOrder[currentIndex - 1]);
      }
    }

    // Reset touch points
    setTouchStart(null);
    setTouchEnd(null);
  };


  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-zinc-950">
      <main 
        className={`flex-1 overflow-y-auto ${hideBottomNav ? 'pb-0' : 'pb-16'}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
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