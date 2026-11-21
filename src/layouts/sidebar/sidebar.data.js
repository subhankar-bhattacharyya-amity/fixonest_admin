import {
  LayoutDashboard,
  Layers,
  Users,
  ShieldCheck,
  HardHat,
  UserRound,
  FolderTree,
  Tags,
  Newspaper,
  BookOpenText,
  CircleHelp,
  MessageSquareQuote,
  ClipboardList,
  UserCheck,
  UsersRound,
  Wrench,
  Star,
  MessageSquareText,
  CalendarCheck,
  CalendarRange,
  CalendarDays,
  FileText,
  Settings,
} from "lucide-react";
import { ROLES } from "@/features/auth/index.js";

// The whole sidebar, as one tree in display order. This is the only file to
// edit when adding, removing, or re-permissioning a menu item.
//
// Each node:
//   id        - required, unique across the whole tree (React key + which
//               accordions are open).
//   name      - label shown in the sidebar.
//   icon      - a lucide-react component (optional on nested items).
//   path      - leaf items only. Relative to the viewer's own dashboard path
//               (routes/constants.js's getDashboardPath); "" is the dashboard.
//   roles     - who sees it. Omit it on a nested item to inherit the parent's
//               roles; set it to narrow that item to a subset of them.
//   children  - makes the node an accordion. Nest as deep as needed.
//   placement - "bottom" pins a top-level item to the sidebar footer.
//
// An accordion left with no visible children for a role is hidden too, so a
// role never sees an empty group. The menu only decides what's shown - also
// wrap each page's route in a RoleGuard with the same roles (see
// pages/dashboard/dashboard.routes.jsx). Items whose page isn't built yet fall
// through to the catch-all route, which lands back on the dashboard.
const { SUPER_ADMIN, ADMIN, PROVIDER } = ROLES;
const ALL_ROLES = [SUPER_ADMIN, ADMIN, PROVIDER];
const MANAGEMENT_ROLES = [SUPER_ADMIN, ADMIN];

export const sidebarMenu = [
  {
    id: "dashboard",
    name: "Dashboard",
    icon: LayoutDashboard,
    path: "",
    roles: ALL_ROLES,
  },
  {
    id: "verticalManagement",
    name: "Vertical Management",
    icon: Layers,
    path: "verticals",
    roles: [SUPER_ADMIN],
  },
  {
    id: "userManagement",
    name: "User Management",
    icon: Users,
    roles: MANAGEMENT_ROLES,
    children: [
      {
        id: "adminManagement",
        name: "Admin Management",
        icon: ShieldCheck,
        path: "users/admins",
        // Vertical admins are created and managed by the Super Admin only.
        roles: [SUPER_ADMIN],
      },
      {
        id: "providerManagement",
        name: "Provider Management",
        icon: HardHat,
        path: "users/providers",
      },
      {
        id: "customerManagement",
        name: "Customer Management",
        icon: UserRound,
        path: "users/customers",
        // Customers are managed by the Super Admin only, for now.
        roles: [SUPER_ADMIN],
      },
    ],
  },
  {
    id: "categoryManagement",
    name: "Category Management",
    icon: FolderTree,
    roles: MANAGEMENT_ROLES,
    children: [
      {
        id: "serviceCategory",
        name: "Service Category",
        icon: Tags,
        path: "categories/services",
      },
      {
        id: "blogCategory",
        name: "Blog Category",
        icon: Newspaper,
        path: "categories/blogs",
        roles: [SUPER_ADMIN],
      },
    ],
  },
  {
    id: "assignmentManagement",
    name: "Assignment Management",
    icon: ClipboardList,
    roles: MANAGEMENT_ROLES,
    children: [
      {
        id: "providerAssignment",
        name: "Provider",
        icon: UserCheck,
        path: "assignments/providers",
      },
    ],
  },
  {
    id: "teamManagement",
    name: "Team Management",
    icon: UsersRound,
    path: "team",
    // The Super Admin manages the About page's "Meet the team" section.
    roles: [SUPER_ADMIN],
  },
  {
    id: "serviceManagement",
    name: "Service Management",
    icon: Wrench,
    path: "services",
    roles: MANAGEMENT_ROLES,
  },
  {
    // Every booking - all verticals for the Super Admin, their own vertical for
    // an Admin. Badge = bookings a provider rejected that need a new provider
    // (see Sidebar.jsx).
    id: "adminBookings",
    name: "Booking Management",
    icon: CalendarRange,
    path: "bookings",
    roles: MANAGEMENT_ROLES,
  },
  {
    // Customer reviews & ratings of services; an Admin only sees their vertical's.
    id: "reviewManagement",
    name: "Reviews & Ratings Management",
    icon: Star,
    path: "service-reviews",
    roles: MANAGEMENT_ROLES,
  },
  {
    id: "blogManagement",
    name: "Blog Management",
    icon: BookOpenText,
    path: "blogs",
    roles: MANAGEMENT_ROLES,
  },
  {
    id: "testimonialManagement",
    name: "Testimonial Management",
    icon: MessageSquareQuote,
    path: "testimonials",
    // The Super Admin picks the reviews shown on the customer site's Home page.
    roles: [SUPER_ADMIN],
  },
  {
    id: "faqManagement",
    name: "FAQ Management",
    icon: CircleHelp,
    path: "faqs",
    // The Super Admin writes the customer site's FAQs.
    roles: [SUPER_ADMIN],
  },
  {
    // The provider's month calendar: bookings per day (accept / reject from a
    // day's dialog) and time-off requests that an Admin / Super Admin approves.
    id: "bookingCalendar",
    name: "Booking Calendar",
    icon: CalendarDays,
    path: "booking-calendar",
    roles: [PROVIDER],
  },
  {
    // The provider's bookings (formerly "My Tasks" at /tasks, which redirects
    // here). Shows a badge with the number of new requests - see Sidebar.jsx.
    id: "myBookings",
    name: "My Bookings",
    icon: CalendarCheck,
    path: "bookings",
    roles: [PROVIDER],
  },
  {
    id: "reports",
    name: "Reports",
    icon: FileText,
    path: "reports",
    roles: [PROVIDER],
  },
  {
    id: "contact",
    name: "Contact Management",
    icon: MessageSquareText,
    path: "contacts",
    // A provider sees only the messages customers sent them.
    roles: ALL_ROLES,
  },
  {
    id: "settings",
    name: "Settings",
    icon: Settings,
    path: "settings",
    roles: ALL_ROLES,
    placement: "bottom",
  },
];
