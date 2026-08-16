import dayjs from 'dayjs';
import { Camera } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Version } from '@/types/api';

interface VersionCardProps {
  version: Version;
  selected?: boolean;
  onSelect?: (version: Version) => void;
}

export default function VersionCard({
  version,
  selected,
  onSelect,
}: VersionCardProps) {
  return (
    <Card
      className={cn(
        'cursor-pointer transition-colors hover:bg-accent',
        selected && 'border-ring',
      )}
      onClick={() => onSelect?.(version)}
    >
      <CardContent className="p-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">v{version.version_no}</span>
          {version.is_snapshot && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs text-muted-foreground">
              <Camera className="h-3 w-3" />
              {version.snapshot_name || '快照'}
            </span>
          )}
          <span className="ml-auto text-xs text-muted-foreground">
            {dayjs(version.created_at).format('MM-DD HH:mm')}
          </span>
        </div>
        {version.request && (
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {version.request}
          </p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          {version.files.length} 个文件
        </p>
      </CardContent>
    </Card>
  );
}
