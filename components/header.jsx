"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Button } from "./ui/button";
import {
  PenBox, LayoutDashboard, FileText, GraduationCap,
  ChevronDown, StarsIcon, Calendar, Menu, X, Sparkles,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from "@clerk/nextjs";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import Image from "next/image";

const navLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/resume", label: "Resume", icon: FileText },
  { href: "/ai-cover-letter", label: "Cover Letter", icon: PenBox },
  { href: "/interview", label: "Interview", icon: GraduationCap },
  { href: "/timetable", label: "Timetable", icon: Calendar },
];

export default function Header() {
  const { user, isLoaded } = useUser();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Sync user with database
  useEffect(() => {
    if (!isLoaded || !user) return;
    fetch("/api/user-sync", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clerkUserId: user.id,
        name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
        email: user.emailAddresses[0]?.emailAddress,
        imageUrl: user.imageUrl,
      }),
    }).catch(() => {});
  }, [user, isLoaded]);

  const isActive = (href) => pathname === href;

  return (
    <>
      <header
        className={`fixed top-0 w-full z-50 transition-all duration-500 ${
          scrolled
            ? "bg-slate-950/90 backdrop-blur-xl border-b border-white/8 shadow-lg shadow-black/20"
            : "bg-transparent"
        }`}
      >
        <nav className="container mx-auto px-4 h-20 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0 group">
            <Image
              src="/logo.png"
              alt="QuantAI Logo"
              width={160}
              height={48}
              className="h-14 w-auto object-contain transition-all duration-300 group-hover:scale-105 group-hover:drop-shadow-[0_0_12px_rgba(96,165,250,0.6)]"
            />
          </Link>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-1">
            <SignedIn>
              {navLinks.slice(0, 1).map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`gap-2 text-sm font-medium transition-all duration-200 rounded-lg ${
                      isActive(href)
                        ? "bg-blue-500/15 text-blue-400 border border-blue-500/20"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Button>
                </Link>
              ))}

              {/* Growth Tools Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 rounded-lg font-medium shadow-glow-sm"
                  >
                    <StarsIcon className="h-4 w-4" />
                    Growth Tools
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-52 bg-slate-900/95 backdrop-blur-xl border border-white/10 shadow-2xl rounded-xl p-1"
                >
                  {navLinks.slice(1).map(({ href, label, icon: Icon }) => (
                    <DropdownMenuItem key={href} asChild>
                      <Link
                        href={href}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                          isActive(href)
                            ? "bg-blue-500/15 text-blue-400"
                            : "text-slate-300 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {label}
                        {isActive(href) && (
                          <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400" />
                        )}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </SignedIn>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <SignedOut>
              <SignInButton>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/20 text-white hover:bg-white/10 hover:border-white/40 rounded-lg"
                >
                  Sign In
                </Button>
              </SignInButton>
            </SignedOut>

            <SignedIn>
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "w-9 h-9 ring-2 ring-blue-500/30 hover:ring-blue-500/60 transition-all",
                    userButtonPopoverCard: "bg-slate-900 border border-white/10 shadow-2xl",
                    userPreviewMainIdentifier: "font-semibold text-white",
                    userPreviewSecondaryIdentifier: "text-slate-400",
                  },
                }}
                fallbackRedirectUrl="/"
              />
            </SignedIn>

            {/* Mobile menu toggle */}
            <SignedIn>
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden w-9 h-9 p-0 text-slate-400 hover:text-white hover:bg-white/5"
                onClick={() => setMobileOpen(!mobileOpen)}
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </SignedIn>
          </div>
        </nav>
      </header>

      {/* Mobile Drawer */}
      <SignedIn>
        <div
          className={`fixed inset-0 z-40 lg:hidden transition-all duration-300 ${
            mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <div
            className={`absolute top-0 right-0 h-full w-72 bg-slate-950/98 border-l border-white/10 shadow-2xl transition-transform duration-300 ${
              mobileOpen ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <div className="flex flex-col p-6 pt-24 gap-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">
                Navigation
              </p>
              {navLinks.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href}>
                  <div
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive(href)
                        ? "bg-blue-500/15 text-blue-400 border border-blue-500/20"
                        : "text-slate-300 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                    {isActive(href) && (
                      <span className="ml-auto w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </SignedIn>
    </>
  );
}
