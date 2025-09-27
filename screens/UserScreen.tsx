

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Profile, Post } from '../types';
import { useAuth } from '../hooks/useAuth';
import Spinner from '../components/ui/Spinner';
import Avatar from '../components/ui/Avatar';
import PostCard from '../components/PostCard';
import Button from '../components/ui/Button';

const BackIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
);

const UserScreen: React.FC = () => {
    const { userId } = useParams<{ userId: string }>();
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();

    const [profile, setProfile] = useState<Profile | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!userId) {
            setError("لم يتم تحديد المستخدم.");
            setLoading(false);
            return;
        }

        const fetchUserData = async () => {
            setLoading(true);
            setError(null);
            try {
                // Fetch profile
                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', userId)
                    .single();

                if (profileError || !profileData) {
                    throw new Error("لم يتم العثور على المستخدم.");
                }
                setProfile(profileData);

                // Fetch posts by this user
                const { data: postsData, error: postsError } = await supabase
                    .from('posts')
                    .select('*, profiles!user_id(full_name, avatar_url), groups!group_id(name), likes(user_id), comments(count)')
                    .eq('user_id', userId)
                    .order('created_at', { ascending: false });

                if (postsError) {
                    throw new Error("فشل في تحميل منشورات المستخدم.");
                }
                setPosts(postsData as any[]);

            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, [userId]);
    
    const handlePostDeleted = (postId: string) => {
        setPosts(currentPosts => currentPosts.filter(p => p.id !== postId));
    };

    const handlePostUpdated = (updatedPost: Post) => {
        setPosts(currentPosts => currentPosts.map(p => (p.id === updatedPost.id ? updatedPost : p)));
    };

    const isOwnProfile = currentUser?.id === userId;

    return (
        <div className="min-h-screen bg-slate-900 text-white">
            <header className="bg-slate-800/80 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-700">
                <div className="container mx-auto px-4">
                     <div className="flex items-center h-16 relative">
                        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-slate-700">
                            <BackIcon />
                        </button>
                        <h1 className="text-xl font-bold text-center w-full truncate px-12">
                           الملف الشخصي
                        </h1>
                    </div>
                </div>
            </header>
            <main className="container mx-auto px-4 py-6">
                <div className="max-w-2xl mx-auto">
                    {loading && <div className="text-center py-10"><Spinner /></div>}
                    {!loading && error && <p className="text-center text-red-400 py-10">{error}</p>}
                    {profile && (
                        <div>
                            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6 flex flex-col items-center text-center">
                                <Avatar url={profile.avatar_url} size={96} />
                                <h2 className="text-2xl font-bold mt-4">{profile.full_name}</h2>
                                {isOwnProfile && (
                                     <div className="mt-4 w-full max-w-xs">
                                        <Button variant="secondary" onClick={() => navigate('/profile')}>
                                            تعديل الملف الشخصي
                                        </Button>
                                     </div>
                                )}
                            </div>
                            
                            <h3 className="text-lg font-bold mb-4">المنشورات ({posts.length})</h3>
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
                                <p className="text-center text-slate-400 py-10 bg-slate-800 rounded-lg">
                                    لم يقم هذا المستخدم بنشر أي شيء بعد.
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default UserScreen;