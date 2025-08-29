'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomName: string;
  roomUrl: string;
}

export default function ShareModal({ isOpen, onClose, roomName, roomUrl }: ShareModalProps) {
  const [showToast, setShowToast] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Generate QR code when modal opens
  useEffect(() => {
    if (isOpen && roomUrl) {
      generateQRCode();
    }
  }, [isOpen, roomUrl]);

  const generateQRCode = async () => {
    try {
      // Simple QR code generation using HTML5 Canvas
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas size
      canvas.width = 200;
      canvas.height = 200;

      // For now, show placeholder - we'll implement proper QR generation
      ctx.fillStyle = '#f3f4f6';
      ctx.fillRect(0, 0, 200, 200);
      
      ctx.fillStyle = '#374151';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('QR Code', 100, 90);
      ctx.fillText('Coming Soon', 100, 110);

      const dataUrl = canvas.toDataURL();
      setQrCodeDataUrl(dataUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(roomUrl);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (error) {
      console.error('Failed to copy:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = roomUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  const shareText = `Join my music room "${roomName}" on Lusten! Listen to music together in real-time: ${roomUrl}`;

  const handleWhatsAppShare = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
  };

  const handleTelegramShare = () => {
    const url = `https://t.me/share/url?url=${encodeURIComponent(roomUrl)}&text=${encodeURIComponent(`Join my music room "${roomName}" on Lusten!`)}`;
    window.open(url, '_blank');
  };

  const handleSMSShare = () => {
    const url = `sms:?body=${encodeURIComponent(shareText)}`;
    window.open(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Share &ldquo;{roomName}&rdquo;
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Copy Link Button */}
          <div className="relative">
            <button
              onClick={handleCopyLink}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>Copy Room Link</span>
            </button>
            
            {/* Toast Notification */}
            {showToast && (
              <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium animate-fade-in-out">
                Copied room link!
              </div>
            )}
          </div>

          {/* Social Sharing Buttons */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Share via</h4>
            <div className="grid grid-cols-3 gap-3">
              {/* WhatsApp */}
              <button
                onClick={handleWhatsAppShare}
                className="flex flex-col items-center space-y-2 p-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                </svg>
                <span className="text-xs">WhatsApp</span>
              </button>

              {/* Telegram */}
              <button
                onClick={handleTelegramShare}
                className="flex flex-col items-center space-y-2 p-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
                <span className="text-xs">Telegram</span>
              </button>

              {/* SMS */}
              <button
                onClick={handleSMSShare}
                className="flex flex-col items-center space-y-2 p-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                <span className="text-xs">SMS</span>
              </button>
            </div>
          </div>

          {/* QR Code Section */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">QR Code</h4>
            <div className="flex justify-center">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <canvas 
                  ref={canvasRef} 
                  className="border rounded-lg"
                  style={{ display: qrCodeDataUrl ? 'none' : 'block' }}
                />
                {qrCodeDataUrl && (
                  <Image 
                    src={qrCodeDataUrl} 
                    alt="QR Code" 
                    className="border rounded-lg"
                    width={200} 
                    height={200}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Room URL Display */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Room URL</h4>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <p className="text-sm text-gray-600 dark:text-gray-300 break-all font-mono">
                {roomUrl}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}