'use client';

import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuthContext } from '@/components/providers';
import {
  LayoutDashboard,
  Users,
  Phone,
  FileText,
  MessageCircle,
  Inbox,
  BarChart3,
  Building2,
  UserCog,
  LogOut,
  Route,
  MessageSquare,
  Megaphone,
  Shield,
  Menu,
  X,
  Building,
  User,
  Car,
  MapPin,
  ChevronDown,
  Plane,
  BookOpen,
  Image as ImageIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useState, useCallback } from 'react';
import { hasPermission, roleLabel, type FeatureKey } from '@/lib/permissions';

/**
 * Sidebar entries are keyed to a feature permission rather than a role, so an
 * admin controls exactly what each staff member sees by granting features on
 * the Staff page. ADMIN implicitly holds every feature.
 */
type NavItem = {
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
  /** Omitted for pages open to every signed-in user, such as the guide. */
  permission?: FeatureKey;
};

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, permission: 'dashboard' },
  { name: 'Leads', href: '/leads', icon: Users, permission: 'leads' },
  { name: 'Follow-ups', href: '/followups', icon: Phone, permission: 'followups' },
  {
    name: 'Confirmed Clients',
    href: '/booked-clients',
    icon: Shield,
    permission: 'booked_clients',
  },
  { name: 'Itineraries', href: '/itineraries', icon: FileText, permission: 'itineraries' },
  {
    name: 'Templates',
    href: '/itineraries/templates',
    icon: FileText,
    permission: 'itinerary_templates',
  },
  {
    name: 'Edit PDF',
    href: '/itineraries/pdf-settings',
    icon: ImageIcon,
    permission: 'pdf_settings',
  },
  { name: 'Trips', href: '/trips', icon: Plane, permission: 'trips' },
  { name: 'Hotels', href: '/hotels', icon: Building, permission: 'hotels' },
  { name: 'Vehicles', href: '/vehicles', icon: Car, permission: 'vehicles' },
  { name: 'Destinations', href: '/destinations', icon: MapPin, permission: 'destinations' },
  { name: 'WhatsApp', href: '/whatsapp', icon: MessageCircle, permission: 'whatsapp' },
  { name: 'All WhatsApp', href: '/admin/all-whatsapp', icon: Inbox, permission: 'whatsapp_all' },
  { name: 'Connected Apps', href: '/ad-campaigns', icon: Megaphone, permission: 'ad_campaigns' },
  { name: 'Analytics', href: '/analytics', icon: BarChart3, permission: 'analytics' },
  { name: 'Performance', href: '/performance', icon: BarChart3, permission: 'performance' },
  { name: 'Branches', href: '/branches', icon: Building2, permission: 'branches' },
  { name: 'Users', href: '/users', icon: UserCog, permission: 'users' },
  {
    name: 'Assignment Rules',
    href: '/settings/assignment-rules',
    icon: Route,
    permission: 'assignment_rules',
  },
  {
    name: 'Message Templates',
    href: '/settings/whatsapp-templates',
    icon: MessageSquare,
    permission: 'whatsapp_templates',
  },
  { name: 'Audit Logs', href: '/audit', icon: Shield, permission: 'audit_logs' },
  // No permission: whoever just lost a page is exactly who needs to read this.
  { name: 'Guide', href: '/guide', icon: BookOpen },
];

export function Sidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthContext();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const isDesktop = () => typeof window !== 'undefined' && window.innerWidth >= 1024;

  const handleNavClick = useCallback(
    (href: string) => {
      setIsMobileOpen(false);
      router.push(href);
    },
    [router]
  );

  const filteredNav = navigation.filter(
    item => !item.permission || hasPermission(user, item.permission)
  );
  const getInitials = (name: string) =>
    name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  const sidebarContent = (
    <>
      {/* Header */}
      <div
        className={cn(
          'relative flex h-[88px] items-end justify-end p-0.5 bg-sidebar border-b border-sidebar-border shrink-0',
          isCollapsed && 'lg:h-16 lg:items-center lg:justify-center lg:p-0'
        )}
      >
        {/* Brand name */}
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center text-xl font-bold tracking-tight text-primary',
            isCollapsed && 'lg:hidden'
          )}
        >
          Claids Travel
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (isDesktop()) {
              setIsCollapsed(prev => !prev);
            } else {
              setIsMobileOpen(prev => !prev);
            }
          }}
          className={cn(
            'relative z-10 h-7 w-7 text-sidebar-foreground/90 hover:text-sidebar-foreground hover:bg-sidebar-accent cursor-pointer',
            isCollapsed && 'lg:h-8 lg:w-8'
          )}
        >
          {isMobileOpen ? (
            <X className="h-4 w-4" />
          ) : isCollapsed ? (
            <Menu className="h-4 w-4" />
          ) : (
            <X className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-1 px-2">
          {filteredNav.map(item => {
            // Exact match: only highlight when pathname exactly equals href (not children)
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <button
                key={item.name}
                onClick={() => handleNavClick(item.href)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium tracking-wide transition-all duration-200 group relative',
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-brand'
                    : 'text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-sidebar-foreground',
                  isCollapsed && 'lg:justify-center lg:px-2'
                )}
              >
                <Icon
                  className={cn(
                    'h-5 w-5 shrink-0',
                    isActive
                      ? 'text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground/70 group-hover:text-sidebar-foreground'
                  )}
                />
                <span className={cn('truncate', isCollapsed && 'lg:hidden')}>{item.name}</span>
              </button>
            );
          })}
        </nav>
      </ScrollArea>

      <Separator className="bg-sidebar-border" />

      {/* Profile - Popover Menu */}
      <div
        className={cn(
          'p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shrink-0',
          isCollapsed && 'lg:p-2'
        )}
      >
        <Popover>
          <PopoverTrigger asChild>
            <button
              className={cn(
                'flex items-center gap-3 rounded-lg p-2 w-full hover:bg-sidebar-accent transition-colors cursor-pointer',
                isCollapsed && 'lg:justify-center'
              )}
            >
              <Avatar className="h-9 w-9 shrink-0 ring-2 ring-sidebar-primary/60">
                {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" />}
                <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground">
                  {user?.name ? getInitials(user.name) : '?'}
                </AvatarFallback>
              </Avatar>
              <div className={cn('flex-1 overflow-hidden text-left', isCollapsed && 'lg:hidden')}>
                <p className="truncate text-sm font-medium text-sidebar-foreground">{user?.name}</p>
                <p className="text-xs text-sidebar-foreground/80">{roleLabel(user?.role)}</p>
              </div>
              <ChevronDown
                className={cn(
                  'h-4 w-4 text-sidebar-foreground/80 shrink-0',
                  isCollapsed && 'lg:hidden'
                )}
              />
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-56 p-1 bg-white shadow-lg border rounded-xl z-70"
            align="start"
            side="top"
          >
            <div className="px-3 py-2 border-b mb-1">
              <p className="font-medium text-sm text-foreground truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              <Badge variant="outline" className="mt-1 text-xs">
                {roleLabel(user?.role)}
              </Badge>
            </div>
            <button
              onClick={() => router.push('/profile')}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer"
            >
              <User className="h-4 w-4 text-muted-foreground" />
              My Profile
            </button>
            <button
              onClick={logout}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </PopoverContent>
        </Popover>
      </div>
    </>
  );

  return (
    <div className="flex h-dvh overflow-hidden">
      {/* Mobile Toggle Button */}
      {!isMobileOpen && (
        <Button
          variant="outline"
          size="icon"
          className="fixed top-4 left-4 z-50 shadow-brand lg:hidden"
          onClick={() => setIsMobileOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}

      {/* Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-60 flex h-dvh w-72 flex-col border-r border-sidebar-border bg-sidebar shadow-brand-xl transition-transform duration-300 lg:hidden',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {sidebarContent}
      </aside>

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden lg:flex lg:z-60 h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300',
          isCollapsed ? 'w-16' : 'w-64'
        )}
      >
        {sidebarContent}
      </aside>

      {/* Main Content */}
      <main className="relative flex-1 overflow-auto pt-16 p-4 sm:pt-6 lg:pt-5 lg:p-10">
        {children}
      </main>
    </div>
  );
}
