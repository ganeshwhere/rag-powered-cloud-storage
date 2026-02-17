"use client"

import * as React from "react"
import {
  FileText,
  Search,
  BarChart3,
  Settings,
  HelpCircle,
  Home,
  Upload,
} from "lucide-react"

import { NavMain } from "@/shared/components/nav-main"
import { NavProjects } from "@/shared/components/nav-projects"
import { NavUser } from "@/shared/components/nav-user"
import { TeamSwitcher } from "@/shared/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/shared/components/ui/sidebar"

// Dashboard navigation data
const data = {
  user: {
    name: "User",
    email: "user@example.com",
    avatar: "/avatars/user.jpg",
  },
  teams: [
    {
      name: "RAG PCS",
      logo: FileText,
      plan: "Pro",
    },
  ],
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: Home,
      isActive: true,
    },
    {
      title: "Documents",
      url: "/dashboard/documents",
      icon: FileText,
    },
    {
      title: "Search",
      url: "/dashboard/search",
      icon: Search,
    },
    {
      title: "Analytics",
      url: "/dashboard/analytics",
      icon: BarChart3,
    },
    {
      title: "Settings",
      url: "/dashboard/settings",
      icon: Settings,
    },
    {
      title: "Help",
      url: "/dashboard/help",
      icon: HelpCircle,
    },
  ],
  projects: [
    {
      name: "Recent Documents",
      url: "/dashboard/documents",
      icon: FileText,
    },
    {
      name: "Quick Upload",
      url: "/dashboard/documents?upload=true",
      icon: Upload,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
