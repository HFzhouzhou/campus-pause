/**
 * 前端 Canvas 图片压缩工具，将用户上传的本地图片压缩为轻量 Base64，避免撑爆 localStorage
 */
export async function compressImageToBase64(
  file: File,
  maxWidth = 880,
  quality = 0.72
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('读取图片失败'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('图片解析失败'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas 不可用'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export interface PresetPhoto {
  id: string;
  label: string;
  url: string;
  gradient: string;
}

/** 供 UGC 快速演示选择的精美治愈风景预设图（附带渐变兜底） */
export const PRESET_HEALING_PHOTOS: PresetPhoto[] = [
  {
    id: 'sunset-sky',
    label: '橘子海落日',
    url: 'https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?auto=format&fit=crop&w=900&q=80',
    gradient: 'linear-gradient(135deg, #F59E0B 0%, #7C3AED 55%, #0F172A 100%)',
  },
  {
    id: 'campus-cat',
    label: '晒太阳小橘猫',
    url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=900&q=80',
    gradient: 'linear-gradient(135deg, #FBBF24 0%, #D97706 50%, #1E293B 100%)',
  },
  {
    id: 'quiet-library',
    label: '暖灯静谧角落',
    url: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=900&q=80',
    gradient: 'linear-gradient(135deg, #6366F1 0%, #312E81 60%, #0B0F19 100%)',
  },
  {
    id: 'green-lawn',
    label: '微风大草坪',
    url: 'https://images.unsplash.com/photo-1501854155220-e28231c1f165?auto=format&fit=crop&w=900&q=80',
    gradient: 'linear-gradient(135deg, #34D399 0%, #059669 55%, #064E3B 100%)',
  },
  {
    id: 'night-rooftop',
    label: '晚风观星天台',
    url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=900&q=80',
    gradient: 'linear-gradient(135deg, #A78BFA 0%, #3B82F6 50%, #0B0F19 100%)',
  },
];
