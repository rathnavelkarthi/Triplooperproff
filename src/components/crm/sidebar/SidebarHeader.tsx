import { PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useSidebar } from './SidebarContext';
import WorkspaceSwitcher from './WorkspaceSwitcher';

interface SidebarHeaderProps {
  onAddProperty: () => void;
}

export default function SidebarHeader({ onAddProperty }: SidebarHeaderProps) {
  const { collapsed, toggleCollapsed, onClose } = useSidebar();

  return (
    <div className={cn('flex flex-col gap-2 px-3 pt-4 pb-2', collapsed && 'items-center')}>
      <div className={cn('flex items-center gap-2', collapsed ? 'flex-col' : 'w-full')}>
        <div className="min-w-0 flex-1">
          <WorkspaceSwitcher onAddProperty={onAddProperty} />
        </div>

        {/* Desktop collapse toggle */}
        <button
          onClick={toggleCollapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-[var(--sidebar-hover)] hover:text-white/80 lg:flex',
            collapsed && 'mt-1'
          )}
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>

        {/* Mobile close */}
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white/50 transition-colors hover:bg-[var(--sidebar-hover)] hover:text-white lg:hidden"
          >
            <X size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
