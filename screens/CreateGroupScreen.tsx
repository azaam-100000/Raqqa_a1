
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import Button from '../components/ui/Button';

const BackIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
);

const CreateGroupScreen: React.FC = () => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { user } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !user) return;

        setLoading(true);
        setError(null);

        // Insert the group and get its ID
        const { data: groupData, error: groupError } = await supabase
            .from('groups')
            .insert([{ name: name.trim(), description: description.trim(), user_id: user.id }])
            .select()
            .single();

        if (groupError) {
            setLoading(false);
            setError(`فشل إنشاء المجموعة: ${groupError.message}`);
            return;
        }

        // Automatically add the creator as the first member
        const { error: memberError } = await supabase
            .from('group_members')
            .insert({ group_id: groupData.id, user_id: user.id });

        setLoading(false);

        if (memberError) {
            setError(`فشل إضافة العضو الأول: ${memberError.message}`);
        } else {
            navigate(`/group/${groupData.id}`);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white">
            <header className="bg-slate-800/80 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-700">
                <div className="container mx-auto px-4">
                    <div className="flex items-center h-16 relative">
                        <button onClick={() => navigate(-1)} className="absolute right-0 p-2 rounded-full hover:bg-slate-700">
                            <BackIcon />
                        </button>
                        <h1 className="text-xl font-bold text-center w-full">إنشاء مجموعة جديدة</h1>
                    </div>
                </div>
            </header>
            <main className="container mx-auto px-4 py-6">
                <div className="max-w-2xl mx-auto">
                    <form onSubmit={handleSubmit} className="bg-slate-800 border border-slate-700 rounded-lg p-6 space-y-4">
                        <div>
                            <label htmlFor="group-name" className="block text-sm font-medium text-slate-300 mb-2">اسم المجموعة</label>
                            <Input
                                id="group-name"
                                type="text"
                                placeholder="مثال: محبي السيارات الكلاسيكية"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                disabled={loading}
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="group-description" className="block text-sm font-medium text-slate-300 mb-2">الوصف (اختياري)</label>
                            <Textarea
                                id="group-description"
                                rows={4}
                                placeholder="صف الغرض من هذه المجموعة..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                disabled={loading}
                            />
                        </div>
                        {error && <p className="text-red-400 text-sm text-right">{error}</p>}
                        <div className="flex justify-end pt-2">
                            <div className="w-full sm:w-auto">
                                <Button type="submit" loading={loading} disabled={!name.trim()}>
                                    إنشاء المجموعة
                                </Button>
                            </div>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default CreateGroupScreen;
