import * as Collapsible from '@radix-ui/react-collapsible';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useSidebar } from './SidebarContext';
import NavigationItem from './NavigationItem';
import type { NavItem } from './navData';

interface NavigationGroupProps {
  group: string;
  items: NavItem[];
}

export default function NavigationGroup({ group, items }: NavigationGroupProps) {
  const { collapsed, expandedGroups, toggleGroup } = useSidebar();

  if (items.length === 0) return null;

  // Rail mode: no group chrome, just the icons with a thin divider
  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-1 py-1">
        {items.map((item) => (
          <NavigationItem key={item.name} item={item} />
        ))}
      </div>
    );
  }

  const isOpen = expandedGroups[group] ?? true;

  return (
    <Collapsible.Root open={isOpen} onOpenChange={() => toggleGroup(group)} className="space-y-1">
      <Collapsible.Trigger
        className={cn(
          'flex w-full items-center justify-between px-3 py-1.5',
          'text-[11px] font-semibold uppercase tracking-[0.12em] text-white/35',
          'transition-colors hover:text-white/60'
        )}
      >
        {group}
        <ChevronDown
          size={13}
          className={cn('transition-transform duration-200', isOpen ? '' : '-rotate-90')}
        />
      </Collapsible.Trigger>
      <Collapsible.Content className="sidebar-collapsible-content overflow-hidden">
        <div className="space-y-0.5">
          {items.map((item) => (
            <NavigationItem key={item.name} item={item} />
          ))}
        </div>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}
