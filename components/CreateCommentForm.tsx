

import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import Textarea from './ui/Textarea';
import Button from './ui/Button';
import Avatar from './ui/Avatar';
import { Comment } from '../types';
import { getErrorMessage } from '../utils/errors';

interface CreateCommentFormProps {
  postId: string;
  postOwnerId: string;
  onCommentCreated: (newComment: Comment) => void;
  parentCommentId?: string;
  parentCommentAuthorId?: string;
  onReplySuccess?: () => void;
}

const CreateCommentForm: React.FC<CreateCommentFormProps> = ({ postId, postOwnerId, onCommentCreated, parentCommentId, parentCommentAuthorId, onReplySuccess }) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, profile } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !user) return;

    setLoading(true);
    setError(null);

    const { data: insertedComment, error } = await supabase
      .from('comments')
      .insert([{ 
          content: content.trim(), 
          user_id: user.id, 
          post_id: postId,
          parent_comment_id: parentCommentId || null
      }])
      .select('id, content, created_at, user_id, post_id, parent_comment_id')
      .single();


    if (error) {
      setLoading(false);
      setError(`فشل إضافة التعليق: ${getErrorMessage(error)}`);
      console.error('Error creating comment:', error);
    } else {
      setContent('');
      
      const newFullComment = {
        ...insertedComment,
        profiles: {
            full_name: profile?.full_name || null,
            avatar_url: profile?.avatar_url || null,
        }
      };
      onCommentCreated(newFullComment as any);

      // Notify post owner (if not self)
      if (user.id !== postOwnerId) {
        await supabase.from('notifications').insert({
            user_id: postOwnerId,
            actor_id: user.id,
            type: 'comment_post',
            entity_id: postId,
        });
      }
      
      // Notify parent comment author (if it's a reply and not self)
      if (parentCommentId && parentCommentAuthorId && user.id !== parentCommentAuthorId) {
          await supabase.from('notifications').insert({
            user_id: parentCommentAuthorId,
            actor_id: user.id,
            type: 'reply_comment',
            entity_id: postId,
          });
      }

      if (onReplySuccess) onReplySuccess();
      setLoading(false);
    }
  };

  return (
    <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">
           <Avatar url={profile?.avatar_url} size={32} userId={profile?.id} showStatus={true} />
        </div>
        <div className="flex-1">
          <form onSubmit={handleSubmit}>
            <Textarea
              rows={parentCommentId ? 1 : 2}
              placeholder={parentCommentId ? "اكتب رداً..." : "أضف تعليقاً..."}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={loading}
              required
              className={parentCommentId ? "!py-2 !text-sm" : ""}
            />
            {error && <p className="text-red-400 text-sm mt-2 text-right">{error}</p>}
            <div className="flex justify-end mt-2">
              <div className="w-full sm:w-auto">
                 <Button type="submit" loading={loading} disabled={!content.trim()} className="!py-2 !text-sm">
                   {parentCommentId ? "رد" : "تعليق"}
                 </Button>
              </div>
            </div>
          </form>
        </div>
    </div>
  );
};

export default CreateCommentForm;