import React from 'react';

export type ProposalStatus = 'Pending' | 'Approved' | 'Rejected' | 'Executed' | 'Expired';

interface StatusBadgeProps {
  status: ProposalStatus;
  className?: string;
}

const colorMap: Record<ProposalStatus, string> = {
  Pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  Approved: 'bg-green-500/10 text-green-400 border-green-500/20',
  Rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
  Executed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Expired: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-medium border ${colorMap[status]} ${className} transition-colors duration-200`}
    >
      {status}
    </span>
  );
};

export default StatusBadge;
