import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { copyToClipboard } from '../utils/clipboard';

interface CopyButtonProps {
  text: string;
  className?: string;
  iconSize?: number;
}

const CopyButton: React.FC<CopyButtonProps> = ({ text, className = '', iconSize = 14 }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const success = await copyToClipboard(text);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center justify-center p-1.5 rounded-md transition-all duration-200 
        ${copied 
          ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
          : 'text-gray-400 hover:text-white hover:bg-gray-700 active:scale-95'
        } ${className}`}
      title={copied ? 'Copied!' : 'Copy to clipboard'}
      aria-label={copied ? 'Copied' : 'Copy to clipboard'}
    >
      <div className="relative w-4 h-4 flex items-center justify-center">
        {copied ? (
          <Check size={iconSize} className="animate-in fade-in zoom-in duration-200" />
        ) : (
          <Copy size={iconSize} className="animate-in fade-in zoom-in duration-200" />
        )}
      </div>
      {copied && (
        <span className="ml-1.5 text-[10px] font-medium animate-in slide-in-from-left-1 duration-200">
          Copied!
        </span>
      )}
    </button>
  );
};

export default CopyButton;
