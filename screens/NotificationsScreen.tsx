
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { Notification } from '../types';
import Spinner from '../components/ui/Spinner';
import NotificationCard from '../components/NotificationCard';
import { Link } from 'react-router-dom';


const NotificationsScreen: React.FC = () => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!user) return;

        const fetchAndMarkRead = async () => {
            setLoading(true);
            setError(null);

            const { data, error } = await supabase
                .from('notifications')
                .select('*, actors:profiles!actor_id(*)')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });
            
            if (error) {
                console.error("Error fetching notifications:", error);
                setError("فشل في تحميل الإشعارات.");
            } else {
                setNotifications(data as any[]);
                // Mark as read after fetching
                await supabase
                    .from('notifications')
                    .update({ read: true })
                    .eq('user_id', user.id)
                    .eq('read', false);
            }
            setLoading(false);
        };

        fetchAndMarkRead();
        
        const subscription = supabase
            .channel(`public:notifications:user_id=eq.${user.id}`)
            .on('postgres_changes', 
                { event: 'INSERT', schema: 'public', table: 'notifications' },
                (payload) => {
                     // We could fetch the full new notification, or just prepend the basic one
                     // For simplicity, we'll just refetch all
                     fetchAndMarkRead();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        }
    }, [user]);
    
    const renderContent = () => {
        if (loading) {
            return <div className="text-center py-10"><Spinner /></div>;
        }
        if (error) {
            return <p className="text-center text-red-400 py-10">{error}</p>;
        }
        if (notifications.length === 0) {
            return (
                 <div className="text-center text-slate-400 py-10">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-12 w-12 mx-auto mb-4"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                    <p>لا توجد إشعارات جديدة.</p>
                    <p className="text-sm">عندما يتفاعل الآخرون معك، ستظهر الإشعارات هنا.</p>
                </div>
            )
        }
        return (
            <div className="divide-y divide-slate-700">
                {notifications.map(notif => (
                    <NotificationCard key={notif.id} notification={notif} />
                ))}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 text-white">
            <header className="bg-slate-800/80 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-700">
                <div className="container mx-auto px-4">
                    <div className="flex items-center h-16">
                        <h1 className="text-xl font-bold">الإشعارات</h1>
                    </div>
                </div>
            </header>
            <main className="container mx-auto">
                <div className="max-w-2xl mx-auto">
                    {renderContent()}
                </div>
            </main>
        </div>
    );
};

export default NotificationsScreen;
