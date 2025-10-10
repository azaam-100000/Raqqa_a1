import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../services/supabase';
import { Session, User, RealtimeChannel } from '@supabase/supabase-js';
import type { Provider } from '@supabase/supabase-js';
import { Profile } from '../types';

export interface PresenceState {
  [key: string]: {
    presence_ref: string;
    online_at: string;
  }[];
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signInWithPassword: (email: string, password: string) => Promise<any>;
  signUpWithPassword: (email: string, password: string, fullName: string) => Promise<any>;
  signInWithOAuth: (provider: Provider) => Promise<any>;
  verifyOtp: (email: string, token: string) => Promise<any>;
  resendConfirmationEmail: (email: string) => Promise<any>;
  signOut: () => void;
  refreshProfile: () => Promise<void>;
  isOnline: (userId: string) => boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState<PresenceState>({});

  const checkProfileStatus = (profileToCheck: Profile): Profile | null => {
    if (profileToCheck.status === 'banned') {
      supabase.auth.signOut();
      alert('تم حظر هذا الحساب.');
      return null;
    }
    if (profileToCheck.status === 'suspended') {
      supabase.auth.signOut();
      alert('تم تعليق هذا الحساب مؤقتاً.');
      return null;
    }
    return profileToCheck;
  };

  const getOrCreateProfile = async (authUser: User): Promise<Profile | null> => {
    // 1. Try to fetch the profile
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, bio, status')
      .eq('id', authUser.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error.message);
      return null;
    }

    if (data) {
      return checkProfileStatus(data);
    }
    
    // 2. If no profile, create one.
    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: authUser.id,
        full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'مستخدم جديد',
        avatar_url: authUser.user_metadata?.avatar_url,
      })
      .select('id, full_name, avatar_url, bio, status')
      .single();
    
    if (insertError) {
      console.error('Error creating profile:', insertError.message);
      return null;
    }

    return checkProfileStatus(newProfile);
  };

  useEffect(() => {
    const getInitialData = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        const authUser = session?.user ?? null;
        setUser(authUser);
        if (authUser) {
            const userProfile = await getOrCreateProfile(authUser);
            setProfile(userProfile);
        }
        setLoading(false);
    };

    getInitialData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      const authUser = newSession?.user ?? null;
      setUser(authUser);
      if (authUser) {
        // This handles profile creation for new users, especially from OAuth
        const userProfile = await getOrCreateProfile(authUser);
        setProfile(userProfile);
      } else {
        setProfile(null);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);
  
  // Presence tracking useEffect
  useEffect(() => {
    let presenceChannel: RealtimeChannel | null = null;
    if (user) {
        presenceChannel = supabase.channel('online-users', {
            config: {
                presence: { key: user.id },
            },
        });

        presenceChannel
          .on('presence', { event: 'sync' }, () => {
              const newState = presenceChannel!.presenceState();
              setOnlineUsers(newState as PresenceState);
          })
          .on('presence', { event: 'join' }, ({ key, newPresences }) => {
              setOnlineUsers(prev => ({
                  ...prev,
                  [key]: newPresences,
              }));
          })
          .on('presence', { event: 'leave' }, ({ key }) => {
              setOnlineUsers(prev => {
                  const newState = { ...prev };
                  delete newState[key];
                  return newState;
              });
          });

        presenceChannel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await presenceChannel!.track({ online_at: new Date().toISOString() });
            }
        });
    }

    return () => {
        if (presenceChannel) {
            supabase.removeChannel(presenceChannel);
        }
    };
  }, [user]);
  
  const refreshProfile = async () => {
    if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, bio, status')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error refreshing profile:', error.message);
        } else {
          setProfile(data);
        }
    }
  }

  const signInWithPassword = async (email: string, password: string) => {
    return supabase.auth.signInWithPassword({ email, password });
  };

  const signUpWithPassword = async (email: string, password: string, fullName: string) => {
    return supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        }
      }
    });
  };

  const signInWithOAuth = async (provider: Provider) => {
    return supabase.auth.signInWithOAuth({ provider });
  }

  const verifyOtp = async (email: string, token: string) => {
    return supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });
  };
  
  const resendConfirmationEmail = async (email: string) => {
    return supabase.auth.resend({ type: 'signup', email });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const isOnline = (userId: string) => !!onlineUsers[userId];

  const value = {
    session,
    user,
    profile,
    loading,
    signInWithPassword,
    signUpWithPassword,
    signInWithOAuth,
    verifyOtp,
    resendConfirmationEmail,
    signOut,
    refreshProfile,
    isOnline,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
