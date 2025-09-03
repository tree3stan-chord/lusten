// Image processing utilities for profile picture upload
// Provides client-side image resizing, cropping, and preview functionality

export interface ImageCropData {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
}

export interface ProcessedImage {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  fileSize: number;
}

export const AVATAR_CONFIG = {
  maxFileSize: 2 * 1024 * 1024, // 2MB
  maxDimension: 512, // 512x512px
  quality: 0.85,
  format: 'webp',
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
} as const;

export async function validateImageFile(file: File): Promise<{ isValid: boolean; error?: string }> {
  // Check file size
  if (file.size > AVATAR_CONFIG.maxFileSize) {
    return {
      isValid: false,
      error: `File size must be less than ${AVATAR_CONFIG.maxFileSize / 1024 / 1024}MB`
    };
  }

  // Check file type
  if (!AVATAR_CONFIG.allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: 'Only JPEG, PNG, and WebP images are allowed'
    };
  }

  return { isValid: true };
}

export function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

export function calculateCropDimensions(
  imageWidth: number,
  imageHeight: number,
  containerWidth: number,
  containerHeight: number
): { scale: number; cropSize: number; offsetX: number; offsetY: number } {
  // Calculate the scale to fit the image in the container while maintaining aspect ratio
  const scaleX = containerWidth / imageWidth;
  const scaleY = containerHeight / imageHeight;
  const scale = Math.max(scaleX, scaleY);

  // Calculate the size of the crop area (always square for circular avatar)
  const cropSize = Math.min(containerWidth, containerHeight);

  // Center the crop area
  const scaledWidth = imageWidth * scale;
  const scaledHeight = imageHeight * scale;
  const offsetX = (containerWidth - scaledWidth) / 2;
  const offsetY = (containerHeight - scaledHeight) / 2;

  return { scale, cropSize, offsetX, offsetY };
}

export async function cropAndResizeImage(
  image: HTMLImageElement,
  cropData: ImageCropData,
  outputSize: number = AVATAR_CONFIG.maxDimension
): Promise<ProcessedImage> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas 2D context not available');
  }

  // Set output canvas size
  canvas.width = outputSize;
  canvas.height = outputSize;

  // Calculate source rectangle for cropping
  const sourceX = cropData.x / cropData.scale;
  const sourceY = cropData.y / cropData.scale;
  const sourceSize = cropData.width / cropData.scale;

  // Draw the cropped and resized image
  ctx.drawImage(
    image,
    sourceX, sourceY, sourceSize, sourceSize, // source rectangle
    0, 0, outputSize, outputSize // destination rectangle
  );

  // Convert to blob with WebP format and quality compression
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to create image blob'));
          return;
        }

        const dataUrl = canvas.toDataURL(`image/${AVATAR_CONFIG.format}`, AVATAR_CONFIG.quality);

        resolve({
          blob,
          dataUrl,
          width: outputSize,
          height: outputSize,
          fileSize: blob.size,
        });
      },
      `image/${AVATAR_CONFIG.format}`,
      AVATAR_CONFIG.quality
    );
  });
}

export function createImagePreview(
  image: HTMLImageElement,
  cropData: ImageCropData,
  previewSize: number = 150
): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas 2D context not available');
  }

  canvas.width = previewSize;
  canvas.height = previewSize;

  // Calculate source rectangle for cropping
  const sourceX = cropData.x / cropData.scale;
  const sourceY = cropData.y / cropData.scale;
  const sourceSize = cropData.width / cropData.scale;

  // Draw the preview
  ctx.drawImage(
    image,
    sourceX, sourceY, sourceSize, sourceSize,
    0, 0, previewSize, previewSize
  );

  return canvas.toDataURL('image/jpeg', 0.8);
}

export async function generateAvatarUrl(processedImage: ProcessedImage, userId: string): Promise<string> {
  // Create a data URL for storage
  // In a real implementation, you might upload to a CDN or file storage service
  // For now, we'll use data URLs stored in the database
  return processedImage.dataUrl;
}

export function getDefaultAvatarUrl(userId: string, name: string): string {
  // Generate a simple avatar based on user initials and color
  const initials = name
    .split(' ')
    .map(part => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');

  // Simple hash function to generate consistent colors
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  const hue = Math.abs(hash) % 360;
  const backgroundColor = `hsl(${hue}, 60%, 50%)`;

  // Create SVG avatar
  const svg = `
    <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <circle cx="256" cy="256" r="256" fill="${backgroundColor}"/>
      <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-family="system-ui, sans-serif" font-size="180" font-weight="600" fill="white">
        ${initials}
      </text>
    </svg>
  `;

  return `data:image/svg+xml;base64,${btoa(svg)}`;
}