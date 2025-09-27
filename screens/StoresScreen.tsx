

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Store } from '../types';
import Spinner from '../components/ui/Spinner';
import Button from '../components/ui/Button';
import StoreCard from '../components/StoreCard';

const StoresScreen: React.FC = () => {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStores = async () => {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('stores')
        .select('*, profiles!user_id(full_name, avatar_url)')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching stores:", error);
        setError("فشل في تحميل المتاجر. قد تحتاج إلى إنشاء جدول 'stores' أولاً.");
      } else {
        setStores(data as any[]);
      }
      setLoading(false);
    };

    fetchStores();
  }, []);

  const renderContent = () => {
    if (loading) {
      return <div className="text-center py-10"><Spinner /></div>;
    }

    if (error) {
      return <p className="text-center text-red-400 py-10">{error}</p>;
    }

    if (stores.length === 0) {
      return <p className="text-center text-slate-400 py-10">لا توجد متاجر حتى الآن. كن أول من ينشئ متجراً!</p>;
    }

    return (
      <div className="space-y-4">
        {stores.map(store => (
          <StoreCard key={store.id} store={store} />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="bg-slate-800/80 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-700">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-bold">المتاجر</h1>
            <Link to="/stores/new">
              <Button className="!w-auto px-4 py-2 text-sm">أنشئ متجرًا</Button>
            </Link>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6">
        <div className="max-w-2xl mx-auto">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default StoresScreen;