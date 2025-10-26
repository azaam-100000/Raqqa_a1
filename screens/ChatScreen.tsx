import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { Profile, Message } from '../types';
import Spinner from '../components/ui/Spinner';
import Avatar from '../components/ui/Avatar';
import MessageBubble from '../components/MessageBubble';
import { getErrorMessage } from '../utils/errors';
import Button from '../components/ui/Button';
import ReactDOM from 'react-dom';

const AdminBadge = () => (
    <span className="ml-2 inline-flex items-center gap-1 align-middle">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" className="flex-shrink-0">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="black"/>
            <path d="m12 7.5 2.05 4.03 4.45.61-3.25 3.16.75 4.4-4-2.1-4 2.1.75-4.4-3.25-3.16 4.45-.61L12 7.5z" fill="#ef4444"/>
        </svg>
        <span className="text-xs font-bold text-red-500">الإدارة</span>
    </span>
);

const BackIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg> );
const SendIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> );
const MicIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg> );
const ImageIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg> );
const VideoCallIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg> );
const AudioCallIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg> );
const MoreIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg> );
const TrashIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg> );
const CopyIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> );

const ChatScreen: React.FC = () => {
    const { userId: otherUserId } = useParams<{ userId: string }>();
    const navigate = useNavigate();
    const { user, profile: currentUserProfile, isOnline, isBlocked, toggleBlock, refreshProfile } = useAuth();
    
    const [otherUser, setOtherUser] = useState<Profile | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState(false);

    // Selection mode state
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // New state for recording
    const [isRecording, setIsRecording] = useState(false);
    const [recordingSeconds, setRecordingSeconds] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordingIntervalRef = useRef<number | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const scrollRef = useRef<HTMLDivElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const optionsMenuRef = useRef<HTMLDivElement>(null);

    const isThisUserBlocked = otherUserId ? isBlocked(otherUserId) : false;
    const amIBlocked = otherUser?.blocked_users?.includes(user?.id || '') ?? false;
    const isOtherUserAdmin = otherUser?.bio?.includes('[ADMIN]');

    const markMessagesAsRead = useCallback(async () => {
        if (!user || !otherUserId) return;
        await supabase
            .from('messages')
            .update({ read: true })
            .eq('receiver_id', user.id)
            .eq('sender_id', otherUserId)
            .eq('read', false);
    }, [user, otherUserId]);
    
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, sending]);
    
     useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (optionsMenuRef.current && !optionsMenuRef.current.contains(event.target as Node)) {
                setIsOptionsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!user || !otherUserId) return;
        
        const fetchInitialData = async () => {
            setLoading(true);
            setError(null);
            try {
                const { data: otherUserData, error: userError } = await supabase.from('profiles').select('*').eq('id', otherUserId).single();
                if (userError || !otherUserData) throw new Error('لم يتم العثور على المستخدم.');
                setOtherUser(otherUserData as Profile);

                const { data: messagesData, error: messagesError } = await supabase
                    .from('messages')
                    .select('*')
                    .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
                    .order('created_at', { ascending: true });

                if (messagesError) throw messagesError;
                setMessages((messagesData as Message[]) || []);

            } catch (err) {
                setError(getErrorMessage(err));
            } finally {
                setLoading(false);
            }
        };

        fetchInitialData();
        markMessagesAsRead();

        const sortedIds = [user.id, otherUserId].sort();
        const channelName = `chat-${sortedIds[0]}-${sortedIds[1]}`;
        const dbFilter = `or(and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id}))`;

        const channel = supabase
            .channel(channelName, {
                config: {
                    broadcast: {
                        self: true,
                    },
                },
            })
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: dbFilter
                },
                (payload) => {
                    const newMessage = payload.new as Message;
                    setMessages(current => {
                        if (current.some(m => m.id === newMessage.id)) return current;
                        return [...current, newMessage];
                    });
                    if(newMessage.receiver_id === user.id) {
                        markMessagesAsRead();
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'messages',
                    filter: dbFilter
                },
                (payload) => {
                    const updatedMessage = payload.new as Message;
                    setMessages(current => current.map(m => m.id === updatedMessage.id ? updatedMessage : m));
                }
            )
             .on(
                'postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'messages',
                    filter: dbFilter
                },
                (payload) => {
                     setMessages(current => current.filter(m => m.id !== payload.old.id));
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, otherUserId, markMessagesAsRead]);
    
    // --- Selection Mode Logic ---
    const handleStartSelection = (message: Message) => {
        if (selectionMode) {
             handleToggleSelection(message.id);
        } else {
            setSelectionMode(true);
            setSelectedMessages([message.id]);
        }
    };

    const handleToggleSelection = (messageId: string) => {
        setSelectedMessages(prev =>
            prev.includes(messageId)
                ? prev.filter(id => id !== messageId)
                : [...prev, messageId]
        );
    };
    
    useEffect(() => {
        if (selectionMode && selectedMessages.length === 0) {
            setSelectionMode(false);
        }
    }, [selectedMessages, selectionMode]);

    const handleExitSelection = () => {
        setSelectionMode(false);
        setSelectedMessages([]);
    };

    const handleCopySelected = async () => {
        const selectedText = messages
            .filter(msg => selectedMessages.includes(msg.id) && msg.content)
            .map(msg => `[${new Date(msg.created_at).toLocaleTimeString('ar-EG')}] ${msg.sender_id === user?.id ? 'أنا' : otherUser?.full_name}: ${msg.content}`)
            .join('\n');
        
        if (selectedText) {
            await navigator.clipboard.writeText(selectedText);
        }
        handleExitSelection();
    };

    const canDeleteForEveryone = useMemo(() => {
        if (!user || selectedMessages.length === 0) return false;
        const selected = messages.filter(m => selectedMessages.includes(m.id));
        return selected.every(m => 
            m.sender_id === user.id && 
            (new Date().getTime() - new Date(m.created_at).getTime()) < 5 * 60 * 1000
        );
    }, [selectedMessages, messages, user]);

    const handleDeleteForMe = async () => {
        if (!user || selectedMessages.length === 0) return;
        
        const { error } = await supabase.rpc('add_user_to_deleted_for', {
            p_user_id: user.id,
            p_message_ids: selectedMessages
        });

        if (error) {
            alert(`فشل الحذف: ${error.message}`);
        } else {
            setMessages(prev => prev.filter(m => !selectedMessages.includes(m.id)));
        }
        setShowDeleteConfirm(false);
        handleExitSelection();
    };

    const handleDeleteForEveryone = async () => {
        if (!canDeleteForEveryone) return;
        
        const { error } = await supabase.from('messages').delete().in('id', selectedMessages);
        
        if (error) {
            alert(`فشل الحذف لدى الجميع: ${error.message}`);
        } else {
             setMessages(prev => prev.filter(m => !selectedMessages.includes(m.id)));
        }
        setShowDeleteConfirm(false);
        handleExitSelection();
    };
    // --- End Selection Mode Logic ---
    
    const handleSendMessage = async (content: string | null, imageUrl: string | null = null, audioUrl: string | null = null) => {
        if (!user || !otherUserId) return;
        if (!content && !imageUrl && !audioUrl) return;

        setSending(true);
        const textContent = content ? content.trim() : null;
        if (textContent) setNewMessage('');

        const tempId = `temp_${Date.now()}`;
        const optimisticMessage: Message = {
            id: tempId, created_at: new Date().toISOString(), sender_id: user.id, receiver_id: otherUserId,
            content: textContent, image_url: imageUrl, audio_url: audioUrl, read: false, deleted_for: null,
        };
        setMessages(current => [...current, optimisticMessage]);

        const messageData = { sender_id: user.id, receiver_id: otherUserId, content: textContent, image_url: imageUrl, audio_url: audioUrl, };

        const { data: insertedMessage, error } = await supabase.from('messages').insert([messageData]).select().single();

        if (error) {
            const friendlyError = getErrorMessage(error);
            if (friendlyError.includes('violates row-level security policy')) {
                alert('لا يمكنك إرسال رسالة إلى هذا المستخدم. قد يكون قد قام بحظرك أو أن إعدادات الخصوصية الخاصة به لا تسمح بذلك.');
            } else {
                alert(`فشل إرسال الرسالة: ${friendlyError}`);
            }
            if (textContent) setNewMessage(textContent);
            setMessages(current => current.filter(m => m.id !== tempId));
        } else if (insertedMessage) {
            setMessages(current => current.map(m => (m.id === tempId ? insertedMessage : m)));
        }
        
        setSending(false);
    };
    
    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !user) return;

        setSending(true);
        const filePath = `${user.id}/messages/${Date.now()}.${file.name.split('.').pop()}`;
        const { error: uploadError } = await supabase.storage.from('uploads').upload(filePath, file);

        if (uploadError) {
            alert(`فشل رفع الصورة: ${uploadError.message}`);
            setSending(false);
            return;
        }

        await handleSendMessage(null, filePath);
        if (imageInputRef.current) imageInputRef.current.value = "";
    };

    const handleAudioUpload = async (audioFile: File) => {
        if (!user) return;
        setSending(true);
        const filePath = `${user.id}/messages/${Date.now()}.webm`;
        const { error: uploadError } = await supabase.storage.from('uploads').upload(filePath, audioFile);

        if (uploadError) {
            alert(`فشل رفع الصوت: ${uploadError.message}`);
            setSending(false);
            return;
        }

        await handleSendMessage(null, null, filePath);
    };

    const handleStartRecording = async () => {
        if (isRecording) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            mediaRecorderRef.current = recorder;
            audioChunksRef.current = [];

            recorder.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };

            recorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const audioFile = new File([audioBlob], "recording.webm", { type: "audio/webm" });
                handleAudioUpload(audioFile);
                stream.getTracks().forEach(track => track.stop()); // Stop using the mic
            };

            recorder.start();
            setIsRecording(true);
            setRecordingSeconds(0);
            recordingIntervalRef.current = window.setInterval(() => {
                setRecordingSeconds(prev => prev + 1);
            }, 1000);

        } catch (err) {
            console.error("Mic access error:", err);
            setError("لا يمكن الوصول إلى الميكروفون. يرجى التحقق من الأذونات.");
        }
    };

    const handleStopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
        }
    };

    const handleCancelRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.onstop = () => {
                 mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
            };
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
            audioChunksRef.current = [];
        }
    };
    
    const handleClearChat = async () => {
        if (!user || !otherUserId) return;
        if (window.confirm('هل أنت متأكد من أنك تريد مسح هذه المحادثة؟ سيتم حذف جميع الرسائل لديك فقط.')) {
            setIsOptionsMenuOpen(false);
            const messageIds = messages.map(m => m.id);
            if(messageIds.length === 0) return;

            const { data, error } = await supabase.rpc('add_user_to_deleted_for', {
                p_user_id: user.id,
                p_message_ids: messageIds
            });
            
            if (error) {
                alert(`فشل مسح المحادثة: ${error.message}`);
            } else {
                setMessages([]);
            }
        }
    };
    
    const handleToggleBlock = () => {
        if (!otherUserId) return;
        setIsOptionsMenuOpen(false);
        const action = isThisUserBlocked ? 'إلغاء حظر' : 'حظر';
        if (window.confirm(`هل أنت متأكد من أنك تريد ${action} هذا المستخدم؟`)) {
            toggleBlock(otherUserId);
        }
    };

    const handleToggleReadReceipts = async () => {
        if (!currentUserProfile || !user) return;
        setIsOptionsMenuOpen(false);

        const newValue = !(currentUserProfile.read_receipts_enabled ?? true);
        
        const { error } = await supabase
            .from('profiles')
            .update({ read_receipts_enabled: newValue })
            .eq('id', user.id);
        
        if (error) {
            alert(`فشل تحديث الإعداد: ${getErrorMessage(error)}`);
        } else {
            await refreshProfile();
        }
    };

    const displayedMessages = messages.filter(m => !m.deleted_for?.includes(user?.id || ''));

    const renderMessages = () => {
        let lastSenderId: string | null = null;
        return displayedMessages.map((msg, index) => {
            const isFirst = lastSenderId !== msg.sender_id;
            const isLast = index === displayedMessages.length - 1 || displayedMessages[index + 1].sender_id !== msg.sender_id;
            lastSenderId = msg.sender_id;
            
            return (
                <MessageBubble
                    key={msg.id}
                    message={msg}
                    isFirstInGroup={isFirst}
                    isLastInGroup={isLast}
                    showReadReceipt={otherUser?.read_receipts_enabled ?? true}
                    selectionMode={selectionMode}
                    isSelected={selectedMessages.includes(msg.id)}
                    onShortPress={handleToggleSelection}
                    onLongPress={handleStartSelection}
                />
            );
        });
    };
    
    if (loading) return <div className="flex h-screen w-full items-center justify-center"><Spinner /></div>;
    if (error) return <div className="flex h-screen w-full items-center justify-center text-red-400 p-4">{error}</div>;

    const cannotSendMessage = amIBlocked || isThisUserBlocked;

    return (
        <div className="flex flex-col h-screen bg-gray-50 dark:bg-zinc-950">
            <header className="bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-10 border-b border-gray-200 dark:border-zinc-800">
                <div className="container mx-auto px-4">
                    {selectionMode ? (
                        <div className="flex justify-between items-center h-16">
                            <div className="flex items-center gap-3">
                                <button onClick={handleExitSelection} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800"> <BackIcon /> </button>
                                <span className="font-bold text-lg">{selectedMessages.length}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={handleCopySelected} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800" aria-label="نسخ"><CopyIcon/></button>
                                <button onClick={() => setShowDeleteConfirm(true)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800" aria-label="حذف"><TrashIcon/></button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex justify-between items-center h-16">
                            <div className="flex items-center gap-3">
                                <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800"> <BackIcon /> </button>
                                <Link to={`/user/${otherUserId}`} className="flex items-center gap-3">
                                    <Avatar url={otherUser?.avatar_url} size={40} userId={otherUserId} showStatus={true} />
                                    <div>
                                        <h1 className="text-lg font-bold truncate text-zinc-900 dark:text-zinc-100 flex items-center">
                                            {otherUser?.full_name}
                                            {isOtherUserAdmin && <AdminBadge />}
                                        </h1>
                                        <p className="text-xs text-gray-500 dark:text-zinc-400">{isOnline(otherUserId || '') ? 'متصل الآن' : 'غير متصل'}</p>
                                    </div>
                                </Link>
                            </div>
                            <div className="flex items-center gap-1 text-zinc-600 dark:text-zinc-300">
                                 <Link to={`/call/video/${otherUserId}`} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800"><VideoCallIcon /></Link>
                                 <Link to={`/call/audio/${otherUserId}`} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800"><AudioCallIcon /></Link>
                                 <div className="relative" ref={optionsMenuRef}>
                                    <button onClick={() => setIsOptionsMenuOpen(p => !p)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800">
                                        <MoreIcon />
                                    </button>
                                    {isOptionsMenuOpen && (
                                        <div className="absolute left-0 mt-2 w-56 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl shadow-lg z-20 py-1">
                                            <Link to={`/user/${otherUserId}`} onClick={() => setIsOptionsMenuOpen(false)} className="block w-full text-right px-4 py-3 text-sm text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700">
                                                عرض الملف الشخصي
                                            </Link>
                                            <button onClick={handleClearChat} className="block w-full text-right px-4 py-3 text-sm text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700">
                                                مسح محتوى الدردشة
                                            </button>
                                            <div className="my-1 h-px bg-gray-200 dark:bg-zinc-700"></div>
                                            <button onClick={handleToggleBlock} className="w-full text-right px-4 py-3 text-sm text-red-500 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-zinc-700">
                                                {isThisUserBlocked ? 'إلغاء حظر المستخدم' : 'حظر المستخدم'}
                                            </button>
                                            <button onClick={handleToggleReadReceipts} className="block w-full text-right px-4 py-3 text-sm text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700">
                                                {(currentUserProfile?.read_receipts_enabled ?? true) ? 'إخفاء صحين الاستلام' : 'إظهار صحين الاستلام'}
                                            </button>
                                        </div>
                                    )}
                                 </div>
                            </div>
                        </div>
                    )}
                </div>
            </header>
            
            <main ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
                {renderMessages()}
            </main>

            {cannotSendMessage && (
                <div className="p-4 text-center text-sm text-gray-500 dark:text-zinc-400 border-t border-gray-200 dark:border-zinc-800">
                    {isThisUserBlocked ? 'لقد قمت بحظر هذا المستخدم.' : 'لا يمكنك مراسلة هذا الحساب.'}
                    {isThisUserBlocked && <button onClick={handleToggleBlock} className="text-teal-500 ml-2">إلغاء الحظر</button>}
                </div>
            )}
            
            {!cannotSendMessage && (
                <footer className="p-2 border-t border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                    {isRecording ? (
                        <div className="flex items-center gap-2">
                            <button type="button" onClick={handleCancelRecording} className="p-3 text-red-500 hover:text-red-600" disabled={sending}>
                                <TrashIcon />
                            </button>
                            <div className="flex-1 bg-gray-100 dark:bg-zinc-800 rounded-full px-4 py-2 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                                    <span className="text-zinc-900 dark:text-zinc-200 font-mono">
                                        {String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}:
                                        {String(recordingSeconds % 60).padStart(2, '0')}
                                    </span>
                                </div>
                            </div>
                            <button type="button" onClick={handleStopRecording} className="p-3 text-white bg-teal-500 rounded-full hover:bg-teal-600 disabled:opacity-50" disabled={sending}>
                                {sending ? <Spinner /> : <SendIcon />}
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(newMessage, null, null); }} className="flex items-center gap-2">
                             <button type="button" onClick={() => imageInputRef.current?.click()} className="p-3 text-gray-500 dark:text-zinc-400 hover:text-teal-500" disabled={sending}><ImageIcon /></button>
                             <input type="file" ref={imageInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                             <button type="button" onClick={handleStartRecording} className="p-3 text-gray-500 dark:text-zinc-400 hover:text-teal-500" disabled={sending}><MicIcon /></button>
                             <input
                                type="text"
                                placeholder="اكتب رسالة..."
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                disabled={sending}
                                className="flex-1 bg-gray-100 dark:bg-zinc-800 border-none rounded-full px-4 py-2 focus:ring-2 focus:ring-teal-500 outline-none text-zinc-900 dark:text-zinc-200"
                            />
                            <button type="submit" className="p-3 text-white bg-teal-500 rounded-full hover:bg-teal-600 disabled:opacity-50" disabled={sending || !newMessage.trim()}>
                                {sending ? <Spinner /> : <SendIcon />}
                            </button>
                        </form>
                    )}
                </footer>
            )}
            
            <DeleteMessagesModal
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                messageCount={selectedMessages.length}
                onDeleteForMe={handleDeleteForMe}
                onDeleteForEveryone={canDeleteForEveryone ? handleDeleteForEveryone : undefined}
            />

        </div>
    );
};


interface DeleteMessagesModalProps {
    isOpen: boolean;
    onClose: () => void;
    onDeleteForMe: () => void;
    onDeleteForEveryone?: () => void; // Optional
    messageCount: number;
}

const DeleteMessagesModal: React.FC<DeleteMessagesModalProps> = ({ isOpen, onClose, onDeleteForMe, onDeleteForEveryone, messageCount }) => {
    const modalRoot = document.getElementById('modal-root');
    if (!isOpen || !modalRoot) return null;
    
    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
                <div className="p-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">حذف {messageCount} رسائل؟</h3>
                </div>
                <div className="flex flex-col gap-2 p-4 pt-0">
                    {onDeleteForEveryone && (
                        <Button onClick={onDeleteForEveryone} variant="secondary" className="!bg-red-600 hover:!bg-red-700 !text-white">
                            الحذف لدى الجميع
                        </Button>
                    )}
                    <Button onClick={onDeleteForMe} variant="secondary">
                        الحذف لدي
                    </Button>
                    <Button onClick={onClose} variant="secondary" className="!bg-zinc-600 hover:!bg-zinc-700">
                        إلغاء
                    </Button>
                </div>
            </div>
        </div>,
        modalRoot
    );
};

export default ChatScreen;