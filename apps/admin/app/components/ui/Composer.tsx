"use client";

import { useState, useRef } from "react";
import { Button } from "@/app/components/ui/Button";
import { Textarea } from "@/app/components/ui/Textarea";
import { Paperclip, Send, X, Image as ImageIcon } from "lucide-react";
import { apiUpload } from "@/lib/api";

interface ComposerProps {
  onSend: (text: string, attachmentIds: string[]) => Promise<void>;
  placeholder?: string;
}

export function Composer({ onSend, placeholder = "پیام خود را بنویسید..." }: ComposerProps) {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<{ id: string; url: string; name: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (files: FileList | File[]) => {
    setIsUploading(true);
    try {
      const newAttachments = [...attachments];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith("image/")) continue;
        
        const formData = new FormData();
        formData.append("file", file);
        
        const res = await apiUpload<{ id: string; url: string }>("/admin/uploads", formData);
        newAttachments.push({ id: res.id, url: res.url, name: file.name });
      }
      setAttachments(newAttachments);
    } catch (error) {
      console.error("Upload failed:", error);
      alert("خطا در آپلود فایل");
    } finally {
      setIsUploading(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (e.clipboardData.files.length > 0) {
      e.preventDefault();
      handleUpload(e.clipboardData.files);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files);
    }
  };

  const handleSend = async () => {
    if (!text.trim() && attachments.length === 0) return;
    
    setIsSending(true);
    try {
      await onSend(text, attachments.map(a => a.id));
      setText("");
      setAttachments([]);
    } catch (error) {
      console.error("Send failed:", error);
      alert("خطا در ارسال پیام");
    } finally {
      setIsSending(false);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div 
      className="bg-white border border-slate-200 rounded-lg shadow-sm p-3"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {attachments.map((file, idx) => (
            <div key={idx} className="relative group rounded-md overflow-hidden border border-slate-200 bg-slate-50 flex items-center gap-2 pr-2">
              <div className="w-10 h-10 bg-slate-200 flex items-center justify-center">
                <ImageIcon className="w-4 h-4 text-slate-500" />
              </div>
              <span className="text-xs text-slate-600 max-w-[100px] truncate" dir="ltr">{file.name}</span>
              <button 
                onClick={() => removeAttachment(idx)}
                className="p-1 mr-1 text-slate-400 hover:text-red-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onPaste={handlePaste}
        placeholder={placeholder}
        className="min-h-[80px] border-0 focus-visible:ring-0 p-0 resize-none shadow-none"
      />
      
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            multiple 
            accept="image/*"
            onChange={(e) => e.target.files && handleUpload(e.target.files)}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            disabled={isUploading || isSending}
            title="پیوست تصویر"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          {isUploading && <span className="text-xs text-slate-500">در حال آپلود...</span>}
        </div>
        
        <Button 
          onClick={handleSend} 
          disabled={isSending || isUploading || (!text.trim() && attachments.length === 0)}
          className="gap-2"
        >
          <Send className="w-4 h-4" />
          <span>ارسال</span>
        </Button>
      </div>
    </div>
  );
}
