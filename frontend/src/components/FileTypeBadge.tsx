import { FileText, File as LucideFile, Globe } from 'lucide-react';
import { FileType } from '@/types';
import { FILE_TYPE_CONFIG } from '@/lib/constants';

interface FileTypeBadgeProps {
  type: FileType;
}

export function FileTypeBadge({ type }: FileTypeBadgeProps) {
  const config = FILE_TYPE_CONFIG[type];
  
  const Icon = () => {
    switch(type) {
      case 'pdf': return <FileText className="w-3 h-3" />;
      case 'docx': return <LucideFile className="w-3 h-3" />;
      case 'web': return <Globe className="w-3 h-3" />;
    }
  };
  
  return (
    <span
      className={`flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium rounded ${config.bgLight} ${config.textLight} ${config.bgDark} ${config.textDark}`}
      data-testid={`file-badge-${type}`}
    >
      <Icon />
      {config.label}
    </span>
  );
}
