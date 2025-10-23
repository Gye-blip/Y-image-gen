
import React, { useState, useRef, useCallback } from 'react';
import type { UploadedFile } from './types';
import { editImageWithGemini } from './services/geminiService';

// --- Helper Functions ---
const fileToUploadedFile = (file: File): Promise<UploadedFile> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        base64: reader.result as string,
        mimeType: file.type,
        name: file.name,
      });
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

// --- SVG Icons ---
const UploadIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
  </svg>
);

const SparklesIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
  </svg>
);

const DownloadIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
);

const Spinner: React.FC = () => (
  <div className="absolute inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-20">
    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
  </div>
);

// --- UI Components ---
interface ImageDisplayProps {
  title: string;
  imageSrc: string | null;
  children?: React.ReactNode;
  isLoading?: boolean;
}

const ImageDisplay: React.FC<ImageDisplayProps> = ({ title, imageSrc, children, isLoading }) => (
  <div className="flex flex-col gap-4 w-full">
    <h2 className="text-xl font-bold text-gray-300 text-center">{title}</h2>
    <div className="relative aspect-square w-full bg-gray-800 rounded-lg border-2 border-dashed border-gray-600 flex items-center justify-center overflow-hidden">
      {isLoading && <Spinner />}
      {imageSrc ? (
        <img src={imageSrc} alt={title} className="object-contain h-full w-full" />
      ) : (
        <div className="text-center text-gray-500">
          <SparklesIcon className="mx-auto h-12 w-12" />
          <p>Edited image will appear here</p>
        </div>
      )}
      {children}
    </div>
  </div>
);

const ImageUploader: React.FC<{ onImageSelect: (file: File) => void }> = ({ onImageSelect }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageSelect(file);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <input type="file" accept="image/png, image/jpeg" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
      <button
        onClick={() => fileInputRef.current?.click()}
        className="w-full flex flex-col items-center justify-center gap-4 p-12 bg-gray-800 rounded-lg border-2 border-dashed border-gray-600 hover:bg-gray-700 hover:border-blue-500 transition-colors duration-300 cursor-pointer"
      >
        <UploadIcon className="h-16 w-16 text-gray-400" />
        <span className="text-xl font-semibold text-gray-300">Click to upload an image</span>
        <span className="text-sm text-gray-500">PNG or JPG</span>
      </button>
    </div>
  );
};


// --- Main App Component ---
export default function App() {
  const [originalImage, setOriginalImage] = useState<UploadedFile | null>(null);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    setEditedImage(null);
    try {
      const uploadedFile = await fileToUploadedFile(file);
      setOriginalImage(uploadedFile);
    } catch (e) {
      setError("Failed to read the image file.");
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSubmit = async () => {
    if (!originalImage || !prompt) {
      setError("Please upload an image and provide a prompt.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setEditedImage(null);
    try {
      const result = await editImageWithGemini(originalImage, prompt);
      setEditedImage(result);
    } catch (e) {
      setError(e as string);
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageSelect(file);
    }
  };

  return (
    <div className="bg-gray-900 text-white min-h-screen font-sans flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <header className="w-full max-w-6xl text-center mb-8">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
          Gemini Image Editor
        </h1>
        <p className="mt-2 text-lg text-gray-400">Edit photos with text prompts using AI.</p>
      </header>

      <main className="w-full max-w-6xl flex-grow">
        {!originalImage ? (
          <div className="flex items-center justify-center h-full">
            <ImageUploader onImageSelect={handleImageSelect} />
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <ImageDisplay title="Original Image" imageSrc={originalImage.base64}>
                  <button onClick={() => fileInputRef.current?.click()} className="absolute bottom-4 right-4 bg-gray-800 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                      Change Image
                  </button>
                  <input type="file" accept="image/png, image/jpeg" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
              </ImageDisplay>

              <ImageDisplay title="Edited Image" imageSrc={editedImage} isLoading={isLoading}>
                {editedImage && (
                  <a
                    href={editedImage}
                    download={`edited-${originalImage.name}`}
                    className="absolute bottom-4 right-4 bg-green-600 hover:bg-green-700 text-white font-bold p-3 rounded-full transition-colors flex items-center justify-center"
                    aria-label="Download edited image"
                  >
                    <DownloadIcon className="h-6 w-6" />
                  </a>
                )}
              </ImageDisplay>
            </div>
            
            {error && (
              <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg text-center" role="alert">
                <p>{error}</p>
              </div>
            )}

            <div className="flex flex-col gap-4 bg-gray-800 p-6 rounded-lg border border-gray-700">
                <label htmlFor="prompt" className="text-lg font-semibold text-gray-300">
                    Your Editing Prompt
                </label>
                <textarea
                  id="prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder='e.g., "make the shirt red", "add a retro filter", "change background to a beach"'
                  className="w-full p-3 bg-gray-900 border-2 border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-white h-24 resize-none"
                  disabled={isLoading}
                />
                <button
                  onClick={handleSubmit}
                  disabled={isLoading || !prompt}
                  className="w-full sm:w-auto self-end px-8 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {isLoading ? 'Generating...' : 'Generate'}
                  {!isLoading && <SparklesIcon className="h-5 w-5" />}
                </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
