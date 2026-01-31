import * as React from "react";
import { Link, useLocation, useParams } from "@tanstack/react-router";
import {
  ChevronsLeft,
  ChevronsRight,
  Inbox,
  Calendar,
  Settings,
  Layers,
  Clock,
  Command,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: number | string;
  match?: string; // regex or substring to match active state
}

export function FloatingNav() {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const params = useParams({ from: "/$workspace" }) as { workspace: string };
  const workspace = params.workspace || "default";
  const location = useLocation();

  const { data: session, isPending } = authClient.useSession();

  const navItems: NavItem[] = [
    {
      title: "Timeline",
      href: `/${workspace}/timeline`,
      icon: Clock,
    },
    {
      title: "Calendar",
      href: `/${workspace}/calendar`,
      icon: Calendar,
    },
    {
      title: "Inbox",
      href: `/${workspace}/inbox`,
      icon: Inbox,
      badge: 3, // Mock badge
    },
    {
      title: "Projects",
      href: `/${workspace}/projects`,
      icon: Layers,
    },
    {
      title: "Settings",
      href: `/${workspace}/settings`,
      icon: Settings,
    },
  ];

  // Toggle function
  const toggle = () => setIsExpanded(!isExpanded);

  const handleSignIn = async () => {
    await authClient.signIn.social({
      provider: "github",
      callbackURL: window.location.href, // Redirect back to current page
    });
  };

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "fixed left-4 top-6 z-40 flex flex-col gap-1 rounded-2xl border bg-background/80 backdrop-blur-md shadow-lg transition-all duration-300 ease-in-out",
          isExpanded ? "w-64 p-3" : "w-14 items-center py-3 px-0",
        )}
        style={{ height: "fit-content", maxHeight: "calc(100vh - 32px)" }}
      >
        {/* Workspace Switcher */}
        <WorkspaceSwitcher isExpanded={isExpanded} workspaceName={workspace} />

        {/* Navigation Items */}
        <nav className={cn("flex flex-col gap-1 mt-2", isExpanded ? "w-full" : "items-center")}>
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.href);
            return (
              <Tooltip key={item.href} disableHoverableContent={true}>
                <TooltipTrigger asChild>
                  <Link
                    to={item.href}
                    className={cn(
                      "group flex items-center gap-3 rounded-lg px-2 py-1 text-sm font-medium transition-colors hover:bg-accent/50 hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground",
                      !isExpanded && "justify-center px-0 w-9 py-2",
                    )}
                  >
                    <item.icon
                      className={cn("shrink-0 transition-all", isExpanded ? "h-4 w-4" : "h-5 w-5")}
                    />

                    {isExpanded && (
                      <span className="flex-1 truncate transition-all duration-300 animate-in fade-in slide-in-from-left-2">
                        {item.title}
                      </span>
                    )}

                    {isExpanded && item.badge && (
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                        {item.badge}
                      </span>
                    )}

                    {/* Collapsed Badge Dot */}
                    {!isExpanded && item.badge && (
                      <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
                    )}
                  </Link>
                </TooltipTrigger>
                {!isExpanded && (
                  <TooltipContent side="right" className="flex items-center gap-2">
                    {item.title}
                    {item.badge && (
                      <span className="ml-auto text-xs text-muted-foreground">({item.badge})</span>
                    )}
                  </TooltipContent>
                )}
              </Tooltip>
            );
          })}

          {/* Cmd+K Button - styled like other nav items */}
          <Tooltip disableHoverableContent={true}>
            <TooltipTrigger asChild>
              <button
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-2 py-1 text-sm font-medium transition-colors hover:bg-accent/50 hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring w-full",
                  !isExpanded && "justify-center px-0 w-9 h-9",
                  "text-muted-foreground",
                )}
                // onClick={() => toggleCommandPalette()} // Add your command palette toggle logic here
              >
                <Command
                  className={cn("shrink-0 transition-all", isExpanded ? "h-4 w-4" : "h-5 w-5")}
                />
                {isExpanded && (
                  <span className="flex-1 text-left truncate transition-all duration-300 animate-in fade-in slide-in-from-left-2">
                    Cmd+K
                  </span>
                )}
              </button>
            </TooltipTrigger>
            {!isExpanded && <TooltipContent side="right">Command Menu</TooltipContent>}
          </Tooltip>
        </nav>

        {/* Spacer to push user profile to bottom */}
        <div className="flex-1" />

        {/* User Profile / Sign In */}
        <div
          className={cn(
            "mt-auto flex flex-col gap-2 pt-2 border-t border-border/40",
            isExpanded ? "items-stretch" : "items-center",
          )}
        >
          {isPending ? (
            <div
              className={cn(
                "flex items-center gap-2 px-2 py-1",
                !isExpanded && "justify-center px-0",
              )}
            >
              <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
              {isExpanded && <div className="h-4 w-24 rounded bg-muted animate-pulse" />}
            </div>
          ) : session ? (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "h-auto p-1.5 hover:bg-accent hover:text-accent-foreground w-full",
                    isExpanded
                      ? "justify-start gap-3 px-2"
                      : "justify-center w-9 h-9 px-0 rounded-full",
                  )}
                >
                  <Avatar className="h-6 w-6 rounded-full border border-border/50">
                    <AvatarFallback className="text-[10px]">
                      {session.user.name?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                    {/* user image if available */}
                  </Avatar>
                  {isExpanded && (
                    <div className="flex flex-1 flex-col items-start overflow-hidden text-left transition-all duration-300 animate-in fade-in">
                      <span className="text-xs font-semibold leading-tight truncate w-full">
                        {session.user.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground truncate w-full">
                        {session.user.email}
                      </span>
                    </div>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent side="right" className="w-56 p-2">
                <div className="flex flex-col gap-1">
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    {session.user.email}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-start h-8 px-2 text-xs"
                    onClick={() => authClient.signOut()}
                  >
                    Sign out
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          ) : (
            <Tooltip disableHoverableContent={true}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  onClick={handleSignIn}
                  className={cn(
                    "h-auto p-1.5 hover:bg-accent hover:text-accent-foreground w-full",
                    isExpanded ? "justify-start gap-3 px-2" : "justify-center w-9 h-9 px-0",
                  )}
                >
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-xs shadow-sm">
                    ?
                  </div>
                  {isExpanded && (
                    <span className="text-xs font-semibold leading-tight truncate">Sign In</span>
                  )}
                </Button>
              </TooltipTrigger>
              {!isExpanded && <TooltipContent side="right">Sign In</TooltipContent>}
            </Tooltip>
          )}

          {/* Collapse Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-6 w-full text-muted-foreground hover:text-foreground mt-1",
              !isExpanded && "h-6 w-6 rounded-full",
              isExpanded && "justify-end pr-2 hover:bg-transparent",
            )}
            onClick={toggle}
          >
            {isExpanded ? (
              <ChevronsLeft className="h-4 w-4" />
            ) : (
              <ChevronsRight className="h-4 w-4" />
            )}
            <span className="sr-only">Toggle Sidebar</span>
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  );
}

function WorkspaceSwitcher({
  isExpanded,
  workspaceName,
}: {
  isExpanded: boolean;
  workspaceName: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "h-auto p-1.5 hover:bg-accent hover:text-accent-foreground",
            isExpanded ? "justify-start w-full gap-3 px-2" : "justify-center w-10 h-10 rounded-xl",
          )}
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-xs uppercase shadow-sm">
            {workspaceName.substring(0, 2)}
          </div>
          {isExpanded && (
            <div className="flex flex-1 flex-col items-start overflow-hidden text-left transition-all duration-300 animate-in fade-in">
              <span className="text-sm font-semibold leading-tight truncate w-full">
                {workspaceName}
              </span>
              <span className="text-[10px] text-muted-foreground truncate">Free Plan</span>
            </div>
          )}
          <span className="sr-only">Switch Workspace</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-60 p-2"
        align={isExpanded ? "start" : "start"}
        side={isExpanded ? "bottom" : "right"}
      >
        <div className="mb-2 px-2 text-xs font-medium text-muted-foreground">Switch Workspace</div>
        <div className="flex flex-col gap-1">
          {["Ganthiya Labs", "Personal", "Community"].map((ws) => {
            const slug = ws.toLowerCase().replace(/\s+/g, "-");
            return (
              <Button
                key={ws}
                variant="ghost"
                className="justify-start gap-2 h-9 px-2 text-sm"
                asChild
              >
                <Link to={`/${slug}/timeline`} params={{ workspace: slug }}>
                  <Avatar className="h-5 w-5 rounded-md">
                    <AvatarFallback className="rounded-md text-[10px]">
                      {ws.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {ws}
                </Link>
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
