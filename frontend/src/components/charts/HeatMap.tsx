import React from 'react';
import type { SignerActivityCell } from '../../types/analytics';

export interface HeatMapProps {
  data: SignerActivityCell[];
  height?: number;
  title?: string;
}

function truncate(s: string, len: number): string {
  if (!s || s.length <= len) return s;
  return `${s.slice(0, len - 3)}...`;
}

const HeatMap: React.FC<HeatMapProps> = ({ data, height = 280, title }) => {
  const signers = Array.from(new Set(data.map((d) => d.signer))).slice(0, 8);
  const periods = Array.from(new Set(data.map((d) => d.period))).sort().slice(-14);
  const map = new Map<string, number>();
  data.forEach((d) => map.set(`${d.signer}|${d.period}`, d.count));
  const max = Math.max(1, ...data.map((d) => d.count));

  const getColor = (count: number) => {
    if (count === 0) return 'bg-gray-800';
    const p = count / max;
    if (p <= 0.25) return 'bg-purple-900';
    if (p <= 0.5) return 'bg-purple-600';
    if (p <= 0.75) return 'bg-purple-500';
    return 'bg-purple-400';
  };

  if (signers.length === 0 || periods.length === 0) {
    return (
      <div className="w-full flex items-center justify-center rounded-lg border border-gray-700 bg-gray-800/50 p-8" style={{ minHeight: height }}>
        <p className="text-gray-500 text-sm">No signer activity in this range</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto" style={{ minHeight: height }}>
      {title && (
        <h3 className="text-sm font-medium text-gray-300 mb-2">{title}</h3>
      )}
      <div className="inline-block min-w-full">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="text-left text-gray-500 font-medium p-2 sticky left-0 bg-gray-800 z-10 w-24">
                Signer
              </th>
              {periods.map((p) => (
                <th
                  key={p}
                  className="text-gray-500 font-medium p-1 text-center min-w-[2rem]"
                >
                  {p.length > 10 ? truncate(p, 7) : p}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {signers.map((signer) => (
              <tr key={signer}>
                <td
                  className="p-2 text-gray-400 truncate max-w-[6rem] sticky left-0 bg-gray-800 border-r border-gray-700"
                  title={signer}
                >
                  {truncate(signer, 10)}
                </td>
                {periods.map((period) => {
                  const count = map.get(`${signer}|${period}`) ?? 0;
                  return (
                    <td key={period} className="p-0.5">
                      <div
                        className={`h-6 rounded ${getColor(count)} flex items-center justify-center text-gray-200`}
                        title={`${truncate(signer, 12)} / ${period}: ${count} approvals`}
                      >
                        {count > 0 ? count : ''}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HeatMap;
