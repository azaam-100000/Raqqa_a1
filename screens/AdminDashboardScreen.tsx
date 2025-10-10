import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { Profile } from '../types';
import Spinner from '../components/ui/Spinner';
import Avatar from '../components/ui/Avatar';
import { getErrorMessage } from '../utils/errors';

const AdminDashboardScreen: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [userCount, setUserCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (user && user.email !== 'azaamazeez8877@gmail.com') {
            navigate('/home', { replace: true });
        }
    }, [user, navigate]);

    useEffect(() => {
        const fetchUsers = async () => {
            setLoading(true);
            setError(null);
            try {
                const { data, error, count } = await supabase
                    .from('profiles')
                    .select('id, full_name, avatar_url, created_at', { count: 'exact' })
                    .order('created_at', { ascending: false });

                if (error) throw error;
                
                setProfiles(data as Profile[] || []);
                setUserCount(count || 0);

            } catch (err) {
                setError(getErrorMessage(err));
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, []);

    const renderContent = () => {
        if (loading) {
            return <div className="text-center py-10"><Spinner /></div>;
        }
        if (error) {
            return <p className="text-center text-red-400 py-10">{error}</p>;
        }
        if (profiles.length === 0) {
            return <p className="text-center text-slate-400 py-10">لا يوجد مستخدمون مسجلون بعد.</p>;
        }
        return (
            <div className="bg-slate-800 border border-slate-700 rounded-lg divide-y divide-slate-700">
                {profiles.map(profile => (
                    <Link 
                        key={profile.id}
                        to={`/admin/user/${profile.id}`}
                        className="flex items-center gap-4 p-3 hover:bg-slate-700/50 transition-colors"
                    >
                        <Avatar url={profile.avatar_url} size={40} />
                        <div className="flex-1">
                            <p className="font-bold text-white">{profile.full_name}</p>
                            <p className="text-xs text-slate-400">
                                انضم في: {new Date(profile.created_at).toLocaleDateString('ar-EG')}
                            </p>
                        </div>
                    </Link>
                ))}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white">
            <header className="bg-slate-800/80 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-700">
                <div className="container mx-auto px-4">
                    <div className="flex items-center h-16">
                        <h1 className="text-xl font-bold">لوحة التحكم للمسؤول</h1>
                    </div>
                </div>
            </header>
            <main className="container mx-auto px-4 py-6">
                <div className="max-w-4xl mx-auto">
                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 mb-6 text-center">
                        <p className="text-slate-400">إجمالي المستخدمين المسجلين</p>
                        <p className="text-3xl font-bold text-cyan-400">{userCount}</p>
                    </div>
                    {renderContent()}
                </div>
            </main>
        </div>
    );
};

export default AdminDashboardScreen;
