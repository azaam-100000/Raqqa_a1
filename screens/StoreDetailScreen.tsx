

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Store, Product } from '../types';
import { useAuth } from '../hooks/useAuth';
import Spinner from '../components/ui/Spinner';
import Avatar from '../components/ui/Avatar';
import Button from '../components/ui/Button';
import ProductCard from '../components/ProductCard';

const BackIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
);

const MessageIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
);

const StoreDetailScreen: React.FC = () => {
    const { storeId } = useParams<{ storeId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [store, setStore] = useState<Store | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!storeId) return;

        const fetchStoreAndProducts = async () => {
            setLoading(true);
            setError(null);
            
            try {
                // Fetch store details
                const { data: storeData, error: storeError } = await supabase
                    .from('stores')
                    .select('*, profiles!user_id(full_name, avatar_url)')
                    .eq('id', storeId)
                    .single();

                if (storeError) {
                    console.error("Error fetching store:", storeError);
                    throw new Error("لم يتم العثور على المتجر.");
                }
                setStore(storeData as any);

                // Fetch products for the store
                const { data: productsData, error: productsError } = await supabase
                    .from('products')
                    .select('*')
                    .eq('store_id', storeId)
                    .order('created_at', { ascending: false });

                if (productsError) {
                    console.error("Error fetching products:", productsError);
                    setError("فشل في تحميل المنتجات. قد تحتاج إلى إنشاء جدول 'products' أولاً.");
                } else {
                    setProducts(productsData);
                }
// FIX: Corrected a malformed try/catch block and reconstructed the component's return statement.
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchStoreAndProducts();
    }, [storeId]);

    const renderProducts = () => {
        if (products.length === 0) {
            return (
                <div className="text-center text-slate-400 py-10 border-t border-slate-700 mt-6">
                    <p>لا توجد منتجات في هذا المتجر حتى الآن.</p>
                </div>
            );
        }
        return (
            <div className="border-t border-slate-700 mt-6 pt-6 grid grid-cols-2 sm:grid-cols-3 gap-4">
                {products.map(product => (
                    <ProductCard key={product.id} product={product} isOwner={user?.id === store?.user_id} />
                ))}
            </div>
        );
    };

    const isOwner = user?.id === store?.user_id;

    return (
        <div className="min-h-screen bg-slate-900 text-white">
            <header className="bg-slate-800/80 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-700">
                <div className="container mx-auto px-4">
                     <div className="flex items-center h-16 relative">
                        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-slate-700">
                            <BackIcon />
                        </button>
                        <h1 className="text-xl font-bold text-center w-full truncate px-12">
                           {loading ? '...' : store?.name || 'تفاصيل المتجر'}
                        </h1>
                    </div>
                </div>
            </header>
            <main className="container mx-auto px-4 py-6">
                 <div className="max-w-2xl mx-auto">
                     {loading && <div className="text-center py-10"><Spinner /></div>}
                     {!loading && error && !store && <p className="text-center text-red-400 py-10">{error}</p>}
                     {store && (
                        <div>
                            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-4">
                                        <Avatar url={store.profiles?.avatar_url} size={56} />
                                        <div>
                                            <h2 className="text-2xl font-bold">{store.name}</h2>
                                            <p className="text-slate-400">بواسطة {store.profiles?.full_name}</p>
                                        </div>
                                    </div>
                                    {isOwner && (
                                         <Link to={`/store/${storeId}/products/new`}>
                                            <Button variant="secondary" className="!w-auto px-4 !py-2 !text-sm">أضف منتجًا</Button>
                                         </Link>
                                    )}
                                </div>
                                {store.description && <p className="text-slate-300 mt-4 pt-4 border-t border-slate-700">{store.description}</p>}
                                <div className="mt-4">
                                    {!isOwner && user && store.user_id && (
                                        <Button onClick={() => navigate(`/chat/${store.user_id}`)}>
                                            <MessageIcon />
                                            مراسلة البائع
                                        </Button>
                                    )}
                                </div>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold mb-4">المنتجات</h3>
                                <div className="min-h-[100px]">
                                    {loading ? (
                                        <div className="flex justify-center items-center py-10"><Spinner /></div>
                                    ) : (
                                        <>
                                            {!products.length && error && <p className="text-center text-red-400 py-4">{error}</p>}
                                            {renderProducts()}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default StoreDetailScreen;