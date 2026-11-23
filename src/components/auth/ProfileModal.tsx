import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Camera,
  Check,
  LogOut,
  Mail,
  MessageCircle,
  School,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PRESET_AVATARS } from '../../services/authService';
import { compressImageToBase64 } from '../../utils/image';
import { soundEngine } from '../../utils/audio';

interface ProfileModalProps {
  onShowToast: (text: string, type?: 'success' | 'info' | 'warm') => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ onShowToast }) => {
  const { user, profileModalOpen, closeProfileModal, updateUserProfile, logout } =
    useAuth();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [nickname, setNickname] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  useEffect(() => {
    if (user && profileModalOpen) {
      setNickname(user.nickname);
      setAvatarUrl(user.avatarUrl);
    }
  }, [user, profileModalOpen]);

  const handleUploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const b64 = await compressImageToBase64(file, 320, 0.78);
      setAvatarUrl(b64);
    } catch {
      onShowToast('头像读取失败，请换一张图片试试', 'info');
    } finally {
      e.target.value = '';
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return;
    updateUserProfile({ nickname: nickname.trim(), avatarUrl });
    soundEngine.playPop(700);
    onShowToast('个人资料已更新 ✨', 'success');
    closeProfileModal();
  };

  return (
    <AnimatePresence>
      {profileModalOpen && user && (
        <div className="fixed inset-0 z-[65] flex items-end sm:items-center justify-center sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeProfileModal}
            className="fixed inset-0 bg-slate-900/35 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, y: 48, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 36, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="relative z-10 w-full sm:max-w-[420px] max-h-[88dvh] flex flex-col rounded-t-[30px] sm:rounded-[30px] bg-white/95 backdrop-blur-2xl border border-white shadow-[0_24px_64px_rgba(15,23,42,0.22)] overflow-hidden"
          >
            <div className="flex justify-center pt-2.5 sm:hidden shrink-0">
              <div className="w-9 h-1 rounded-full bg-slate-300" />
            </div>

            <div className="px-6 pt-4 pb-3 flex items-center justify-between border-b border-slate-100 shrink-0">
              <h2 className="text-[18px] font-bold text-[#1D1D1F] tracking-tight">
                个人资料
              </h2>
              <button
                type="button"
                onClick={closeProfileModal}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200/80 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleSave}
              className="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1 min-h-0"
            >
              {/* 头像选择与上传 */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <img
                    src={avatarUrl}
                    alt={nickname}
                    className="w-20 h-20 rounded-full object-cover border-2 border-white shadow-md bg-slate-100"
                  />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#007AFF] text-white shadow flex items-center justify-center border-2 border-white"
                    title="上传自定义头像"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    onChange={handleUploadAvatar}
                    className="hidden"
                  />
                </div>

                {/* 预设头像快选 */}
                <div className="flex items-center gap-2">
                  {PRESET_AVATARS.map((url) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => setAvatarUrl(url)}
                      className={`w-9 h-9 rounded-full overflow-hidden border-2 transition-transform ${
                        avatarUrl === url
                          ? 'border-[#007AFF] scale-110'
                          : 'border-transparent opacity-75 hover:opacity-100'
                      }`}
                    >
                      <img src={url} alt="预设头像" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              {/* 昵称与账号信息 */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    昵称
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={16}
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="w-full rounded-2xl bg-[#F2F2F7] border border-transparent focus:border-[#007AFF] focus:bg-white px-4 py-2.5 text-sm text-[#1D1D1F] focus:outline-none"
                  />
                </div>

                <div className="rounded-2xl bg-[#F2F2F7] p-3.5 space-y-2 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <Mail className="w-3.5 h-3.5" />
                      绑定邮箱
                    </span>
                    <span className="font-medium text-[#1D1D1F]">
                      {user.email || '未绑定'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <School className="w-3.5 h-3.5" />
                      所属校区
                    </span>
                    <span className="font-medium text-[#1D1D1F]">
                      {user.schoolName}
                    </span>
                  </div>
                </div>

                {/* 微信头像昵称授权同步预留提示 */}
                <button
                  type="button"
                  onClick={() =>
                    onShowToast(
                      '已预留 syncWeChatProfile() 接口，迁移至微信小程序后可直接同步微信头像与昵称 💚',
                      'info'
                    )
                  }
                  className="w-full py-2.5 px-3.5 rounded-2xl bg-[#07C160]/10 border border-[#07C160]/20 text-[#07C160] text-xs font-medium flex items-center justify-center gap-1.5"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  预留：微信小程序一键同步头像与昵称
                </button>
              </div>

              <div className="flex items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    onShowToast('已退出登录，仍可自由浏览校园内容', 'info');
                  }}
                  className="px-4 py-3 rounded-2xl bg-rose-50 hover:bg-rose-100 text-[#FF3B30] text-xs font-semibold flex items-center gap-1.5 shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  退出
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-2xl bg-[#007AFF] hover:bg-[#0066D6] text-white text-sm font-semibold flex items-center justify-center gap-1.5 shadow-[0_8px_22px_rgba(0,122,255,0.24)]"
                >
                  <Check className="w-4 h-4" />
                  保存资料
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
