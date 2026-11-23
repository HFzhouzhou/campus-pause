import React from 'react';
import { motion } from 'framer-motion';
import { User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const AccountPill: React.FC = () => {
  const { user, openAuthModal, openProfileModal } = useAuth();

  if (user) {
    return (
      <motion.button
        type="button"
        whileTap={{ scale: 0.94 }}
        onClick={openProfileModal}
        className="liquid-dock rounded-full pl-1.5 pr-3 py-1 flex items-center gap-2 shrink-0"
        title="查看个人资料"
      >
        <img
          src={user.avatarUrl}
          alt={user.nickname}
          className="w-7 h-7 rounded-full object-cover border border-white shadow-sm bg-slate-100"
        />
        <span className="text-xs font-semibold text-[#1D1D1F] max-w-[78px] truncate">
          {user.nickname}
        </span>
      </motion.button>
    );
  }

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.94 }}
      onClick={() => openAuthModal()}
      className="liquid-dock rounded-full px-3.5 py-2 flex items-center gap-1.5 text-xs font-semibold text-[#007AFF] shrink-0"
    >
      <User className="w-3.5 h-3.5 stroke-[2.2]" />
      登录
    </motion.button>
  );
};
