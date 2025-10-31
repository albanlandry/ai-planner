"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Calendar as CalendarIcon, 
  CheckSquare, 
  Settings, 
  Users, 
  Bell,
  FileText,
  ChevronRight,
  MessageSquare
} from "lucide-react";

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  badge?: number;
}

interface MainNavigationProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  pendingTaskCount?: number;
}

export default function MainNavigation({ collapsed = false, onToggleCollapse, pendingTaskCount = 0 }: MainNavigationProps) {
  const pathname = usePathname();

  const navItems: NavItem[] = [
        { id: 'calendar', label: 'Calendar', icon: CalendarIcon, href: '/calendar' },
        { id: 'ai', label: 'AI Assistant', icon: MessageSquare, href: '/ai' },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare, href: '/tasks', badge: pendingTaskCount > 0 ? pendingTaskCount : undefined },
    { id: 'teams', label: 'Teams', icon: Users, href: '/teams' },
    { id: 'notifications', label: 'Notifications', icon: Bell, href: '/notifications', badge: 5 },
    { id: 'notes', label: 'Notes', icon: FileText, href: '/notes' },
    { id: 'settings', label: 'Settings', icon: Settings, href: '/settings' },
  ];

  const isActive = (href: string) => {
    if (href === '/calendar') {
      return pathname === '/calendar' || pathname === '/';
    }
    return pathname?.startsWith(href);
  };

  const showExpanded = !collapsed;

  return (
    <nav 
      className={`bg-white border-r border-gray-200 transition-all duration-300 ${
        showExpanded ? 'w-64' : 'w-16'
      } flex flex-col h-full shadow-sm`}
    >
      {/* Logo/Brand */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
        {showExpanded ? (
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-blue-600" />
            <span className="font-bold text-lg text-gray-900">AI Planner</span>
          </div>
        ) : (
          <CalendarIcon className="w-6 h-6 text-blue-600 mx-auto" />
        )}
        {showExpanded && onToggleCollapse ? (
          <button
            onClick={onToggleCollapse}
            className="p-1 hover:bg-gray-200 rounded transition"
            title="Collapse sidebar"
          >
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
        ) : !showExpanded && onToggleCollapse ? (
          <button
            onClick={onToggleCollapse}
            className="p-1 hover:bg-gray-200 rounded transition mx-auto"
            title="Expand sidebar"
          >
            <ChevronRight className="w-4 h-4 text-gray-600 rotate-180" />
          </button>
        ) : null}
      </div>

      {/* Navigation Items */}
      <div className="flex-1 overflow-y-auto py-4">
        <div className="space-y-1 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group ${
                  active
                    ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
                title={!showExpanded ? item.label : undefined}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-blue-600' : 'text-gray-500 group-hover:text-gray-700'}`} />
                {showExpanded && (
                  <>
                    <span className="flex-1 text-sm font-medium">{item.label}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="bg-blue-600 text-white text-xs font-semibold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </Link>
            );
          })}
        </div>

        {/* Divider */}
        {showExpanded && (
          <div className="px-4 py-2 mt-4">
            <div className="border-t border-gray-200"></div>
          </div>
        )}

        {/* Quick Actions Section */}
        {showExpanded && (
          <div className="px-2 mt-4">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-2">
              Quick Actions
            </div>
            <Link
              href="/calendar?action=new-event"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition"
            >
              <CalendarIcon className="w-5 h-5 text-gray-500" />
              <span className="text-sm font-medium">New Event</span>
            </Link>
            <Link
              href="/tasks?action=new"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition"
            >
              <CheckSquare className="w-5 h-5 text-gray-500" />
              <span className="text-sm font-medium">New Task</span>
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
