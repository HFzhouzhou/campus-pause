import React, { useState } from 'react';

interface SafeImageProps {
  src: string;
  alt: string;
  fallbackGradient?: string;
  emoji?: string;
  className?: string;
}

/**
 * 永不裂图的安全图片组件：外链离线/加载失败时自动展示柔和治愈渐变与氛围星光图案
 */
export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt,
  fallbackGradient = 'linear-gradient(135deg, #34D399 0%, #6366F1 60%, #0B0F19 100%)',
  emoji = '✨',
  className = '',
}) => {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`relative overflow-hidden flex items-center justify-center ${className}`}
        style={{ background: fallbackGradient }}
        role="img"
        aria-label={alt}
      >
        <div
          className="absolute inset-0 opacity-35"
          style={{
            backgroundImage:
              'radial-gradient(circle at 25% 25%, rgba(255,255,255,0.45) 0%, transparent 45%), radial-gradient(circle at 80% 75%, rgba(255,255,255,0.25) 0%, transparent 50%)',
          }}
        />
        <span className="relative z-10 text-3xl drop-shadow-md select-none">
          {emoji}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};
