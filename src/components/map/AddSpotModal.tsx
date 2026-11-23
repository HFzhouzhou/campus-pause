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
      tags: ['五合私藏', rating >= 4 ? '极度安静' : '轻松放空', '同学标记'],
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/35 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, y: 48, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 32, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="relative z-10 w-full sm:max-w-lg max-h-[90dvh] flex flex-col rounded-t-[30px] sm:rounded-[30px] bg-white/95 backdrop-blur-2xl border border-white shadow-[0_24px_64px_rgba(15,23,42,0.22)] overflow-hidden"
          >
            <div className="flex justify-center pt-2.5 sm:hidden shrink-0">
              <div className="w-9 h-1 rounded-full bg-slate-300" />
            </div>

            <div className="px-5 pt-3.5 pb-3 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="min-w-0 pr-2">
                <h2 className="text-[17px] font-bold text-[#1D1D1F] flex items-center gap-1.5 tracking-tight">
                  <Sparkles className="w-4 h-4 text-[#007AFF]" />
                  标记新的校园治愈点
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1 truncate">
                  <MapPin className="w-3 h-3 text-[#34C759] shrink-0" />
                  {suggestedAddress ||
                    `${formatCoord(coords.lng)}, ${formatCoord(coords.lat)}`}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200/80 flex items-center justify-center text-slate-500 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              id="add-spot-form"
              onSubmit={handleSubmit}
              className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1 min-h-0"
            >
              <div className="space-y-2.5">
                <label className="block text-xs font-semibold text-slate-600">
                  现场实景图（自动压缩上传或快选预设）
                </label>

                <div className="relative h-36 rounded-[20px] overflow-hidden border border-slate-200/80 bg-slate-100">
                  <SafeImage
                    src={coverUrl}
                    alt="点位封面预览"
                    fallbackGradient={fallbackGradient}
                    emoji="📸"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isCompressing}
                    className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/90 hover:bg-white text-[#1D1D1F] shadow-sm backdrop-blur-md"
                  >
                    {isCompressing ? (
                      <>压缩中…</>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5 text-[#007AFF]" />
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
                  <p className="text-xs text-[#FF3B30]">{uploadError}</p>
                )}

                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                  <span className="text-[11px] text-slate-400 shrink-0 flex items-center gap-1">
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
                        className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                          active
                            ? 'bg-[#007AFF] text-white'
                            : 'bg-[#F2F2F7] text-slate-600 hover:bg-slate-200/70'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-600">
                    地点名称 *
                  </label>
                  {suggestedName && name !== suggestedName && (
                    <button
                      type="button"
                      onClick={() => setName(suggestedName)}
                      className="text-[11px] text-[#007AFF] font-medium hover:underline"
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
                  className="w-full rounded-2xl bg-[#F2F2F7] border border-transparent focus:border-[#007AFF] focus:bg-white px-3.5 py-2.5 text-sm text-[#1D1D1F] placeholder:text-slate-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
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
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                          active
                            ? 'bg-[#007AFF] text-white shadow-sm'
                            : 'bg-[#F2F2F7] text-slate-600 hover:bg-slate-200/70'
                        }`}
                      >
                        {cat.emoji} {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  安静治愈指数（{rating} 星）
                </label>
                <div className="flex items-center gap-1">
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
                            ? 'fill-[#FF9500] text-[#FF9500]'
                            : 'text-slate-200'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs text-slate-500 ml-1.5">
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

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  写一句安利理由 *
                </label>
                <textarea
                  required
                  rows={3}
                  maxLength={140}
                  value={recommendation}
                  onChange={(e) => setRecommendation(e.target.value)}
                  placeholder="几点来最美？有没有风、插座或者亲人小猫？"
                  className="w-full rounded-2xl bg-[#F2F2F7] border border-transparent focus:border-[#007AFF] focus:bg-white px-3.5 py-2.5 text-sm text-[#1D1D1F] placeholder:text-slate-400 focus:outline-none resize-none"
                />
              </div>
            </form>

            {/* 固定底部操作栏，永不裁切 */}
            <div className="px-5 py-3.5 border-t border-slate-100 bg-white/95 flex items-center gap-2.5 shrink-0 pb-safe">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-full bg-[#F2F2F7] hover:bg-slate-200/80 text-slate-700 text-sm font-semibold transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                form="add-spot-form"
                disabled={!name.trim() || !recommendation.trim()}
                className="flex-[1.6] py-2.5 rounded-full bg-[#007AFF] hover:bg-[#0066D6] text-white font-semibold text-sm flex items-center justify-center gap-1.5 disabled:opacity-35 shadow-[0_8px_20px_rgba(0,122,255,0.25)] transition-all"
              >
                <Check className="w-4 h-4" />
                发布到治愈地图
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
