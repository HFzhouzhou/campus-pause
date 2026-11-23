import React, { useEffect, useRef, useState } from 'react';
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
  suggestedName?: string;
  suggestedAddress?: string;
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
  suggestedName,
  suggestedAddress,
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

  useEffect(() => {
    if (open && suggestedName && !name) {
      setName(suggestedName);
    }
  }, [open, suggestedName, name]);

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
      tags: ['五合私藏', rating >= 4 ? '极度安静' : '轻松放空', 'UGC点亮'],
    });

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
            className="fixed inset-0 z-50 bg-black/65 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, y: 36, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 360, damping: 30 }}
            className="fixed inset-x-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 top-1/2 -translate-y-1/2 z-50 w-auto sm:w-full max-w-lg max-h-[88vh] flex flex-col rounded-[30px] liquid-glass-elevated overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-white/12 flex items-center justify-between shrink-0">
              <div className="min-w-0 pr-2">
                <h2 className="text-[16px] font-semibold text-white flex items-center gap-1.5 tracking-tight">
                  <Sparkles className="w-4 h-4 text-emerald-300" />
                  标记新的校园治愈点
                </h2>
                <p className="text-[11px] text-white/55 mt-0.5 flex items-center gap-1 truncate">
                  <MapPin className="w-3 h-3 text-emerald-300 shrink-0" />
                  {suggestedAddress ||
                    `${formatCoord(coords.lng)}, ${formatCoord(coords.lat)}`}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center text-white/80 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1"
            >
              {/* 图片上传 + 预设快选 */}
              <div className="space-y-2.5">
                <label className="block text-xs font-medium text-white/75">
                  现场实景图（Canvas 自动压缩上传或快选预设）
                </label>

                <div className="relative h-40 rounded-[22px] overflow-hidden border border-white/15 bg-black/40">
                  <SafeImage
                    src={coverUrl}
                    alt="点位封面预览"
                    fallbackGradient={fallbackGradient}
                    emoji="📸"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isCompressing}
                    className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium liquid-dock text-white transition-transform active:scale-95"
                  >
                    {isCompressing ? (
                      <>压缩处理中…</>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5 text-emerald-300" />
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
                  <p className="text-xs text-rose-300">{uploadError}</p>
                )}

                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                  <span className="text-[11px] text-white/50 shrink-0 flex items-center gap-1">
                    <Camera className="w-3 h-3" />
                    预设
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
                        className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] border transition-colors ${
                          active
                            ? 'bg-white text-slate-950 border-white font-medium'
                            : 'bg-white/[0.06] text-white/75 border-white/12 hover:bg-white/[0.12]'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 地点名称（自动填入高德逆地理推荐地名） */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-white/75">
                    地点名称 *
                  </label>
                  {suggestedName && name !== suggestedName && (
                    <button
                      type="button"
                      onClick={() => setName(suggestedName)}
                      className="text-[11px] text-emerald-300 hover:underline"
                    >
                      填入识别地名「{suggestedName}」
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  required
                  maxLength={28}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例如：明德楼 4F 最西边吹风阳台"
                  className="w-full rounded-2xl bg-white/[0.06] border border-white/14 px-3.5 py-2.5 text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-white/40"
                />
              </div>

              {/* 分类标签 */}
              <div>
                <label className="block text-xs font-medium text-white/75 mb-1.5">
                  治愈类型
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {SELECTABLE_CATEGORIES.map((cat) => {
                    const active = category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id)}
                        className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                          active
                            ? 'bg-white text-slate-950 border-white font-semibold'
                            : 'bg-white/[0.06] text-white/75 border-white/12 hover:bg-white/[0.12]'
                        }`}
                      >
                        {cat.emoji} {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 安静指数 */}
              <div>
                <label className="block text-xs font-medium text-white/75 mb-1.5">
                  安静治愈指数（{rating} 星）
                </label>
                <div className="flex items-center gap-1.5">
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
                            : 'text-white/20'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs text-white/55 ml-1.5">
                    {rating >= 5
                      ? '几乎无人 · 极度治愈'
                      : rating >= 4
                      ? '安静舒适 · 适合放空'
                      : rating === 3
                      ? '轻微白噪音'
                      : '略微热闹'}
                  </span>
                </div>
              </div>

              {/* 安利理由 */}
              <div>
                <label className="block text-xs font-medium text-white/75 mb-1.5">
                  写一句安利理由 *
                </label>
                <textarea
                  required
                  rows={3}
                  maxLength={140}
                  value={recommendation}
                  onChange={(e) => setRecommendation(e.target.value)}
                  placeholder="几点来最美？有没有风、插座或者亲人小猫？"
                  className="w-full rounded-2xl bg-white/[0.06] border border-white/14 px-3.5 py-2.5 text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-white/40 resize-none"
                />
              </div>

              <div className="pt-1 flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-full bg-white/[0.08] hover:bg-white/[0.14] text-white/80 text-sm font-medium transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={!name.trim() || !recommendation.trim()}
                  className="flex-[1.6] py-2.5 rounded-full bg-white text-slate-950 hover:bg-white/90 font-semibold text-sm flex items-center justify-center gap-1.5 disabled:opacity-35 transition-all"
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
