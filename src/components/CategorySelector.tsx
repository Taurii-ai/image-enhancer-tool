import { useState } from 'react';
import { Camera, User, Palette } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type EnhancementCategory = 'general' | 'faces' | 'anime';

interface CategorySelectorProps {
  selectedCategory: EnhancementCategory;
  onCategoryChange: (category: EnhancementCategory) => void;
  disabled?: boolean;
}

const categories = [
  {
    id: 'general' as const,
    title: 'General Photos',
    description: 'Landscapes, products, real-world photography',
    icon: Camera,
    gradient: 'from-blue-500/20 to-cyan-500/20',
    border: 'border-blue-500/30',
    text: 'text-blue-600',
    bg: 'bg-blue-500/10'
  },
  {
    id: 'faces' as const,
    title: 'Faces & Portraits',
    description: 'People, face restoration, portrait photography',
    icon: User,
    gradient: 'from-green-500/20 to-emerald-500/20',
    border: 'border-green-500/30',
    text: 'text-green-600',
    bg: 'bg-green-500/10'
  },
  {
    id: 'anime' as const,
    title: 'Anime & Digital Art',
    description: 'Cartoons, illustrations, anime-style images',
    icon: Palette,
    gradient: 'from-purple-500/20 to-pink-500/20',
    border: 'border-purple-500/30',
    text: 'text-purple-600',
    bg: 'bg-purple-500/10'
  }
];

export const CategorySelector = ({ selectedCategory, onCategoryChange, disabled }: CategorySelectorProps) => {
  const [hoveredCategory, setHoveredCategory] = useState<EnhancementCategory | null>(null);

  return (
    <div className="w-full max-w-2xl mx-auto mb-6">
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold mb-2">Choose Enhancement Type</h3>
        <p className="text-sm text-muted-foreground">
          Select the category that best matches your image for optimal results
        </p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {categories.map((category) => {
          const Icon = category.icon;
          const isSelected = selectedCategory === category.id;
          const isHovered = hoveredCategory === category.id;
          
          return (
            <Card
              key={category.id}
              className={cn(
                "relative p-4 cursor-pointer transition-all duration-300 ease-out border-2 z-10",
                isSelected 
                  ? `${category.border} ${category.bg} shadow-lg scale-[1.02]`
                  : isHovered
                  ? `border-border/50 bg-muted/50 scale-[1.01]`
                  : "border-border bg-card hover:border-border/70",
                disabled && "opacity-50 cursor-not-allowed"
              )}
              onClick={() => !disabled && onCategoryChange(category.id)}
              onMouseEnter={() => !disabled && setHoveredCategory(category.id)}
              onMouseLeave={() => setHoveredCategory(null)}
            >
              {isSelected && (
                <div className={cn(
                  "absolute inset-0 rounded-lg opacity-30",
                  `bg-gradient-to-br ${category.gradient}`
                )} />
              )}
              
              <div className="relative z-10 text-center">
                <div className={cn(
                  "w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center transition-colors",
                  isSelected 
                    ? `${category.bg} ${category.text}`
                    : "bg-muted text-muted-foreground"
                )}>
                  <Icon className="w-6 h-6" />
                </div>
                
                <h4 className={cn(
                  "font-semibold text-sm mb-1 transition-colors",
                  isSelected ? category.text : "text-foreground"
                )}>
                  {category.title}
                </h4>
                
                <p className="text-xs text-muted-foreground leading-tight">
                  {category.description}
                </p>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};