
import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';

const HomeIcon = ({ isActive }: { isActive: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`h-6 w-6 transition-colors ${isActive ? 'text-cyan-400' : 'text-slate-400'}`}>
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

const StoreIcon = ({ isActive }: { isActive: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`h-6 w-6 transition-colors ${isActive ? 'text-cyan-400' : 'text-slate-400'}`}>
    <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7"/>
  </svg>
);

const GroupsIcon = ({ isActive }: { isActive: boolean }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`h-6 w-6 transition-colors ${isActive ? 'text-cyan-400' : 'text-slate-400'}`}>
        <path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><rect width="7" height="5" x="7" y="7" rx="1"/><path d="M17 14v-1a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v1"/><path d="M7 7v1a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V7"/>
    </svg>
);

const RatesIcon = ({ isActive }: { isActive: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`h-6 w-6 transition-colors ${isActive ? 'text-cyan-400' : 'text-slate-400'}`}>
    <line x1="12" y1="1" x2="12" y2="23"></line>
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
  </svg>
);

const MessagesIcon = ({ isActive }: { isActive: boolean }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`h-6 w-6 transition-colors ${isActive ? 'text-cyan-400' : 'text-slate-400'}`}>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
);

const NotificationsIcon = ({ isActive }: { isActive: boolean }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`h-6 w-6 transition-colors ${isActive ? 'text-cyan-400' : 'text-slate-400'}`}>
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
);


const BottomNavBar: React.FC = () => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const fetchUnreadCount = async () => {
        const { count } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('read', false);
        setUnreadCount(count || 0);
    };

    fetchUnreadCount();

    const subscription = supabase
        .channel(`public:notifications:user_id=eq.${user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, fetchUnreadCount)
        .subscribe();
        
    return () => {
        supabase.removeChannel(subscription);
    }

  }, [user]);

  const activeLinkClass = "text-cyan-400";
  const inactiveLinkClass = "text-slate-400";
  const linkClass = "flex flex-col items-center justify-center gap-1 w-full h-full";

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-800/80 backdrop-blur-sm border-t border-slate-700 z-20">
      <div className="flex justify-around items-center h-16 max-w-2xl mx-auto px-2">
        <NavLink to="/home" className={({ isActive }) => `${linkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}>
          {({ isActive }) => (<><HomeIcon isActive={isActive} /><span className="text-xs font-bold">الرئيسية</span></>)}
        </NavLink>
        <NavLink to="/stores" className={({ isActive }) => `${linkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}>
          {({ isActive }) => (<><StoreIcon isActive={isActive} /><span className="text-xs font-bold">المتاجر</span></>)}
        </NavLink>
        <NavLink to="/groups" className={({ isActive }) => `${linkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}>
          {({ isActive }) => (<><GroupsIcon isActive={isActive} /><span className="text-xs font-bold">المجموعات</span></>)}
        </NavLink>
        <NavLink to="/rates" className={({ isActive }) => `${linkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}>
          {({ isActive }) => (<><RatesIcon isActive={isActive} /><span className="text-xs font-bold">الأسعار</span></>)}
        </NavLink>
        <NavLink to="/messages" className={({ isActive }) => `${linkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}>
          {({ isActive }) => (<><MessagesIcon isActive={isActive} /><span className="text-xs font-bold">الرسائل</span></>)}
        </NavLink>
        <NavLink to="/notifications" className={({ isActive }) => `${linkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}>
          {({ isActive }) => (
            <div className="relative w-full h-full flex flex-col items-center justify-center gap-1">
              <NotificationsIcon isActive={isActive} />
              <span className="text-xs font-bold">الإشعارات</span>
              {unreadCount > 0 && (
                <span className="absolute top-1 right-2 block h-4 w-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
          )}
        </NavLink>
      </div>
    </div>
  );
};

export default BottomNavBar;
