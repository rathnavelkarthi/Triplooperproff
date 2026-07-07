import { NavLink } from 'react-router-dom';
import { motion } from 'motion/react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { cn } from '../../../lib/utils';
import { useSidebar } from './SidebarContext';
import type { NavItem } from './navData';

function ActiveIndicator() {
  return (
    <motion.div
      layoutId="active-sidebar-indicator"
      className="absolute left-0 top-1/4 bottom-1/4 w-[3px] rounded-r-md bg-[var(--sidebar-accent)] shadow-[0_0_12px_rgba(201,166,70,0.7)]"
      transition={{ type: 'spring', stiffness: 320, damping: 30 }}
    />
  );
}

interface NavigationItemProps {
  item: NavItem;
  key?: any;
}

export default function NavigationItem({ item }: NavigationItemProps) {
  const { collapsed, onClose } = useSidebar();
  const Icon = item.icon;

  const link = (
    <NavLink
      to={item.path}
      onClick={onClose}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center rounded-[var(--sidebar-radius)] font-medium transition-colors duration-200',
          collapsed ? 'h-10 w-10 justify-center mx-auto' : 'h-10 gap-3 px-3',
          isActive
            ? 'bg-[var(--sidebar-active)] text-white'
            : 'text-white/55 hover:bg-[var(--sidebar-hover)] hover:text-white/90'
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && !collapsed && <ActiveIndicator />}
          <Icon
            size={18}
            className={cn(
              'shrink-0 transition-colors duration-200',
              isActive ? 'text-[var(--sidebar-accent)]' : 'text-white/45 group-hover:text-white/80'
            )}
          />
          {!collapsed && <span className="flex-1 truncate text-[13px] tracking-wide">{item.name}</span>}
        </>
      )}
    </NavLink>
  );

  if (!collapsed) return link;

  // Rail mode: wrap in a tooltip that reveals the label
  return (
    <Tooltip.Root delayDuration={0}>
      <Tooltip.Trigger asChild>{link}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="right"
          sideOffset={8}
          className="sidebar-popper z-[60] rounded-md bg-[var(--sidebar-surface-raised)] px-2.5 py-1.5 text-xs font-medium text-white shadow-lg ring-1 ring-white/10"
        >
          {item.name}
          <Tooltip.Arrow className="fill-[var(--sidebar-surface-raised)]" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
