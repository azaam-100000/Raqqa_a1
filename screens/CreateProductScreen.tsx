
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import Button from '../components/ui/Button';
import ImageInput from '../components/ui/ImageInput';

const BackIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
);

const CreateProductScreen: React.FC = () => {
    const { storeId } = useParams<{ storeId: string }>();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { user } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !price || !imageFile || !user || !storeId) return;

        setLoading(true);
        setError(null);

        try {
            // 1. Upload image to storage
            const fileExt = imageFile.name.split('.').pop();
            const fileName = `${user.id}/${storeId}-${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage
                .from('uploads')
                .upload(fileName, imageFile);
            
            if (uploadError) throw uploadError;

            // 2. Insert product data into the database
            const { error: insertError } = await supabase
                .from('products')
                .insert({
                    name: name.trim(),
                    description: description.trim(),
                    price: parseFloat(price),
                    image_url: fileName,
                    user_id: user.id,
                    store_id: storeId,
                });

            if (insertError) throw insertError;
            
            // 3. Navigate back to the store page
            navigate(`/store/${storeId}`);

        } catch (err: any) {
            console.error("Error creating product:", err);
            let friendlyMessage = `فشل إنشاء المنتج: ${err.message}`;
            if (err.message.includes('products" violates row-level security policy')) {
                friendlyMessage = "فشل إنشاء المنتج. تحقق من صلاحيات الوصول (RLS) لجدول 'products'.";
            } else if (err.message.includes('relation "products" does not exist')) {
                 friendlyMessage = "فشل إنشاء المنتج. يبدو أن جدول 'products' غير موجود في قاعدة البيانات.";
            }
            setError(friendlyMessage);
        } finally {
            setLoading(false);
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
                        <h1 className="text-xl font-bold text-center w-full">إضافة منتج جديد</h1>
                    </div>
                </div>
            </header>
            <main className="container mx-auto px-4 py-6">
                <div className="max-w-2xl mx-auto">
                    <form onSubmit={handleSubmit} className="bg-slate-800 border border-slate-700 rounded-lg p-6 space-y-4">
                        <ImageInput onFileSelect={setImageFile} />
                         <div>
                            <label htmlFor="product-name" className="block text-sm font-medium text-slate-300 mb-2">اسم المنتج</label>
                            <Input
                                id="product-name"
                                type="text"
                                placeholder="مثال: هاتف ذكي جديد"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                disabled={loading}
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="product-price" className="block text-sm font-medium text-slate-300 mb-2">السعر</label>
                            <Input
                                id="product-price"
                                type="number"
                                placeholder="0.00"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                disabled={loading}
                                required
                                min="0"
                                step="0.01"
                            />
                        </div>
                        <div>
                            <label htmlFor="product-description" className="block text-sm font-medium text-slate-300 mb-2">الوصف</label>
                            <Textarea
                                id="product-description"
                                rows={4}
                                placeholder="صف المنتج ومميزاته..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                disabled={loading}
                            />
                        </div>
                        {error && <p className="text-red-400 text-sm text-right">{error}</p>}
                        <div className="flex justify-end pt-2">
                            <div className="w-full sm:w-auto">
                                <Button type="submit" loading={loading} disabled={!name.trim() || !price || !imageFile}>
                                    إضافة المنتج
                                </Button>
                            </div>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default CreateProductScreen;