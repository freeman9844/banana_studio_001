/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useRef, useEffect } from 'react';
import { useToast } from '@/components/ui/ToastContext';
import { DEFAULT_QUOTA } from '@/lib/constants';

interface PhotoStudioProps {
  onGenerate: (prompt: string, imageBase64: string, mimeType: string) => Promise<{imageUrl: string, remainingQuota: number}>;
  initialQuota?: number;
}

export default function PhotoStudio({ onGenerate, initialQuota = DEFAULT_QUOTA }: PhotoStudioProps) {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [quota, setQuota] = useState<number>(initialQuota);
  const { showToast } = useToast();
  
  useEffect(() => {
    setQuota(initialQuota);
  }, [initialQuota]);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [base64Data, setBase64Data] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create local preview URL
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setMimeType(file.type);

    // Convert to base64 for API
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Extract the base64 part after the comma: data:image/jpeg;base64,...
      const base64Part = result.split(',')[1];
      setBase64Data(base64Part);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || !base64Data || quota <= 0) return;
    
    setIsLoading(true);
    setImageUrl(null);
    try {
      const result = await onGenerate(prompt, base64Data, mimeType || 'image/jpeg');
      setImageUrl(result.imageUrl);
      if (result.remainingQuota !== undefined) {
        setQuota(result.remainingQuota);
      }
    } catch (error: unknown) {
      showToast(
        error instanceof Error
          ? `그림을 그리는 중 문제가 생겼어요: ${error.message}`
          : '그림을 그리는 중 알 수 없는 문제가 생겼어요.',
        'error'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const isReady = prompt.trim() !== '' && base64Data !== null;

  return (
    <div className="bg-white p-8 rounded-3xl shadow-xl max-w-2xl w-full flex flex-col items-center mt-4">
      <div className="w-full flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-center flex-grow">내 사진으로 마법 부리기 📷</h2>
      </div>
      
      <div className="w-full text-right mb-4">
        <span className={`text-sm font-bold px-3 py-1 rounded-full ${quota > 5 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          🪄 남은 마법: {quota}번
        </span>
      </div>

      {/* Photo Upload Area */}
      <div className="w-full mb-6">
        <div 
          onClick={() => fileInputRef.current?.click()}
          className={`w-full h-56 border-4 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden relative ${previewUrl ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400'}`}
        >
          {previewUrl ? (
             <img src={previewUrl} alt="업로드된 사진" className="absolute inset-0 w-full h-full object-contain" />
          ) : (
            <>
              <span className="text-5xl mb-3">📸</span>
              <span className="text-gray-500 font-semibold text-lg text-center px-4">
                여기를 눌러서<br/>내가 그린 그림이나 사진을 올려주세요!
              </span>
            </>
          )}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            className="hidden" 
          />
        </div>
        {previewUrl && (
          <button 
            onClick={() => { setPreviewUrl(null); setBase64Data(null); if(fileInputRef.current) fileInputRef.current.value=''; }}
            className="mt-3 text-sm text-red-500 hover:text-red-700 font-bold w-full text-center"
          >
            사진 바꾸기 🔄
          </button>
        )}
      </div>

      <textarea
        className="input-primary h-24 resize-none mb-6 text-lg"
        placeholder="사진 속 친구가 무엇을 하고 있나요? (예: 우주에서 날고 있어!)"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        disabled={isLoading || quota <= 0}
      />

      <button 
        onClick={handleGenerate} 
        disabled={isLoading || !isReady || quota <= 0}
        className={`btn-primary w-full mb-8 ${(isLoading || !isReady || quota <= 0) ? 'opacity-50 cursor-not-allowed bg-gray-400' : 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/50'}`}
      >
        {quota <= 0 ? '오늘의 마법을 다 썼어요 🌙' : isLoading ? '✨ 사진과 마법을 섞는 중... ✨' : '사진으로 그림 만들기! 🪄'}
      </button>

      {isLoading && (
        <div className="my-8 flex flex-col items-center justify-center animate-pulse">
          <div className="text-6xl animate-bounce mb-4">🪄✨</div>
          <p className="text-xl font-bold text-blue-600">사진을 읽어들이고 있어요...</p>
          <p className="text-sm text-gray-500 mt-2">잠시만 기다려주세요!</p>
        </div>
      )}

      {imageUrl && !isLoading && (
        <div className="mt-4 w-full flex flex-col items-center animate-fade-in">
          <img 
            src={imageUrl} 
            alt="생성된 그림" 
            className="rounded-xl shadow-lg max-w-full h-auto object-contain border-4 border-blue-300"
          />
          <a 
            href={imageUrl} 
            download="my_magic_photo.jpg"
            className="mt-4 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-full shadow-md text-lg"
          >
            💾 내 컴퓨터에 저장하기
          </a>
        </div>
      )}
    </div>
  );
}