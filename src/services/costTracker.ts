// Cost Tracking Service
// Monitors Replicate API usage and costs

export interface ApiUsageRecord {
  timestamp: string;
  quality: 'basic' | 'premium' | 'ultra';
  scale: number;
  fileSizeMB: number;
  estimatedCost: number;
  userId?: string;
  planId?: string;
}

export interface CostSummary {
  totalCost: number;
  totalImages: number;
  averageCost: number;
  todayCost: number;
  thisMonthCost: number;
  breakdown: {
    basic: { count: number; cost: number };
    premium: { count: number; cost: number };
    ultra: { count: number; cost: number };
  };
}

// Storage key for usage records
const USAGE_STORAGE_KEY = 'api_usage_records';

// Cost per model (in EUR)
export const MODEL_COSTS = {
  basic: 0.003,     // Real-ESRGAN
  premium: 0.004,   // Waifu2x  
  ultra: 0.006,     // GFPGAN
};

// Get all usage records
export const getUsageRecords = (): ApiUsageRecord[] => {
  try {
    const stored = localStorage.getItem(USAGE_STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to load usage records:', error);
    return [];
  }
};

// Save usage records
const saveUsageRecords = (records: ApiUsageRecord[]): void => {
  try {
    localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(records));
  } catch (error) {
    console.error('Failed to save usage records:', error);
  }
};

// Record API usage
export const recordApiUsage = (
  quality: 'basic' | 'premium' | 'ultra',
  scale: number,
  fileSizeBytes: number,
  userId?: string,
  planId?: string
): void => {
  const record: ApiUsageRecord = {
    timestamp: new Date().toISOString(),
    quality,
    scale,
    fileSizeMB: fileSizeBytes / 1024 / 1024,
    estimatedCost: MODEL_COSTS[quality],
    userId,
    planId
  };

  const records = getUsageRecords();
  records.push(record);

  // Keep only last 1000 records to prevent storage bloat
  if (records.length > 1000) {
    records.splice(0, records.length - 1000);
  }

  saveUsageRecords(records);
  
  // Log to console for development
  console.log(`💰 API Cost Tracked:`, {
    quality,
    scale,
    cost: `€${record.estimatedCost.toFixed(3)}`,
    fileSize: `${record.fileSizeMB.toFixed(2)}MB`
  });
};

// Get cost summary
export const getCostSummary = (): CostSummary => {
  const records = getUsageRecords();
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  const summary: CostSummary = {
    totalCost: 0,
    totalImages: records.length,
    averageCost: 0,
    todayCost: 0,
    thisMonthCost: 0,
    breakdown: {
      basic: { count: 0, cost: 0 },
      premium: { count: 0, cost: 0 },
      ultra: { count: 0, cost: 0 }
    }
  };
  
  records.forEach(record => {
    const recordDate = new Date(record.timestamp);
    
    // Total costs
    summary.totalCost += record.estimatedCost;
    
    // Today's costs
    if (recordDate >= today) {
      summary.todayCost += record.estimatedCost;
    }
    
    // This month's costs
    if (recordDate >= thisMonth) {
      summary.thisMonthCost += record.estimatedCost;
    }
    
    // Quality breakdown
    summary.breakdown[record.quality].count += 1;
    summary.breakdown[record.quality].cost += record.estimatedCost;
  });
  
  summary.averageCost = summary.totalImages > 0 ? summary.totalCost / summary.totalImages : 0;
  
  return summary;
};

// Get usage for specific time period
export const getUsageByPeriod = (days: number): ApiUsageRecord[] => {
  const records = getUsageRecords();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  return records.filter(record => new Date(record.timestamp) >= cutoffDate);
};

// Clear old records (for maintenance)
export const clearOldRecords = (daysToKeep: number = 90): void => {
  const records = getUsageRecords();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  
  const filteredRecords = records.filter(record => 
    new Date(record.timestamp) >= cutoffDate
  );
  
  saveUsageRecords(filteredRecords);
  
  console.log(`🧹 Cleaned up ${records.length - filteredRecords.length} old usage records`);
};

// Export usage data (for admin purposes)
export const exportUsageData = (): string => {
  const records = getUsageRecords();
  const summary = getCostSummary();
  
  return JSON.stringify({
    summary,
    records,
    exportDate: new Date().toISOString()
  }, null, 2);
};

// Format cost for display
export const formatCost = (cost: number): string => {
  return `€${cost.toFixed(3)}`;
};

// Estimate cost for image processing
export const estimateProcessingCost = (
  quality: 'basic' | 'premium' | 'ultra',
  imageCount: number = 1
): number => {
  return MODEL_COSTS[quality] * imageCount;
};