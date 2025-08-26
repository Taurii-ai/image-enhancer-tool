import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getCostSummary, formatCost, exportUsageData, clearOldRecords, CostSummary } from '@/services/costTracker';
import { DollarSign, Download, Trash2, TrendingUp, Image } from 'lucide-react';

export const CostMonitor = () => {
  const [summary, setSummary] = useState<CostSummary | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    loadCostSummary();
  }, []);

  const loadCostSummary = () => {
    setSummary(getCostSummary());
  };

  const handleExportData = () => {
    setIsExporting(true);
    try {
      const data = exportUsageData();
      const blob = new Blob([data], { type: 'application/json' });
      const downloadUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `api-usage-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearOldRecords = () => {
    clearOldRecords(90);
    loadCostSummary();
  };

  if (!summary) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">API Cost Monitor</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportData}
            disabled={isExporting}
          >
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearOldRecords}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clean Old Records
          </Button>
        </div>
      </div>

      {/* Cost Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Total Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCost(summary.totalCost)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Image className="w-4 h-4" />
              Total Images
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {summary.totalImages}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Avg Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">
              {formatCost(summary.averageCost)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCost(summary.thisMonthCost)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quality Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Usage by Quality Level</CardTitle>
          <CardDescription>
            Breakdown of API usage by enhancement quality
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(summary.breakdown).map(([quality, data]) => (
              <div key={quality} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    quality === 'basic' ? 'bg-blue-500' :
                    quality === 'premium' ? 'bg-purple-500' : 'bg-gold-500'
                  }`} />
                  <div>
                    <div className="font-medium capitalize">{quality} Quality</div>
                    <div className="text-sm text-muted-foreground">
                      {data.count} images processed
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold">{formatCost(data.cost)}</div>
                  <div className="text-sm text-muted-foreground">
                    {data.count > 0 ? formatCost(data.cost / data.count) : '€0.000'} avg
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cost Efficiency Tips */}
      <Card>
        <CardHeader>
          <CardTitle>💡 Cost Optimization Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p>• <strong>Basic Quality (€0.003)</strong>: Best for general upscaling, most cost-effective</p>
            <p>• <strong>Premium Quality (€0.004)</strong>: Good balance of quality and cost for photos</p>
            <p>• <strong>Ultra Quality (€0.006)</strong>: Highest quality for professional work</p>
            <p>• Images are automatically optimized to max 2048px to reduce processing costs</p>
            <p>• Current total monthly cost: <strong>{formatCost(summary.thisMonthCost)}</strong></p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};