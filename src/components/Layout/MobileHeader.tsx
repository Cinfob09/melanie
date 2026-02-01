import React from 'react';
import { Menu } from 'lucide-react';

interface MobileHeaderProps {
  onMenuToggle: () => void;
  title: string;
}

const MobileHeader: React.FC<MobileHeaderProps> = ({ onMenuToggle, title }) => {
  return (
    <div className="lg:hidden bg-white shadow-sm border-b border-gray-200 px-4 py-4 flex items-center justify-between sticky top-0 z-30">
      <button
        onClick={onMenuToggle}
        className="p-3 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 touch-manipulation active:bg-gray-200 transition-colors"
      >
        <Menu className="h-6 w-6" />
      </button>
      <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
      <div className="w-12"></div> {/* Spacer for centering */}
    </div>
  );
};

export default MobileHeader;