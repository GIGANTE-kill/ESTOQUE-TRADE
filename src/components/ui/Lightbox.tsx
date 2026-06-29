"use client";

import { X, Download } from "lucide-react";
import Image from "next/image";
import { useEffect } from "react";

interface LightboxProps {
  isOpen: boolean;
  imageUrl: string | null;
  onClose: () => void;
}

export function Lightbox({ isOpen, imageUrl, onClose }: LightboxProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen || !imageUrl) return null;

  const handleDownload = async () => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `documento-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download image", err);
      // Fallback
      window.open(imageUrl, "_blank");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      {/* Top Bar */}
      <div className="absolute top-0 inset-x-0 p-4 flex items-center justify-end gap-3 bg-gradient-to-b from-black/60 to-transparent z-10">
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors"
        >
          <Download className="h-4 w-4" />
          Baixar Imagem
        </button>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Image Container */}
      <div className="relative w-full h-full max-w-5xl max-h-[85vh] flex items-center justify-center" onClick={onClose}>
        <div className="relative w-full h-full" onClick={(e) => e.stopPropagation()}>
          <Image
            src={imageUrl}
            alt="Ampliado"
            fill
            className="object-contain"
            sizes="100vw"
            quality={100}
            unoptimized
          />
        </div>
      </div>
    </div>
  );
}
