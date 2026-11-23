import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  KeyRound,
  Mail,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  authService,
  isRealEmailBackendConfigured,
  isValidEmail,
} from '../../services/authService';
import { soundEngine, triggerHaptic } from '../../utils/audio';

interface AuthModalProps {
  onShowToast: (text: string, type?: 'success' | 'info' | 'warm') => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onShowToast }) => {
  const { authModalOpen, authPromptReason, closeAuthModal, onLoginSuccess } =
    useAuth();

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [demoCodeHint, setDemoCodeHint] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = window.setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => window.clearInterval(t);
  }, [countdown]);

  useEffect(() => {
    if (!authModalOpen) {
      setErrorMsg(null);
      setDemoCodeHint(null);
      setCode('');
    }
  }, [authModalOpen]);

  const handleSendCode = async () => {
    setErrorMsg(null);
    if (!isValidEmail(email)) {
      setErrorMsg('请输入有效的邮箱地址（如 name@qq.com）');
      return;
    }
    setSending(true);
    try {
      const res = await authService.sendEmailCode(email);
      setCountdown(60);
      soundEngine.playPop(660);
      triggerHaptic(14);
      if (res.mode === 'demo' && res.demoCode) {
        setDemoCodeHint(res.demoCode);
        onShowToast(`体验验证码已生成：${res.demoCode}（5分钟内有效）`, 'info');
      } else {
        setDemoCodeHint(null);
        onShowToast('6位验证码已发送至你的邮箱，请查收 ✉️', 'success');
      }
    } catch (err) {
      setErrorMsg((err as Error).message || '发送失败，请稍后重试');
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setVerifying(true);
    try {
      const profile = await authService.verifyEmailAndLogin(
        email,
        code,
        nickname
      );
      soundEngine.playCelebrationChime();
      triggerHaptic([18, 25, 35]);
      onShowToast(`欢迎回来，${profile.nickname} ✨`, 'success');
      onLoginSuccess(profile);
    } catch (err) {
      setErrorMsg((err as Error).message || '验证失败');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <AnimatePresence>
      {authModalOpen && (
        <div className="fixed inset-0 z-[65] flex items-end sm:items-center justify-center sm:p-4">
          {/* 柔和背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeAuthModal}
            className="fixed inset-0 bg-slate-900/35 backdrop-blur-md"
          />

          {/* 苹果原生 Sheet 弹窗（绝对不截断底部内容） */}
          <motion.div
            initial={{ opacity: 0, y: 48, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 36, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="relative z-10 w-full sm:max-w-[420px] max-h-[90dvh] flex flex-col rounded-t-[30px] sm:rounded-[30px] bg-white/95 backdrop-blur-2xl border border-white shadow-[0_24px_64px_rgba(15,23,42,0.22)] overflow-hidden"
          >
            {/* 移动端拖拽手柄 */}
            <div className="flex justify-center pt-2.5 sm:hidden shrink-0">
              <div className="w-9 h-1 rounded-full bg-slate-300" />
            </div>

            {/* 顶部标题栏 */}
            <div className="px-6 pt-4 pb-3 flex items-start justify-between gap-3 shrink-0">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#007AFF]/10 text-[#007AFF] text-[11px] font-semibold mb-1.5">
                  <Sparkles className="w-3 h-3" />
                  校园暂停键通行证
                </div>
                <h2 className="text-[20px] font-bold text-[#1D1D1F] tracking-tight">
                  邮箱验证码登录 / 注册
                </h2>
                <p className="text-[12.5px] text-slate-500 mt-0.5">
                  {authPromptReason
                    ? `登录后即可${authPromptReason}，未注册邮箱将自动创建账号`
                    : '未注册邮箱验证后自动创建账号，逛页面无需强制登录'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeAuthModal}
                aria-label="关闭登录窗口"
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200/80 flex items-center justify-center text-slate-500 shrink-0 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 可滚动表单区 */}
            <form
              onSubmit={handleSubmit}
              className="px-6 pb-6 pt-2 space-y-4 overflow-y-auto custom-scrollbar flex-1 min-h-0"
            >
              {/* 邮箱输入 */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">
                  邮箱地址
                </label>
                <div className="relative flex items-center">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="输入你的 QQ / 163 / 校园邮箱"
                    className="w-full rounded-2xl bg-[#F2F2F7] border border-transparent focus:border-[#007AFF] focus:bg-white pl-10 pr-4 py-3 text-sm text-[#1D1D1F] placeholder:text-slate-400 focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* 验证码输入 + 获取按钮 */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">
                  6 位邮箱验证码
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1 flex items-center">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      required
                      value={code}
                      onChange={(e) =>
                        setCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                      }
                      placeholder="输入 6 位验证码"
                      className="w-full rounded-2xl bg-[#F2F2F7] border border-transparent focus:border-[#007AFF] focus:bg-white pl-10 pr-3 py-3 text-sm font-mono tracking-widest text-[#1D1D1F] placeholder:font-sans placeholder:tracking-normal placeholder:text-slate-400 focus:outline-none transition-all"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={sending || countdown > 0 || !email.trim()}
                    onClick={handleSendCode}
                    className="px-4 py-3 rounded-2xl bg-[#007AFF]/10 hover:bg-[#007AFF]/15 text-[#007AFF] font-semibold text-xs shrink-0 disabled:opacity-45 transition-colors"
                  >
                    {sending
                      ? '发送中…'
                      : countdown > 0
                      ? `${countdown}s 后重发`
                      : '获取验证码'}
                  </button>
                </div>
              </div>

              {/* 体验模式验证码提示条（未配 SMTP 后端时自动给出验证码方便测试） */}
              {demoCodeHint && (
                <div className="rounded-2xl bg-emerald-50 border border-emerald-200/80 px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs text-emerald-800">
                  <span>
                    当前为本地体验模式，验证码：
                    <strong className="font-mono text-sm ml-1">
                      {demoCodeHint}
                    </strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setCode(demoCodeHint)}
                    className="px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-semibold shrink-0"
                  >
                    一键填入
                  </button>
                </div>
              )}

              {/* 可选昵称 */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">
                  显示昵称（选填，可在个人资料或微信授权后同步）
                </label>
                <input
                  type="text"
                  maxLength={16}
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="例如：五合吹风同学（留空自动生成）"
                  className="w-full rounded-2xl bg-[#F2F2F7] border border-transparent focus:border-[#007AFF] focus:bg-white px-4 py-2.5 text-sm text-[#1D1D1F] placeholder:text-slate-400 focus:outline-none transition-all"
                />
              </div>

              {errorMsg && (
                <p className="text-xs text-[#FF3B30] font-medium px-1">
                  {errorMsg}
                </p>
              )}

              {/* 主登录按钮 */}
              <motion.button
                type="submit"
                whileTap={{ scale: 0.98 }}
                disabled={verifying || !email.trim() || code.length < 6}
                className="w-full py-3.5 rounded-2xl bg-[#007AFF] hover:bg-[#0066D6] text-white font-semibold text-sm flex items-center justify-center gap-1.5 shadow-[0_8px_24px_rgba(0,122,255,0.28)] disabled:opacity-40 transition-all"
              >
                {verifying ? '验证中…' : '验证并继续'}
                <ArrowRight className="w-4 h-4" />
              </motion.button>

              {/* 分割线 + 微信小程序登录预留入口 */}
              <div className="pt-1 space-y-2.5">
                <div className="flex items-center gap-3 text-[11px] text-slate-400">
                  <span className="flex-1 h-px bg-slate-200" />
                  <span>小程序迁移预留</span>
                  <span className="flex-1 h-px bg-slate-200" />
                </div>

                <button
                  type="button"
                  onClick={() =>
                    onShowToast(
                      '已预留 wx.login() 与微信头像/昵称授权接口，迁移微信小程序后可一键开启 💚',
                      'info'
                    )
                  }
                  className="w-full py-2.5 rounded-2xl bg-[#07C160]/10 hover:bg-[#07C160]/15 border border-[#07C160]/25 text-[#07C160] font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  微信小程序一键授权登录（接口已就绪）
                </button>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>
                  {isRealEmailBackendConfigured()
                    ? '已连接邮箱验证码服务'
                    : '邮箱仅用于登录校验，绝不向第三方公开'}
                </span>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
