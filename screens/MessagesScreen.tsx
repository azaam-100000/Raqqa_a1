import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { Conversation, Profile } from '../types';
import Spinner from '../components/ui/Spinner';
import ConversationCard from '../components/ConversationCard';

const MessagesScreen: React.FC = () => {
    const { user } = useAuth();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!user) return;

        const fetchConversations = async () => {
            setLoading(true);
            setError(null);
            
            try {
                // This has been refactored to be more robust.
                // 1. Fetch all messages involving the user
                const { data: messagesData, error: messagesError } = await supabase
                    .from('messages')
                    .select('*')
                    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
                    .order('created_at', { ascending: false });

                if (messagesError) throw messagesError;

                if (!messagesData || messagesData.length === 0) {
                    setConversations([]);
                    setLoading(false);
                    return;
                }
                
                // 2. Collect unique other user IDs
                const otherUserIds = new Set<string>();
                messagesData.forEach(msg => {
                    if (msg.sender_id !== user.id) otherUserIds.add(msg.sender_id);
                    if (msg.receiver_id !== user.id) otherUserIds.add(msg.receiver_id);
                });

                // 3. Fetch profiles for those users
                const { data: profilesData, error: profilesError } = await supabase
                    .from('profiles')
                    .select('*')
                    .in('id', Array.from(otherUserIds));

                if (profilesError) throw profilesError;

                const profilesMap = new Map<string, Profile>();
                profilesData.forEach(p => profilesMap.set(p.id, p));

                // 4. Group messages into conversations
                const conversationMap = new Map<string, Conversation>();
                for (const message of messagesData) {
                    const otherUserId = message.sender_id === user.id ? message.receiver_id : message.sender_id;
                    if (!conversationMap.has(otherUserId)) {
                        const profile = profilesMap.get(otherUserId);
                        if (profile) {
                            conversationMap.set(otherUserId, {
                                other_user_id: otherUserId,
                                profile: profile,
                                last_message: message,
                            });
                        }
                    }
                }
                setConversations(Array.from(conversationMap.values()));

            } catch (err: any) {
                 console.error("Error fetching conversations:", err);
                 setError("فشل في تحميل المحادثات. يرجى المحاولة مرة أخرى.");
            } finally {
                setLoading(false);
            }
        };

        fetchConversations();
        
        // Subscribe to new messages to update the conversation list
        const subscription = supabase
            .channel(`public:messages:user=eq.${user.id}`)
            .on('postgres_changes', 
                { event: 'INSERT', schema: 'public', table: 'messages', filter: `or(sender_id.eq.${user.id},receiver_id.eq.${user.id})` },
                () => fetchConversations()
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
        if (conversations.length === 0) {
            return <p className="text-center text-slate-400 py-10">ليس لديك رسائل حتى الآن. ابدأ محادثة من صفحة متجر.</p>;
        }
        return (
            <div className="divide-y divide-slate-700">
                {conversations.map(conv => (
                    <ConversationCard key={conv.other_user_id} conversation={conv} />
                ))}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white">
            <header className="bg-slate-800/80 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-700">
                <div className="container mx-auto px-4">
                    <div className="flex items-center h-16">
                        <h1 className="text-xl font-bold">الرسائل</h1>
                    </div>
                </div>
            </header>
            <main className="container mx-auto px-4 py-6">
                <div className="max-w-2xl mx-auto">
                    {renderContent()}
                </div>
            </main>
        </div>
    );
};

export default MessagesScreen;
