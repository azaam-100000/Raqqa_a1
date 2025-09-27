
import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { Message } from '../types';

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const { user } = useAuth();
  const isSender = message.sender_id === user?.id;

  const bubbleClasses = isSender
    ? 'bg-cyan-600 rounded-br-none self-end'
    : 'bg-slate-700 rounded-bl-none self-start';
  
  const containerClasses = isSender ? 'justify-end' : 'justify-start';

  return (
    <div className={`flex ${containerClasses}`}>
      <div className={`max-w-md lg:max-w-xl px-4 py-3 rounded-2xl ${bubbleClasses}`}>
        <p className="text-white whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
};

export default MessageBubble;
