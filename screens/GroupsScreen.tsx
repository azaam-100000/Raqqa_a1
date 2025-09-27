

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Group } from '../types';
import Spinner from '../components/ui/Spinner';
import Button from '../components/ui/Button';
import GroupCard from '../components/GroupCard';

const GroupsScreen: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGroups = async () => {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('groups')
        .select('*, profiles!user_id(full_name, avatar_url), group_members(count)')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching groups:", error);
        setError("فشل في تحميل المجموعات. قد تحتاج إلى إنشاء جدول 'groups' أولاً.");
      } else {
        setGroups(data as any[]);
      }
      setLoading(false);
    };

    fetchGroups();
  }, []);

  const renderContent = () => {
    if (loading) {
      return <div className="text-center py-10"><Spinner /></div>;
    }

    if (error) {
      return <p className="text-center text-red-400 py-10">{error}</p>;
    }

    if (groups.length === 0) {
      return <p className="text-center text-slate-400 py-10">لا توجد مجموعات حتى الآن. كن أول من ينشئ مجموعة!</p>;
    }

    return (
      <div className="space-y-4">
        {groups.map(group => (
          <GroupCard key={group.id} group={group} />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="bg-slate-800/80 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-700">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-bold">المجموعات</h1>
            <Link to="/groups/new">
              <Button className="!w-auto px-4 py-2 text-sm">أنشئ مجموعة</Button>
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

export default GroupsScreen;