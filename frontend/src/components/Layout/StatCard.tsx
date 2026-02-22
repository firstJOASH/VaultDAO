import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  variant?: 'primary' | 'success' | 'warning' | 'danger';
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend,
  variant = 'primary' 
}) => {
  // Mapping variants to specific background colors
  const variantClasses = {
    primary: 'bg-primary text-accent',
    success: 'bg-green-500/10 text-green-500',
    warning: 'bg-yellow-500/10 text-yellow-500',
    danger: 'bg-red-500/10 text-red-500',
  };

  return (
    <div className="bg-secondary p-6 rounded-xl border border-gray-800 shadow-lg hover:border-gray-700 transition-colors">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">
            {title}
          </p>
          <h3 className="text-white text-3xl font-bold mt-1">
            {value}
          </h3>
        </div>
        {Icon && (
          <div className={`p-2 rounded-lg ${variantClasses[variant]}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
      
      <div className="mt-2">
        {subtitle && (
          <p className="text-gray-500 text-sm">
            {subtitle}
          </p>
        )}
        {trend && (
          <p className={`text-sm font-medium ${trend.isPositive ? 'text-green-500' : 'text-red-500'}`}>
            {trend.isPositive ? '↑' : '↓'} {trend.value} from last week
          </p>
        )}
      </div>
    </div>
  );
};

export default StatCard;