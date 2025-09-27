

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Post, Comment, Like } from '../types';
import Spinner from '../components/ui/Spinner';
import PostCard from '../components/PostCard';
import CommentCard from '../components/CommentCard';
import CreateCommentForm from '../components/CreateCommentForm';

const BackIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
);

const PostDetailScreen: React.FC = () => {
    const { postId } = useParams<{ postId: string }>();
    const navigate = useNavigate();
    const [post, setPost] = useState<Post | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!postId) return;
        
        setLoading(true);
        setError(null);

        const fetchInitialData = async () => {
             try {
                // Fetch post
                const { data: postData, error: postError } = await supabase
                    .from('posts')
                    .select('*, profiles!user_id(full_name, avatar_url), groups!group_id(name), likes(user_id), comments(count)')
                    .eq('id', postId)
                    .single();

                if (postError) {
                    if (postError.code === 'PGRST116') { // Post not found
                         throw new Error('لم يتم العثور على المنشور.');
                    }
                    throw new Error('فشل في تحميل المنشور.');
                }
                setPost(postData as any);

                // Fetch comments
                const { data: commentsData, error: commentsError } = await supabase
                    .from('comments')
                    .select('*, profiles!user_id(full_name, avatar_url)')
                    .eq('post_id', postId)
                    .order('created_at', { ascending: true });

                if (commentsError) {
                    throw new Error('فشل في تحميل التعليقات.');
                }
                setComments(commentsData as any[]);

            } catch (err: any) {
                console.error(err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        
        fetchInitialData();

        // Subscription for comments
        const commentsSubscription = supabase
            .channel(`public:comments:post_id=eq.${postId}`)
            .on<Comment>(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'comments', filter: `post_id=eq.${postId}` },
                async (payload) => {
                    if (payload.eventType === 'INSERT') {
                        const { data: newComment, error } = await supabase
                            .from('comments')
                            .select('*, profiles!user_id(full_name, avatar_url)')
                            .eq('id', payload.new.id)
                            .single();
                        if (!error && newComment) {
                            setComments(current => {
                                if (current.some(c => c.id === newComment.id)) return current;
                                return [...current, newComment as any].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                            });
                        }
                    } else if (payload.eventType === 'UPDATE') {
                        const { data: updatedComment, error } = await supabase
                            .from('comments')
                            .select('*, profiles!user_id(full_name, avatar_url)')
                            .eq('id', payload.new.id)
                            .single();
                        if (!error && updatedComment) {
                            handleCommentUpdated(updatedComment as any);
                        }
                    } else if (payload.eventType === 'DELETE') {
                        const deletedCommentId = payload.old.id;
                        if (deletedCommentId) {
                            handleCommentDeleted(deletedCommentId as string);
                        }
                    }
                }
            )
            .subscribe();

        const likesSubscription = supabase
          .channel(`public:likes:post_id=eq.${postId}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'likes', filter: `post_id=eq.${postId}`},
            (payload) => {
              setPost(currentPost => {
                if (!currentPost) return null;
                let newLikes: Like[];
                if (payload.eventType === 'INSERT') {
                  const newLike = payload.new as {user_id: string};
                  if (currentPost.likes.some(l => l.user_id === newLike.user_id)) return currentPost;
                  newLikes = [...currentPost.likes, { user_id: newLike.user_id }];
                } else if (payload.eventType === 'DELETE') {
                  const oldLike = payload.old as {user_id: string};
                  newLikes = currentPost.likes.filter(l => l.user_id !== oldLike.user_id);
                } else {
                  return currentPost;
                }
                return { ...currentPost, likes: newLikes };
              });
            }
          ).subscribe();
          
        const postSubscription = supabase
            .channel(`public:posts:id=eq.${postId}`)
            .on<Post>(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'posts', filter: `id=eq.${postId}` },
                (payload) => {
                    setPost(currentPost => currentPost ? {...currentPost, ...payload.new} as Post : null)
                }
            )
            .on<Post>(
                 'postgres_changes',
                 { event: 'DELETE', schema: 'public', table: 'posts', filter: `id=eq.${postId}` },
                 () => {
                    handlePostDeleted();
                 }
            )
            .subscribe();


        return () => {
            supabase.removeChannel(commentsSubscription);
            supabase.removeChannel(likesSubscription);
            supabase.removeChannel(postSubscription);
        };
    }, [postId]);

    const handlePostDeleted = () => {
        navigate('/home', { replace: true });
    };

    const handlePostUpdated = (updatedPost: Post) => {
        setPost(currentPost => currentPost ? {...currentPost, ...updatedPost} : updatedPost);
    };

    const handleCommentDeleted = (commentId: string) => {
        setComments(current => current.filter(c => c.id !== commentId));
    };

    const handleCommentUpdated = (updatedComment: Comment) => {
        setComments(current => current.map(c => c.id === updatedComment.id ? updatedComment : c));
    };

    return (
      <div className="min-h-screen bg-slate-900 text-white">
        <header className="bg-slate-800/80 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-700">
            <div className="container mx-auto px-4">
                <div className="flex justify-between items-center h-16">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-slate-700">
                        <BackIcon />
                    </button>
                    <h1 className="text-xl font-bold">المنشور</h1>
                    <div className="w-10"></div> {/* Spacer */}
                </div>
            </div>
        </header>

        <main className="container mx-auto px-4 py-6">
          <div className="max-w-2xl mx-auto">
            {loading && <div className="text-center py-10"><Spinner /></div>}
            {error && <p className="text-center text-red-400 py-10">{error}</p>}
            {post && (
              <>
                <PostCard 
                    post={post} 
                    onPostDeleted={handlePostDeleted}
                    onPostUpdated={handlePostUpdated}
                />
                <div className="mt-6">
                    <h2 className="text-lg font-bold mb-4">التعليقات</h2>
                    <CreateCommentForm postId={post.id} postOwnerId={post.user_id} />
                    <div className="space-y-4 mt-4">
                        {comments.length > 0 ? (
                            comments.map(comment => (
                                <CommentCard 
                                    key={comment.id} 
                                    comment={comment} 
                                    onCommentUpdated={handleCommentUpdated} 
                                    onCommentDeleted={handleCommentDeleted}
                                />
                            ))
                        ) : (
                            !loading && <p className="text-slate-400 text-center py-4">لا توجد تعليقات. كن أول من يعلق!</p>
                        )}
                    </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    );
};

export default PostDetailScreen;