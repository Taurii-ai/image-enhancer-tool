import { useState, useCallback } from 'react';
import { Upload, Image as ImageIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface ImageUploaderProps {
  onImageUpload: (file: File) => void;
  isProcessing?: boolean;
}

export const ImageUploader = ({ onImageUpload, isProcessing }: ImageUploaderProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set to false if we're leaving the main container
    if (e.currentTarget === e.target) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const validateFile = (file: File): boolean => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSize = 50 * 1024 * 1024; // 50MB

    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a JPG, PNG, or WebP image.",
        variant: "destructive",
      });
      return false;
    }

    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 50MB.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const processFile = (file: File) => {
    if (!validateFile(file)) return;

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    onImageUpload(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      processFile(files[0]);
    }
  }, [onImageUpload]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  return (
    <Card className="p-2 sm:p-4 md:p-8 bg-card shadow-card border-border overflow-x-hidden max-w-full">
      {!selectedFile ? (
        <div
          className={cn(
            "border-2 border-dashed rounded-lg sm:rounded-xl p-3 sm:p-6 md:p-12 text-center transition-all duration-500 ease-out cursor-pointer overflow-x-hidden max-w-full group",
            isDragOver 
              ? "border-primary bg-gradient-to-br from-primary/10 to-primary/5 scale-[1.02] shadow-lg shadow-primary/20" 
              : isHovered
              ? "border-primary/70 bg-primary/5 scale-[1.01]"
              : "border-border hover:border-primary/50 hover:bg-card/80 hover:scale-[1.005]"
          )}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <div className="flex flex-col items-center gap-2 sm:gap-4 md:gap-6 overflow-x-hidden max-w-full">
            <div className={cn(
              "p-2 sm:p-4 md:p-6 rounded-full transition-all duration-500 ease-out",
              isDragOver 
                ? "bg-primary text-primary-foreground animate-pulse" 
                : isHovered
                ? "bg-primary/20 text-primary"
                : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
            )}>
              <Upload className={cn(
                "w-6 h-6 sm:w-8 sm:h-8 md:w-12 md:h-12 transition-all duration-300",
                isDragOver ? "animate-bounce" : ""
              )} />
            </div>
            
            <div className="space-y-1 sm:space-y-2 px-1 sm:px-2 overflow-x-hidden max-w-full">
              <h3 className="text-sm sm:text-base md:text-xl font-semibold text-foreground break-words overflow-wrap-anywhere max-w-full">
                {isDragOver ? "Drop your image here" : "Upload your image"}
              </h3>
              <p className="text-xs sm:text-sm md:text-base text-muted-foreground break-words overflow-wrap-anywhere max-w-full">
                Drag & drop or click to browse • JPG, PNG, WebP • Max 50MB
              </p>
            </div>

            <Button variant="hero" size="sm" className="sm:size-default md:size-lg w-full max-w-48">
              <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              Choose Image
            </Button>
          </div>

          <input
            id="file-input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
            disabled={isProcessing}
          />
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4 md:space-y-6 overflow-x-hidden max-w-full">
          <div className="flex items-center justify-between">
            <h3 className="text-sm sm:text-base md:text-lg font-medium text-foreground break-words overflow-wrap-anywhere max-w-full">Image Preview</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={clearFile}
              disabled={isProcessing}
            >
              <X className="w-4 h-4" />
              Remove
            </Button>
          </div>

          <div className="relative rounded-lg overflow-hidden bg-muted min-h-[100px] sm:min-h-[150px] md:min-h-[200px] flex items-center justify-center max-w-full">
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Preview"
                className="max-w-full max-h-48 sm:max-h-64 md:max-h-96 object-contain"
                onLoad={() => console.log('Image loaded successfully')}
                onError={(e) => {
                  console.error('Image failed to load:', e);
                  console.error('Preview URL:', previewUrl);
                }}
              />
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground overflow-x-hidden max-w-full">
            <div className="break-words overflow-wrap-anywhere max-w-full">
              <span className="font-medium">File name:</span> {selectedFile.name}
            </div>
            <div className="break-words overflow-wrap-anywhere max-w-full">
              <span className="font-medium">Size:</span> {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};