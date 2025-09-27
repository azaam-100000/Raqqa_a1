
import React, { useState, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import Layout from '../components/Layout';
import Avatar from '../components/ui/Avatar';
import Button from '../components/ui/Button';
import { supabase } from '../services/supabase';
import Spinner from '../components/ui/Spinner';

const EditIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
);

const ProfileScreen: React.FC = () => {
    const { user, profile, refreshProfile } = useAuth();
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0 || !user) {
            return;
        }

        const file = files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}.${fileExt}`;
        const filePath = `${fileName}`;

        setUploading(true);
        setError(null);

        try {
            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('uploads')
                .upload(filePath, file, { upsert: true });

            if (uploadError) {
                throw uploadError;
            }

            // Update profile record in the database
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: filePath })
                .eq('id', user.id);

            if (updateError) {
                throw updateError;
            }

            // Refresh profile data in the app
            await refreshProfile();

        } catch (error: any) {
            console.error("Error uploading avatar:", error);
            setError('فشل رفع الصورة. تأكد من أن حجم الملف مناسب وأن لديك الصلاحيات اللازمة.');
        } finally {
            setUploading(false);
            // Reset file input
            if(fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    return (
        <Layout>
             <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-lg p-8 w-full text-center">
                 <h1 className="text-3xl font-bold text-white mb-6">الملف الشخصي</h1>

                <div className="relative inline-block mb-4">
                    <Avatar url={profile?.avatar_url} size={128} />
                    <button 
                        onClick={handleAvatarClick}
                        disabled={uploading}
                        className="absolute bottom-1 -right-1 bg-cyan-600 hover:bg-cyan-700 text-white p-3 rounded-full shadow-lg transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        aria-label="تغيير الصورة الرمزية"
                    >
                       {uploading ? <Spinner/> : <EditIcon />}
                    </button>
                    <input 
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept="image/png, image/jpeg"
                        disabled={uploading}
                    />
                </div>
                
                 <h2 className="text-2xl font-semibold text-white">{profile?.full_name}</h2>
                 <p className="text-slate-400">{user?.email}</p>

                {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
                
                <div className="mt-6 text-sm text-slate-500">
                    <p>
                        لرفع صورة جديدة، انقر على أيقونة التعديل.
                    </p>
                    <p className="mt-2">
                        <strong>ملاحظة:</strong> يجب إنشاء 'Bucket' في Supabase باسم `uploads` مع صلاحيات وصول عامة للقراءة وللمستخدمين المسجلين للكتابة.
                    </p>
                </div>

                <div className="mt-8">
                    <Button onClick={() => window.history.back()} variant="secondary">
                        العودة
                    </Button>
                </div>
             </div>
        </Layout>
    );
};

export default ProfileScreen;
