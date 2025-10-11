

import React, { useState, useRef } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import Textarea from './ui/Textarea';
import Button from './ui/Button';
import { Post, Profile } from '../types';
import Avatar from './ui/Avatar';
import { getErrorMessage } from '../utils/errors';
import { GoogleGenAI } from '@google/genai';
import Input from './ui/Input';


const PhotoIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-green-400">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <circle cx="8.5" cy="8.5" r="1.5"></circle>
        <polyline points="21 15 16 10 5 21"></polyline>
    </svg>
);

const AiIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-purple-400">
        <path d="M5 3v4" />
        <path d="M19 17v4" />
        <path d="M3 5h4" />
        <path d="M17 19h4" />
        <path d="M14 9a2 2 0 0 1-2-2V3" />
        <path d="M10 21v-4a2 2 0 0 1 2-2h4" />
        <path d="m21 7-8 8" />
    </svg>
);

const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
);

interface CreatePostFormProps {
  groupId?: string;
  onPostCreated?: (newPost: Post) => void;
  profile: Profile | null;
}

const CreatePostForm: React.FC<CreatePostFormProps> = ({ groupId, onPostCreated, profile }) => {
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI State
  const [showAiPrompt, setShowAiPrompt] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setIsFocused(true); // Keep the form expanded when an image is added
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };
  
  const handleGenerateWithAi = async () => {
    if (!aiPrompt.trim()) return;

    setAiLoading(true);
    setAiError(null);

    try {
      if (!process.env.API_KEY) {
        throw new Error("مفتاح API الخاص بـ Gemini غير متوفر.");
      }
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: aiPrompt,
        config: {
            systemInstruction: "You are a helpful assistant for creating social media posts for a local marketplace app in Raqqa, Syria. Generate concise and engaging content based on the user's prompt. Respond in Arabic, using a friendly and local tone.",
        }
      });
      
      const text = response.text;

      if (text) {
        setContent(text);
        setShowAiPrompt(false);
        setAiPrompt('');
        setIsFocused(true); 
      } else {
        throw new Error("لم يتمكن الذكاء الاصطناعي من إنشاء محتوى.");
      }
    } catch (error: unknown) {
      setAiError(`فشل الإنشاء: ${getErrorMessage(error)}`);
      console.error("Error generating with AI:", error);
    } finally {
      setAiLoading(false);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!content.trim() && !imageFile) || !user) return;

    setLoading(true);
    setError(null);

    try {
      let imageUrl: string | null = null;
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('uploads')
          .upload(fileName, imageFile);

        if (uploadError) {
          throw uploadError;
        }
        imageUrl = fileName;
      }
      
      const postData = {
          content: content.trim(),
          user_id: user.id,
          image_url: imageUrl,
          group_id: groupId || null,
      };

      const { data: insertedPost, error: insertError } = await supabase
        .from('posts')
        .insert([postData])
        .select('id, content, image_url, created_at, user_id, group_id')
        .single();
      
      if (insertError) throw insertError;
      
      const { data: groupData, error: groupError } = groupId ? await supabase.from('groups').select('name').eq('id', groupId).single() : { data: null, error: null };
      if (groupError) console.warn('Could not fetch group name for new post', groupError.message);
      
      const newFullPost: Post = {
        ...insertedPost,
        profiles: {
            full_name: profile?.full_name || null,
            avatar_url: profile?.avatar_url || null,
        },
        groups: groupData || null,
        likes: [],
        comments: [{ count: 0 }]
      };

      setContent('');
      removeImage();
      setIsFocused(false);
      setShowAiPrompt(false);
      setAiPrompt('');
      if (onPostCreated) {
        onPostCreated(newFullPost);
      }
    } catch (error: unknown) {
      setError(`فشل نشر المنشور: ${getErrorMessage(error)}`);
      console.error('Error creating post:', error);
    } finally {
      setLoading(false);
    }
  };

  const firstName = profile?.full_name?.split(' ')[0] || 'المستخدم';

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 mb-6">
      <form onSubmit={handleSubmit}>
        <div className="flex items-start gap-3">
          <Avatar url={profile?.avatar_url} size={40} userId={profile?.id} showStatus={true} />
          <Textarea
            rows={isFocused || content || imageFile ? 3 : 1}
            placeholder={groupId ? 'اكتب شيئًا لهذه المجموعة...' : `بماذا تفكر يا ${firstName}؟`}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onFocus={() => setIsFocused(true)}
            disabled={loading}
            className="!bg-slate-700 border-slate-600 rounded-lg py-2 px-4 transition-all duration-300 ease-in-out"
          />
        </div>

        {imagePreview && (
          <div className="mt-4 relative p-2 border border-slate-700 rounded-lg">
            <img src={imagePreview} alt="معاينة" className="rounded-lg w-full max-h-80 object-contain" />
            <button
              type="button"
              onClick={removeImage}
              className="absolute top-4 right-4 bg-slate-900/50 text-white rounded-full p-1.5 hover:bg-red-500 transition-colors"
              aria-label="Remove image"
            >
              <CloseIcon />
            </button>
          </div>
        )}

        {error && <p className="text-red-400 text-sm mt-2 text-right">{error}</p>}
        
        {(isFocused || content || imageFile) && (
            <div className="mt-4 space-y-3">
                {showAiPrompt && (
                    <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600 space-y-2">
                        <label className="text-sm font-medium text-slate-300">إنشاء محتوى بالذكاء الاصطناعي</label>
                        <div className="flex gap-2">
                            <Input
                                type="text"
                                placeholder="مثال: أعلن عن هاتف مستعمل بحالة ممتازة"
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                disabled={aiLoading}
                                className="!py-2 !text-sm"
                            />
                            <Button
                                type="button"
                                onClick={handleGenerateWithAi}
                                loading={aiLoading}
                                disabled={!aiPrompt.trim()}
                                className="!w-auto !py-2 !px-4 !text-sm"
                            >
                                إنشاء
                            </Button>
                        </div>
                        {aiError && <p className="text-red-400 text-xs text-right">{aiError}</p>}
                    </div>
                )}
              <hr className="border-slate-700" />
              <div className="flex justify-between items-center flex-wrap gap-2">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={loading}
                        className="flex items-center gap-2 text-slate-300 hover:bg-slate-700 p-2 rounded-md transition-colors"
                    >
                        <PhotoIcon />
                        <span className="font-semibold text-sm">إضافة صورة</span>
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept="image/png, image/jpeg, image/webp"
                    />
                    <button
                        type="button"
                        onClick={() => { setShowAiPrompt(prev => !prev); setAiError(null); }}
                        disabled={loading}
                        className="flex items-center gap-2 text-slate-300 hover:bg-slate-700 p-2 rounded-md transition-colors"
                    >
                        <AiIcon />
                        <span className="font-semibold text-sm">إنشاء بـ AI</span>
                    </button>
                </div>

                <div className="w-full sm:w-auto">
                  <Button type="submit" loading={loading} disabled={!(content.trim() || imageFile)} className="sm:!w-auto sm:px-10">
                    نشر
                  </Button>
                </div>
              </div>
            </div>
        )}
      </form>
    </div>
  );
};

export default CreatePostForm;
