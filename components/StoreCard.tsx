
import React from 'react';
import { Link } from 'react-router-dom';
import { Store } from '../types';
import Avatar from './ui/Avatar';

const StoreCard: React.FC<{ store: Store }> = ({ store }) => {
  const ownerName = store.profiles?.full_name || 'مالك غير معروف';

  return (
    <Link to={`/store/${store.id}`} className="block bg-slate-800 border border-slate-700 rounded-lg p-4 hover:bg-slate-700/50 transition-colors duration-200">
      <div className="flex items-center mb-3">
        <div className="ml-3">
          <Avatar url={store.profiles?.avatar_url} size={40} />
        </div>
        <div>
          <h2 className="font-bold text-lg text-white">{store.name}</h2>
          <p className="text-sm text-slate-400">بواسطة {ownerName}</p>
        </div>
      </div>
      <p className="text-slate-300 text-sm">
        {store.description || 'لا يوجد وصف لهذا المتجر.'}
      </p>
    </Link>
  );
};

export default StoreCard;
