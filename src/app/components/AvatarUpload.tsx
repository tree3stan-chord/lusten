'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  validateImageFile,
  loadImageFromFile,
  calculateCropDimensions,
  cropAndResizeImage,
  createImagePreview,
  type ImageCropData,
  type ProcessedImage,
  AVATAR_CONFIG
} from '../../lib/image-utils';

interface AvatarUploadProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (avatarUrl: string) => void;
  currentAvatar?: string | null;
}

export default function AvatarUpload({ isOpen, onClose, onSuccess, currentAvatar }: AvatarUploadProps) {
  const { data: session } = useSession();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);
  const [cropData, setCropData] = useState<ImageCropData>({ x: 0, y: 0, width: 200, height: 200, scale: 1 });
  const [preview, setPreview] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [error, setError] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cropAreaRef = useRef<HTMLDivElement>(null);

  const containerSize = 400; // Size of the crop container
  const cropRadius = 100; // Radius of the circular crop area

  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setSelectedFile(null);
      setImageElement(null);
      setPreview('');
      setError('');
      setCropData({ x: 0, y: 0, width: 200, height: 200, scale: 1 });
    }
  }, [isOpen]);

  const handleFileSelect = useCallback(async (file: File) => {
    setError('');
    
    const validation = await validateImageFile(file);
    if (!validation.isValid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    try {
      const img = await loadImageFromFile(file);
      setSelectedFile(file);
      setImageElement(img);

      // Calculate initial crop position (centered)
      const { scale, cropSize, offsetX, offsetY } = calculateCropDimensions(
        img.width, img.height, containerSize, containerSize
      );

      const centerX = (containerSize - cropSize) / 2;
      const centerY = (containerSize - cropSize) / 2;

      setCropData({
        x: centerX,
        y: centerY,
        width: cropSize,
        height: cropSize,
        scale
      });
    } catch (err) {
      setError('Failed to load image');
    }
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!cropAreaRef.current) return;
    
    const rect = cropAreaRef.current.getBoundingClientRect();
    setDragStart({
      x: e.clientX - rect.left - cropData.x,
      y: e.clientY - rect.top - cropData.y
    });
  }, [cropData]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragStart || !cropAreaRef.current || !imageElement) return;

    const rect = cropAreaRef.current.getBoundingClientRect();
    const newX = e.clientX - rect.left - dragStart.x;
    const newY = e.clientY - rect.top - dragStart.y;

    // Constrain within bounds
    const maxX = containerSize - cropData.width;
    const maxY = containerSize - cropData.height;

    setCropData(prev => ({
      ...prev,
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    }));
  }, [dragStart, cropData.width, imageElement]);

  const handleMouseUp = useCallback(() => {
    setDragStart(null);
  }, []);

  useEffect(() => {
    if (imageElement && selectedFile) {
      const newPreview = createImagePreview(imageElement, cropData, 150);
      setPreview(newPreview);
    }
  }, [imageElement, cropData, selectedFile]);

  const handleUpload = useCallback(async () => {
    if (!imageElement || !selectedFile) return;

    setIsUploading(true);
    setError('');

    try {
      const processedImage: ProcessedImage = await cropAndResizeImage(imageElement, cropData);
      
      // Upload to server
      const formData = new FormData();
      formData.append('avatar', processedImage.dataUrl);

      const response = await fetch('/api/avatar/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      onSuccess(data.avatar_url);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  }, [imageElement, selectedFile, cropData, onSuccess, onClose]);

  const handleDelete = useCallback(async () => {
    if (!currentAvatar) return;

    setIsUploading(true);
    setError('');

    try {
      const response = await fetch('/api/avatar/delete', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Delete failed');
      }

      onSuccess(''); // Empty string indicates deleted avatar
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setIsUploading(false);
    }
  }, [currentAvatar, onSuccess, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Change Profile Picture
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              disabled={isUploading}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 rounded">
              {error}
            </div>
          )}

          {!selectedFile ? (
            <div>
              <div
                className={`border-2 border-dashed ${
                  isDragging ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600'
                } rounded-lg p-8 text-center hover:border-gray-400 dark:hover:border-gray-500 transition-colors cursor-pointer`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
              >
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Upload a profile picture
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Drag and drop an image here, or click to select
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Max {AVATAR_CONFIG.maxFileSize / 1024 / 1024}MB • JPEG, PNG, WebP
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={AVATAR_CONFIG.allowedTypes.join(',')}
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </div>

              {currentAvatar && (
                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                    Or remove your current profile picture
                  </p>
                  <button
                    onClick={handleDelete}
                    disabled={isUploading}
                    className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 border border-red-300 dark:border-red-600 rounded hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUploading ? 'Removing...' : 'Remove Current Picture'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Crop Area */}
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                    Position your photo
                  </h3>
                  <div
                    ref={cropAreaRef}
                    className="relative bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden select-none"
                    style={{ width: containerSize, height: containerSize }}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                  >
                    <canvas
                      ref={canvasRef}
                      width={containerSize}
                      height={containerSize}
                      className="absolute inset-0 w-full h-full object-contain"
                    />
                    
                    {/* Image display */}
                    {imageElement && (
                      <img
                        src={imageElement.src}
                        alt="Preview"
                        className="absolute pointer-events-none"
                        style={{
                          width: imageElement.width * cropData.scale,
                          height: imageElement.height * cropData.scale,
                          left: (containerSize - imageElement.width * cropData.scale) / 2,
                          top: (containerSize - imageElement.height * cropData.scale) / 2,
                        }}
                      />
                    )}

                    {/* Overlay with crop circle */}
                    <div className="absolute inset-0 pointer-events-none">
                      {/* Dark overlay */}
                      <div
                        className="absolute inset-0 bg-black bg-opacity-50"
                        style={{
                          maskImage: `radial-gradient(circle at ${cropData.x + cropRadius}px ${cropData.y + cropRadius}px, transparent ${cropRadius}px, black ${cropRadius + 1}px)`,
                          WebkitMaskImage: `radial-gradient(circle at ${cropData.x + cropRadius}px ${cropData.y + cropRadius}px, transparent ${cropRadius}px, black ${cropRadius + 1}px)`,
                        }}
                      />
                      
                      {/* Crop circle outline */}
                      <div
                        className="absolute border-2 border-white rounded-full shadow-lg"
                        style={{
                          left: cropData.x,
                          top: cropData.y,
                          width: cropRadius * 2,
                          height: cropRadius * 2,
                        }}
                      />
                    </div>

                    {/* Drag handle */}
                    <div
                      className="absolute cursor-move"
                      style={{
                        left: cropData.x,
                        top: cropData.y,
                        width: cropRadius * 2,
                        height: cropRadius * 2,
                      }}
                    />
                  </div>
                </div>

                {/* Preview */}
                <div className="lg:w-48">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                    Preview
                  </h3>
                  <div className="text-center">
                    {preview && (
                      <div>
                        <img
                          src={preview}
                          alt="Avatar preview"
                          className="w-24 h-24 rounded-full mx-auto mb-2 border-2 border-gray-200 dark:border-gray-600"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Profile picture
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setSelectedFile(null)}
                  disabled={isUploading}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Choose Different Photo
                </button>
                <button
                  onClick={handleUpload}
                  disabled={isUploading || !imageElement}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 rounded-md disabled:cursor-not-allowed"
                >
                  {isUploading ? 'Uploading...' : 'Save Profile Picture'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}