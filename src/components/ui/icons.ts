/**
 * The project's icon set — the one place that imports `lucide-react` (enforced by ESLint).
 * Swap the whole set by editing the right-hand sides below; add custom inline-SVG or
 * image-backed icons as plain components here so they are first-class entries.
 * Names are semantic (what the icon means), except geometric/directional glyphs.
 */
export {
  // Navigation & layout
  LayoutDashboardIcon as Dashboard,
  PackageIcon as Package,
  LogOutIcon as SignOut,
  LayersIcon as Logo,
  PanelLeftCloseIcon as SidebarCollapse,
  PanelLeftOpenIcon as SidebarExpand,
  LanguagesIcon as Language,
  MenuIcon as Menu,
  // Status & feedback
  RotateCwIcon as Retry,
  TriangleAlertIcon as Warning,
  SearchXIcon as NoResults,
  InboxIcon as Empty,
  ShieldXIcon as Forbidden,
  WifiOffIcon as Offline,
  Loader2Icon as Spinner,
  CircleCheckIcon as Success,
  InfoIcon as Info,
  OctagonXIcon as Error,
  // Actions
  PlusIcon as Add,
  PencilIcon as Edit,
  DownloadIcon as Export,
  Trash2Icon as Delete,
  CopyIcon as Copy,
  CheckIcon as Check,
  XIcon as Close,
  SearchIcon as Search,
  CalendarIcon as Calendar,
  // Theme
  SunIcon as ThemeLight,
  MoonIcon as ThemeDark,
  MonitorIcon as ThemeSystem,
  // Directional / geometric (kept geometric on purpose)
  ChevronUpIcon as ChevronUp,
  ChevronDownIcon as ChevronDown,
  ChevronLeftIcon as ChevronLeft,
  ChevronRightIcon as ChevronRight,
  ChevronsLeftIcon as ChevronsLeft,
  ChevronsRightIcon as ChevronsRight,
  ChevronsUpDownIcon as ChevronsUpDown,
  ArrowUpIcon as ArrowUp,
  ArrowDownIcon as ArrowDown,
  MoreHorizontalIcon as More,
  CircleIcon as Dot,
} from 'lucide-react';

export { Icon } from './icon';
export type { IconComponent } from './icon';
