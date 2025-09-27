

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import { Post, Like } from '../types';
import CreatePostForm from '../components/CreatePostForm';
import PostCard from '../components/PostCard';
import Spinner from '../components/ui/Spinner';
import Avatar from '../components/ui/Avatar';
import Input from '../components/ui/Input';

const SearchIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
);

const MessengerIcon = () => (
    <svg fill="currentColor" viewBox="0 0 24 24" width="24" height="24">
        <path d="M12 2C6.477 2 2 6.477 2 12c0 3.233 1.522 6.113 3.92 8.016l-1.186 2.373a.5.5 0 00.666.666l2.373-1.186A9.953 9.953 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm1.235 12.923L9.5 12.5l-3.235 1.618L8.5 10.5 4.765 8.882 14.5 4.5l-2.265 8.423z"></path>
    </svg>
);

const NotificationsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
);

const LogoutIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
);

const HomeScreen: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!user) return;

    const fetchUnreadCount = async () => {
        const { count } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('read', false);
        setUnreadCount(count || 0);
    };

    fetchUnreadCount();

    const subscription = supabase
        .channel(`public:notifications:user_id=eq.${user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, fetchUnreadCount)
        .subscribe();
        
    return () => {
        supabase.removeChannel(subscription);
    }

  }, [user]);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('posts')
        .select('*, profiles!user_id(full_name, avatar_url), groups!group_id(name), likes(user_id), comments(count)')
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setPosts(data as any[]);
    } catch (error: any) {
      console.error("Error fetching posts:", error.message || error);
      let friendlyMessage = 'لا يمكن تحميل المنشورات. يرجى المحاولة مرة أخرى.';
      if (error && error.message) {
        if (error.message.includes('relation "profiles" does not exist')) {
            friendlyMessage = 'يبدو أن جدول "profiles" غير موجود. يرجى التأكد من إنشائه في قاعدة بيانات Supabase.';
        } else if (error.message.includes('relation "posts" does not exist')) {
            friendlyMessage = 'يبدو أن جدول "posts" غير موجود. يرجى التأكد من إنشائه.';
        } else if (error.message.includes('relation "comments" does not exist')) {
            friendlyMessage = 'يبدو أن جدول "comments" غير موجود. يرجى التأكد من إنشائه.';
        } else if (error.message.includes('violates row-level security policy')) {
            friendlyMessage = 'تم رفض الوصول. يرجى التحقق من صلاحيات الوصول (RLS policies) لجداول "posts" و "profiles" و "comments" والسماح بعمليات القراءة للمستخدمين المسجلين.';
        } else {
             friendlyMessage = `خطأ في تحميل المنشورات: ${error.message}`;
        }
      }
      
      setError(friendlyMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();

    const postsSubscription = supabase
      .channel('public:posts:home')
      .on<Post>(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'posts' },
        async (payload) => {
           if (payload.eventType === 'INSERT') {
             const { data: newPost, error: fetchNewPostError } = await supabase
                .from('posts')
                .select('*, profiles!user_id(full_name, avatar_url), groups!group_id(name), likes(user_id), comments(count)')
                .eq('id', payload.new.id)
                .single();

              if (!fetchNewPostError && newPost) {
                setPosts((currentPosts) => {
                  if (currentPosts.some(p => p.id === newPost.id)) return currentPosts;
                  return [newPost as any, ...currentPosts];
                });
              }
           } else if (payload.eventType === 'UPDATE') {
             const { data: updatedPost, error: fetchUpdatedPostError } = await supabase
                .from('posts')
                .select('*, profiles!user_id(full_name, avatar_url), groups!group_id(name), likes(user_id), comments(count)')
                .eq('id', payload.new.id)
                .single();
            
              if (!fetchUpdatedPostError && updatedPost) {
                 handlePostUpdated(updatedPost as any);
              }
           } else if (payload.eventType === 'DELETE') {
             const deletedPostId = payload.old.id;
             if(deletedPostId) {
                handlePostDeleted(deletedPostId as string);
             }
           }
        }
      )
      .subscribe();
      
    const likesSubscription = supabase
      .channel('public:likes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'likes'},
        (payload) => {
            if (payload.eventType === 'INSERT') {
                const newLike = payload.new as Like & { post_id: string };
                setPosts(currentPosts => currentPosts.map(p => {
                    if (p.id === newLike.post_id) {
                        const userHasLiked = p.likes.some(like => like.user_id === newLike.user_id);
                        if (!userHasLiked) {
                            return { ...p, likes: [...p.likes, { user_id: newLike.user_id }] };
                        }
                    }
                    return p;
                }));
            } else if (payload.eventType === 'DELETE') {
                const oldLike = payload.old as Like & { post_id: string };
                setPosts(currentPosts => currentPosts.map(p => {
                    if (p.id === oldLike.post_id) {
                        return { ...p, likes: p.likes.filter(like => like.user_id !== oldLike.user_id) };
                    }
                    return p;
                }));
            }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(postsSubscription);
      supabase.removeChannel(likesSubscription);
    };
  }, [fetchPosts]);

  const handlePostDeleted = (postId: string) => {
    setPosts(currentPosts => currentPosts.filter(p => p.id !== postId));
  };

  const handlePostUpdated = (updatedPost: Post) => {
    setPosts(currentPosts => currentPosts.map(p => (p.id === updatedPost.id ? updatedPost : p)));
  };

  const filteredPosts = useMemo(() => {
    if (!searchQuery.trim()) {
        return posts;
    }
    return posts.filter(post =>
        post.content.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [posts, searchQuery]);


  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center py-10">
          <Spinner />
        </div>
      );
    }

    if (error) {
      return <p className="text-center text-red-400 py-10">{error}</p>;
    }
    
    if (posts.length === 0 && !searchQuery) {
      return <p className="text-center text-slate-400 py-10">لا توجد منشورات حتى الآن. كن أول من ينشر!</p>;
    }

    if (filteredPosts.length === 0 && searchQuery) {
        return <p className="text-center text-slate-400 py-10">لم يتم العثور على نتائج بحث لـ "{searchQuery}"</p>;
    }

    return (
      <div>
        {filteredPosts.map((post) => (
          <PostCard 
            key={post.id} 
            post={post}
            onPostDeleted={handlePostDeleted}
            onPostUpdated={handlePostUpdated}
           />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="bg-slate-800/80 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-700 shadow-md">
          <div className="container mx-auto px-4 flex justify-between items-center h-16">
              <div className="flex items-center gap-4">
                  <h1 className="text-2xl font-bold text-cyan-400">سوق محافظة الرقه</h1>
              </div>

              <div className="flex-1 max-w-xs sm:max-w-md mx-4 hidden sm:block">
                  <div className="relative">
                      <Input
                          type="text"
                          placeholder="ابحث في سوق محافظة الرقه..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pr-10 w-full !bg-slate-700 !border-slate-600 rounded-full"
                      />
                      <SearchIcon />
                  </div>
              </div>

              <div className="flex items-center gap-2">
                  <Link to="/messages" className="h-10 w-10 flex items-center justify-center bg-slate-700 hover:bg-slate-600 rounded-full transition-colors text-slate-200">
                      <MessengerIcon />
                  </Link>
                  <Link to="/notifications" className="relative h-10 w-10 flex items-center justify-center bg-slate-700 hover:bg-slate-600 rounded-full transition-colors text-slate-200">
                      <NotificationsIcon />
                      {unreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 block h-5 w-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold border-2 border-slate-800">
                              {unreadCount > 9 ? '9+' : unreadCount}
                          </span>
                      )}
                  </Link>

                  <div className="relative" ref={dropdownRef}>
                      <button onClick={() => setIsDropdownOpen(prev => !prev)} className="rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-cyan-500">
                          <Avatar url={profile?.avatar_url} size={40} />
                      </button>
                      {isDropdownOpen && (
                          <div className="absolute left-0 mt-2 w-72 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-20 p-2">
                              <Link to={`/user/${profile?.id}`} className="block p-2 hover:bg-slate-700 rounded-md" onClick={() => setIsDropdownOpen(false)}>
                                  <div className="flex items-center gap-3">
                                      <Avatar url={profile?.avatar_url} size={48} />
                                      <div>
                                          <p className="font-bold text-white">{profile?.full_name}</p>
                                          <p className="text-sm text-slate-400">عرض ملفك الشخصي</p>
                                      </div>
                                  </div>
                              </Link>
                              <hr className="border-slate-700 my-2" />
                              <button onClick={signOut} className="w-full flex items-center gap-3 text-right p-2 hover:bg-slate-700 rounded-md text-slate-300">
                                  <div className="h-9 w-9 flex items-center justify-center bg-slate-700 rounded-full"><LogoutIcon /></div>
                                  <span>تسجيل الخروج</span>
                              </button>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <div className="relative mb-6 sm:hidden">
            <Input
                type="text"
                placeholder="ابحث في المنشورات..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10 w-full !bg-slate-700 !border-slate-600 rounded-full"
            />
            <SearchIcon />
          </div>
          <CreatePostForm profile={profile} />
          {renderContent()}
        </div>
      </main>
      
    </div>
  );
};

export default HomeScreen;