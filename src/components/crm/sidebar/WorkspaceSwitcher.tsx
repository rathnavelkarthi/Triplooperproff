import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Tooltip from '@radix-ui/react-tooltip';
import { Building2, Check, ChevronsUpDown, Plus } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useAuth } from '../../../context/AuthContext';
import { useSidebar } from './SidebarContext';
import { typeLabel, type BusinessType } from './navData';

interface WorkspaceSwitcherProps {
  onAddProperty: () => void;
}

export default function WorkspaceSwitcher({ onAddProperty }: WorkspaceSwitcherProps) {
  const { tenant, properties, switchProperty } = useAuth();
  const { collapsed } = useSidebar();

  const businessType = (tenant?.business_type || 'hotel') as BusinessType;

  const logo = (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--sidebar-accent)]/15">
      {tenant?.logo_url ? (
        <img src={tenant.logo_url} alt="" className="h-full w-full rounded-lg object-cover" />
      ) : (
        <Building2 size={16} className="text-[var(--sidebar-accent)]" />
      )}
    </div>
  );

  const trigger = (
    <DropdownMenu.Trigger
      className={cn(
        'group flex items-center rounded-[var(--sidebar-radius)] border border-[var(--sidebar-border)] bg-white/[0.04] transition-colors hover:bg-white/[0.07] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sidebar-accent)]/40',
        collapsed ? 'h-10 w-10 justify-center' : 'w-full gap-3 p-2.5'
      )}
    >
      {logo}
      {!collapsed && (
        <>
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-sm font-semibold text-white">{tenant?.business_name || 'Select property'}</p>
            <p className="text-[10px] uppercase tracking-[0.15em] text-[var(--sidebar-accent)]">
              {typeLabel[businessType] || 'Workspace'}
            </p>
          </div>
          <ChevronsUpDown size={14} className="text-white/40" />
        </>
      )}
    </DropdownMenu.Trigger>
  );

  return (
    <DropdownMenu.Root>
      {collapsed ? (
        <Tooltip.Root delayDuration={0}>
          <Tooltip.Trigger asChild>{trigger}</Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              side="right"
              sideOffset={8}
              className="sidebar-popper z-[60] rounded-md bg-[var(--sidebar-surface-raised)] px-2.5 py-1.5 text-xs font-medium text-white shadow-lg ring-1 ring-white/10"
            >
              {tenant?.business_name || 'Select property'}
              <Tooltip.Arrow className="fill-[var(--sidebar-surface-raised)]" />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      ) : (
        trigger
      )}

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          side={collapsed ? 'right' : 'bottom'}
          sideOffset={8}
          className="sidebar-popper z-[60] w-64 overflow-hidden rounded-xl border border-white/10 bg-[var(--sidebar-surface-raised)] p-1.5 shadow-2xl"
        >
          <div className="max-h-[260px] overflow-y-auto">
            {properties.map((prop) => {
              const active = prop.id === tenant?.id;
              return (
                <DropdownMenu.Item
                  key={prop.id}
                  onSelect={() => switchProperty(prop.id)}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-left outline-none transition-colors',
                    active ? 'bg-white/[0.06]' : 'hover:bg-white/[0.05] focus:bg-white/[0.05]'
                  )}
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/5">
                    <span className="text-xs font-bold text-[var(--sidebar-accent)]">
                      {prop.business_name.charAt(0)}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-white">{prop.business_name}</p>
                    <p className="text-[10px] uppercase tracking-wider text-white/30">
                      {typeLabel[prop.business_type as BusinessType]}
                    </p>
                  </div>
                  {active && <Check size={14} className="shrink-0 text-[var(--sidebar-accent)]" />}
                </DropdownMenu.Item>
              );
            })}
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-white/5" />
          <DropdownMenu.Item
            onSelect={onAddProperty}
            className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-white/50 outline-none transition-colors hover:bg-white/[0.05] hover:text-white focus:bg-white/[0.05] focus:text-white"
          >
            <Plus size={14} />
            Add property
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
