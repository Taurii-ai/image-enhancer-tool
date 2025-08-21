"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

interface ImageEnhancerProps {
  originalImage?: string | null;
  enhancedImage?: string | null;
  isLoading?: boolean;
  progress?: number;
}

export default function ImageEnhancer({ originalImage, enhancedImage, isLoading, progress = 0 }: ImageEnhancerProps) {
  const [sliderValue, setSliderValue] = useState(50);

  if (!originalImage || !enhancedImage) {
    return (
      <div className="text-center p-6">
        <p className="text-gray-500">Upload an image to enhance it.</p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Progress bar */}
      {isLoading && (
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <motion.div
            className="h-3 bg-blue-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      )}

      {/* Before/After comparison */}
      <div className="relative w-full max-w-2xl mx-auto aspect-square overflow-hidden rounded-2xl shadow-lg">
        <img
          src={originalImage}
          alt="Original"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - sliderValue}% 0 0)` }}
        >
          <img
            src={enhancedImage}
            alt="Enhanced"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Slider handle */}
        <input
          type="range"
          min="0"
          max="100"
          value={sliderValue}
          onChange={(e) => setSliderValue(Number(e.target.value))}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 w-3/4 accent-blue-500"
        />
      </div>

      {/* Reset button */}
      <Button variant="outline" onClick={() => setSliderValue(50)}>
        Reset Slider
      </Button>
    </div>
  );
}