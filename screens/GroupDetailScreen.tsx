

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Group, GroupPost, Post } from '../types';
import { useAuth } from '../hooks/useAuth';
import Spinner from '../components/ui/Spinner';
import Avatar from '../components/ui/Avatar';
import Button from '../components/ui/Button';
import CreatePostForm from '../components/CreatePostForm';
import PostCard from '../components/PostCard';

const BackIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
);

const GroupDetailScreen: React.FC = () => {
    const { groupId } = useParams<{ groupId: string }>();
    const navigate = useNavigate();
    const { user, profile } = useAuth();
    const [group, setGroup] = useState<Group | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [isMember, setIsMember] = useState(false);
    const [memberCount, setMemberCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [joinLoading, setJoinLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchGroupData = useCallback(async () => {
        if (!groupId || !user) return;
        setLoading(true);
        setError(null);
        try {
            const { data, error: groupError } = await supabase
                .from('groups')
                .select('*, profiles!user_id(full_name, avatar_url), group_members(count)')
                .eq('id', groupId)
                .single();
            if (groupError) throw new Error("لم يتم العثور على المجموعة.");
            setGroup(data as any);
            setMemberCount(data.group_members[0]?.count || 0);

            const { data: memberData, error: memberError } = await supabase
                .from('group_members')
                .select('*', { count: 'exact' })
                .eq('group_id', groupId)
                .eq('user_id', user.id);
            if (memberError) throw memberError;
            setIsMember(memberData.length > 0);

            const { data: postsData, error: postsError } = await supabase
                .from('posts')
                .select('*, profiles!user_id(full_name, avatar_url), groups!group_id(name), likes(user_id), comments(count)')
                .eq('group_id', groupId)
                .order('created_at', { ascending: false });

            if (postsError) {
                throw new Error("فشل في تحميل منشورات المجموعة.");
            }
            setPosts(postsData as any[]);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [groupId, user]);

    useEffect(() => {
        fetchGroupData();
    }, [fetchGroupData]);

    const handleJoinLeave = async () => {
        if (!user || !groupId) return;
        setJoinLoading(true);
        if (isMember) {
            // Leave group
            await supabase.from('group_members').delete().match({ group_id: groupId, user_id: user.id });
            setIsMember(false);
            setMemberCount(c => c - 1);
        } else {
            // Join group
            await supabase.from('group_members').insert({ group_id: groupId, user_id: user.id });
            setIsMember(true);
            setMemberCount(c => c + 1);
        }
        setJoinLoading(false);
    };

     const handlePostDeleted = (postId: string) => {
        setPosts(currentPosts => currentPosts.filter(p => p.id !== postId));
    };

    const handlePostUpdated = (updatedPost: Post) => {
        setPosts(currentPosts => currentPosts.map(p => (p.id === updatedPost.id ? updatedPost : p)));
    };
    
    const handlePostCreated = (newPost: Post) => {
        setPosts(currentPosts => [newPost, ...currentPosts]);
    }

    return (
        <div className="min-h-screen bg-slate-900 text-white">
            <header className="bg-slate-800/80 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-700">
                <div className="container mx-auto px-4">
                     <div className="flex items-center h-16 relative">
                        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-slate-700">
                            <BackIcon />
                        </button>
                        <h1 className="text-xl font-bold text-center w-full truncate px-12">
                           {loading ? '...' : group?.name || 'تفاصيل المجموعة'}
                        </h1>
                    </div>
                </div>
            </header>
            <main className="container mx-auto px-4 py-6">
                 <div className="max-w-2xl mx-auto">
                     {loading && <div className="text-center py-10"><Spinner /></div>}
                     {!loading && error && <p className="text-center text-red-400 py-10">{error}</p>}
                     {group && (
                        <div>
                            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h2 className="text-2xl font-bold">{group.name}</h2>
                                        <p className="text-slate-400">{memberCount} أعضاء</p>
                                    </div>
                                    <Avatar url={group.profiles?.avatar_url} size={56} />
                                </div>
                                {group.description && <p className="text-slate-300 mt-4 pt-4 border-t border-slate-700">{group.description}</p>}
                                <div className="mt-4">
                                    <Button 
                                        onClick={handleJoinLeave}
                                        loading={joinLoading}
                                        variant={isMember ? 'secondary' : 'primary'}
                                    >
                                        {isMember ? 'مغادرة المجموعة' : 'الانضمام للمجموعة'}
                                    </Button>
                                </div>
                            </div>

                            {isMember ? (
                                <div>
                                    <CreatePostForm groupId={groupId} onPostCreated={handlePostCreated} profile={profile} />
                                    {posts.length > 0 ? (
                                        posts.map(post => (
                                            <PostCard 
                                                key={post.id} 
                                                post={post} 
                                                onPostDeleted={handlePostDeleted} 
                                                onPostUpdated={handlePostUpdated}
                                            />
                                        ))
                                    ) : (
                                        <p className="text-center text-slate-400 py-10">
                                            لا توجد منشورات في هذه المجموعة. كن أول من ينشر!
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <p className="text-center text-slate-400 bg-slate-800 p-6 rounded-lg">
                                    يجب عليك الانضمام للمجموعة لترى المنشورات وتشارك فيها.
                                </p>
                            )}
                        </div>
                     )}
                 </div>
            </main>
        </div>
    );
};

export default GroupDetailScreen;