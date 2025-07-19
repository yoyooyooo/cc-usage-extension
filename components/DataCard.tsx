import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DataCardItem } from '../types';
import { formatCurrency } from '../utils/api';

interface DataCardProps {
  item: DataCardItem;
  loading?: boolean;
}

export function DataCard({ item, loading = false }: DataCardProps) {
  const formatValue = (value: number | string) => {
    if (loading) return '...';
    if (typeof value === 'number') {
      return formatCurrency(value);
    }
    return String(value);
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">
          {item.label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900">
          {formatValue(item.value)}
        </div>
      </CardContent>
    </Card>
  );
}