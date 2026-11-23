import React, { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Camera,
  Check,
  MapPin,
  Sparkles,
  Star,
  Upload,
  X,
} from 'lucide-react';
import { QuietStatus, SpotCategory } from '../../types';
import { SPOT_CATEGORIES } from '../../services/spotsService';
import {
  compressImageToBase64,
  PRESET_HEALING_PHOTOS,
} from '../../utils/image';
import { formatCoord } from '../../utils/geo';
import { SafeImage } from '../common/SafeImage';

interface AddSpotModalProps {
  open: boolean;
  coords: { lng: number; lat: number };
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    category: SpotCategory;
    lng: number;
    lat: number;
    coverUrl: string;
    fallbackGradient: string;
    quietStatus: QuietStatus;
    rating: number;
    recommendation: string;
    tags: string[];
  }) => void;
}

const SELECTABLE_CATEGORIES = SPOT_CATEGORIES.filter((c) => c.id !== 'all') as {
  id: SpotCategory;
  label: string;
  emoji: string;
}[];

export const AddSpotModal: React.FC<AddSpotModalProps> = ({
  open,
  coords,
  onClose,
  onSubmit,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<SpotCategory>('sunset');
  const [rating, setRating] = useState(5);
  const [recommendation, setRecommendation] = useState('');
  const [coverUrl, setCoverUrl] = useState(PRESET_HEALING_PHOTOS[0].url);
  const [fallbackGradient, setFallbackGradient] = useState(
    PRESET_HEALING_PHOTOS[0].gradient
  );
  const [isCompressing, setIsCompressing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setIsCompressing(true);
    try {
      const base64 = await compressImageToBase64(file, 880, 0.72);
      setCoverUrl(base64);
    } catch {
      setUploadError('图片读取失败，换一张试试或使用下方默认治愈图');
    } finally {
      setIsCompressing(false);
      e.target.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !recommendation.trim()) return;

    const quietStatus: QuietStatus =
      rating >= 4 ? 'very_quiet' : rating === 3 ? 'moderate' : 'crowded';

    onSubmit({
      name: name.trim(),
      category,
      lng: coords.lng,
      lat: coords.lat,
      coverUrl,
      fallbackGradient,
      quietStatus,
      rating,
      recommendation: recommendation.trim(),
      tags: ['同学私藏', rating >= 4 ? '极度安静' : '轻松放空', 'UGC新点位'],
    });

    // 重置表单
    setName('');
    setRecommendation('');
    setRating(5);
    setCategory('sunset');
    setCoverUrl(PRESET_HEALING_PHOTOS[0].url);
    setFallbackGradient(PRESET_HEALING_PHOTOS[0].gradient);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 360, damping: 30 }}
            className="fixed inset-x-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 top-1/2 -translate-y-1/2 z-50 w-auto sm:w-full max-w-lg max-h-[88vh] flex flex-col rounded-3xl bg-[#0F1626] border border-white/15 shadow-2xl overflow-hidden"
          >
            {/* 头部 */}
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  标记新的校园治愈点
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1 font-mono">
                  <MapPin className="w-3 h-3 text-emerald-400" />
                  已锁定坐标：{formatCoord(coords.lng)}, {formatCoord(coords.lat)}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1"
            >
              {/* 图片上传 + 实时预览 + 预设快选 */}
              <div className="space-y-2.5">
                <label className="block text-xs font-medium text-slate-300">
                  现场实景图（支持本地压缩上传或快速选预设图）
                </label>

                <div className="relative h-40 rounded-2xl overflow-hidden border border-white/15 bg-slate-950">
                  <SafeImage
                    src={coverUrl}
                    alt="点位封面预览"
                    fallbackGradient={fallbackGradient}
                    emoji="📸"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isCompressing}
                    className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-900/85 hover:bg-slate-800 text-white border border-white/20 backdrop-blur-md transition-colors"
                  >
                    {isCompressing ? (
                      <>压缩处理中...</>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5 text-emerald-400" />
                        上传本地照片
                      </>
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>

                {uploadError && (
                  <p className="text-xs text-rose-400">{uploadError}</p>
                )}

                {/* 快速演示预设图 */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
                  <span className="text-[11px] text-slate-400 shrink-0 flex items-center gap-1">
                    <Camera className="w-3 h-3" />
                    预设：
                  </span>
                  {PRESET_HEALING_PHOTOS.map((preset) => {
                    const active = coverUrl === preset.url;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setCoverUrl(preset.url);
                          setFallbackGradient(preset.gradient);
                        }}
                        className={`relative shrink-0 px-2.5 py-1 rounded-full text-[11px] border transition-colors ${
                          active
                            ? 'bg-emerald-400/20 text-emerald-200 border-emerald-400/50'
                            : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 地点名称 */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  地点名称 *
                </label>
                <input
                  type="text"
                  required
                  maxLength={28}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例如：二教 4 楼最西边靠窗单人座"
                  className="w-full rounded-xl bg-slate-950/70 border border-white/12 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-400/60"
                />
              </div>

              {/* 分类标签 */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  治愈类型
                </label>
                <div className="flex flex-wrap gap-2">
                  {SELECTABLE_CATEGORIES.map((cat) => {
                    const active = category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id)}
                        className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                          active
                            ? 'bg-emerald-400/20 text-emerald-200 border-emerald-400/50 shadow-sm'
                            : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {cat.emoji} {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 安静指数 1-5 星 */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  安静治愈指数（{rating} 星）
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="p-1 transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          star <= rating
                            ? 'fill-amber-300 text-amber-300'
                            : 'text-slate-600'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs text-slate-400 ml-1">
                    {rating >= 5
                      ? '几乎无人·极度治愈'
                      : rating >= 4
                      ? '安静舒适·适合放空'
                      : rating === 3
                      ? '微弱白噪音·不吵'
                      : '略微热闹'}
                  </span>
                </div>
              </div>

              {/* 安利理由 */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  写一句安利理由 *
                </label>
                <textarea
                  required
                  rows={3}
                  maxLength={140}
                  value={recommendation}
                  onChange={(e) => setRecommendation(e.target.value)}
                  placeholder="几点来最美？有没有插座或流浪猫？告诉下一个需要喘口气的同学..."
                  className="w-full rounded-xl bg-slate-950/70 border border-white/12 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-400/60 resize-none"
                />
              </div>

              {/* 提交按钮 */}
              <div className="pt-1 flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-medium border border-white/10 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={!name.trim() || !recommendation.trim()}
                  className="flex-[1.6] py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-300 text-slate-950 font-semibold text-sm flex items-center justify-center gap-1.5 hover:brightness-105 disabled:opacity-40 transition-all shadow-glow-mint"
                >
                  <Check className="w-4 h-4" />
                  发布到治愈地图
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
