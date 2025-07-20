import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { TrendingUp } from 'lucide-react';

interface RateFeatureToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export function RateFeatureToggle({ enabled, onToggle }: RateFeatureToggleProps) {
  return (
    <div className="flex items-center space-x-2 p-2 bg-gray-700 rounded">
      <TrendingUp className="w-4 h-4 text-blue-400" />
      <Label htmlFor="rate-toggle" className="text-sm text-gray-300 cursor-pointer">
        显示消费速率
      </Label>
      <Switch
        id="rate-toggle"
        checked={enabled}
        onCheckedChange={onToggle}
        className="data-[state=checked]:bg-blue-600"
      />
    </div>
  );
}