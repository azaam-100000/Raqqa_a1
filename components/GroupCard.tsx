
import React from 'react';
import { Link } from 'react-router-dom';
import { Group } from '../types';
import Avatar from './ui/Avatar';

const GroupCard: React.FC<{ group: Group }> = ({ group }) => {
  const ownerName = group.profiles?.full_name || 'مالك غير معروف';
  const memberCount = group.group_members[0]?.count || 0;

  return (
    <Link to={`/group/${group.id}`} className="block bg-slate-800 border border-slate-700 rounded-lg p-4 hover:bg-slate-700/50 transition-colors duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h2 className="font-bold text-lg text-white">{group.name}</h2>
          <p className="text-sm text-slate-400">
            {memberCount} {memberCount === 1 ? 'عضو' : 'أعضاء'} • أنشئت بواسطة {ownerName}
          </p>
        </div>
        <div className="flex-shrink-0">
          <Avatar url={group.profiles?.avatar_url} size={40} />
        </div>
      </div>
      {group.description && (
        <p className="text-slate-300 text-sm mt-3 pt-3 border-t border-slate-700">
          {group.description}
        </p>
      )}
    </Link>
  );
};

export default GroupCard;
