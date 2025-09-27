
import React from 'react';
import { Link } from 'react-router-dom';
import { Conversation } from '../types';
import Avatar from './ui/Avatar';
import { useAuth } from '../hooks/useAuth';

const timeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'الآن';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `منذ ${minutes} د`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `منذ ${hours} س`;
    const days = Math.floor(hours / 24);
    return `منذ ${days} ي`;
};

const ConversationCard: React.FC<{ conversation: Conversation }> = ({ conversation }) => {
    const { user } = useAuth();
    const { profile, last_message } = conversation;

    const isYou = last_message.sender_id === user?.id;
    const messagePrefix = isYou ? 'أنت: ' : '';

    return (
        <Link 
            to={`/chat/${profile.id}`} 
            className="flex items-center gap-4 p-3 hover:bg-slate-800 transition-colors"
        >
            <Avatar url={profile.avatar_url} size={48} />
            <div className="flex-1 overflow-hidden">
                <div className="flex justify-between items-center">
                    <p className="font-bold text-white truncate">{profile.full_name}</p>
                    <p className="text-xs text-slate-400 flex-shrink-0">{timeAgo(last_message.created_at)}</p>
                </div>
                <p className="text-sm text-slate-400 truncate">
                    {messagePrefix}
                    {last_message.content}
                </p>
            </div>
        </Link>
    );
};

export default ConversationCard;
