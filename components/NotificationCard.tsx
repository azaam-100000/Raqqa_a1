
import React from 'react';
import { Link } from 'react-router-dom';
import { Notification } from '../types';
import Avatar from './ui/Avatar';

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

const getNotificationLink = (notification: Notification): string => {
    switch (notification.type) {
        case 'like_post':
        case 'comment_post':
            return `/post/${notification.entity_id}`;
        case 'new_message':
            return `/chat/${notification.entity_id}`;
        default:
            return '#';
    }
};

const getNotificationText = (notification: Notification): React.ReactNode => {
    const actorName = <span className="font-bold">{notification.actors?.full_name || 'أحدهم'}</span>;
    switch (notification.type) {
        case 'like_post':
            return <>{actorName} أعجب بمنشورك.</>;
        case 'comment_post':
            return <>{actorName} علق على منشورك.</>;
        case 'new_message':
            return <>{actorName} أرسل لك رسالة جديدة.</>;
        default:
            return 'إشعار جديد.';
    }
};

const NotificationCard: React.FC<{ notification: Notification }> = ({ notification }) => {
    
    const text = getNotificationText(notification);
    const link = getNotificationLink(notification);

    return (
        <Link 
            to={link}
            className={`flex items-start gap-4 p-4 transition-colors ${notification.read ? 'hover:bg-slate-800' : 'bg-slate-800/50 hover:bg-slate-800'}`}
        >
            <div className="flex-shrink-0 mt-1">
                <Avatar url={notification.actors?.avatar_url} size={40} />
            </div>
            <div className="flex-1">
                <p className="text-slate-300">{text}</p>
                <p className="text-xs text-slate-400 mt-1">{timeAgo(notification.created_at)}</p>
            </div>
            {!notification.read && (
                 <div className="flex-shrink-0 mt-1 h-2.5 w-2.5 rounded-full bg-cyan-500" />
            )}
        </Link>
    );
};

export default NotificationCard;
