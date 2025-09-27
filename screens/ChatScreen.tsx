
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { Message, Profile } from '../types';
import Spinner from '../components/ui/Spinner';
import Avatar from '../components/ui/Avatar';
import Input from '../components/ui/Input';
import MessageBubble from '../components/MessageBubble';

const BackIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
);
const SendIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
);

const ChatScreen: React.FC = () => {
    const { userId: otherUserId } = useParams<{ userId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [otherUser, setOtherUser] = useState<Profile | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (!otherUserId || !user) return;

        const fetchInitialData = async () => {
            setLoading(true);
            setError(null);

            // Fetch other user's profile
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', otherUserId)
                .single();
            
            if (profileError || !profileData) {
                setError("لم يتم العثور على المستخدم.");
                setLoading(false);
                return;
            }
            setOtherUser(profileData);

            // Fetch message history
            const { data: messagesData, error: messagesError } = await supabase
                .from('messages')
                .select('*')
                .or(`(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
                .order('created_at', { ascending: true });
            
            if (messagesError) {
                setError("فشل في تحميل الرسائل.");
            } else {
                setMessages(messagesData);
            }
            setLoading(false);
        };

        fetchInitialData();
        
        // Real-time subscription
        const subscription = supabase
            .channel(`messages-from-${otherUserId}-to-${user.id}`)
            .on<Message>(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages', filter: `or(and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id}))` },
                (payload) => {
                    setMessages(currentMessages => {
                        if (currentMessages.some(m => m.id === payload.new.id)) return currentMessages;
                        return [...currentMessages, payload.new as Message]
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };

    }, [otherUserId, user]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !user || !otherUserId) return;

        const messageContent = newMessage.trim();
        setNewMessage('');

        const { error } = await supabase.from('messages').insert({
            sender_id: user.id,
            receiver_id: otherUserId,
            content: messageContent,
        });

        if (error) {
            console.error("Error sending message:", error);
            // Optionally, handle UI feedback for failed message
            setNewMessage(messageContent); // Put message back in input
        } else {
            // Send notification to the other user
            await supabase.from('notifications').insert({
                user_id: otherUserId,
                actor_id: user.id,
                type: 'new_message',
                entity_id: user.id, // Entity can be the sender's ID for navigation
            });
        }
    };

    return (
        <div className="flex flex-col h-screen bg-slate-900 text-white">
            <header className="bg-slate-800/80 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-700">
                <div className="container mx-auto px-4">
                    <div className="flex items-center h-16 relative">
                        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-slate-700">
                            <BackIcon />
                        </button>
                        {loading ? <Spinner /> : (
                            <div className="flex items-center gap-3 absolute right-1/2 translate-x-1/2">
                                <Avatar url={otherUser?.avatar_url} size={36} />
                                <h1 className="text-lg font-bold truncate">{otherUser?.full_name}</h1>
                            </div>
                        )}
                    </div>
                </div>
            </header>
            
            <main className="flex-1 overflow-y-auto p-4 space-y-4">
                {loading && <div className="text-center"><Spinner /></div>}
                {error && <p className="text-center text-red-400">{error}</p>}
                {!loading && messages.map(msg => (
                    <MessageBubble key={msg.id} message={msg} />
                ))}
                <div ref={messagesEndRef} />
            </main>

            <footer className="p-2 border-t border-slate-700 bg-slate-800">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <Input 
                        type="text" 
                        value={newMessage} 
                        onChange={e => setNewMessage(e.target.value)}
                        placeholder="اكتب رسالتك..."
                        className="flex-1"
                        autoComplete="off"
                    />
                    <button type="submit" className="p-3 bg-cyan-600 rounded-md hover:bg-cyan-700 disabled:opacity-50" disabled={!newMessage.trim()}>
                        <SendIcon />
                    </button>
                </form>
            </footer>
        </div>
    );
};

export default ChatScreen;
