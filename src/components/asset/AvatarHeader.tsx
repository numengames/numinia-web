///src/components/avatar/AvatarHeader.tsx

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { LanguageSelector } from '@/components/LanguageSelector';
import { ThemeToggle } from '@/components/ThemeToggle';
import { usePathname } from 'next/navigation';
import { useIsMobile } from '@/lib/hooks/useIsMobile';
import { AvatarHeaderProps } from '@/types/avatar';

export const AvatarHeader: React.FC<AvatarHeaderProps> = ({
  socialLink,
  showWarningButton = false,
}) => {
  const { t, locale } = useI18n();
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Navigation links (sin "Home" porque el logo ya es Home)
  const navigationLinks = [
    { href: `/${locale}/gallery`, label: t('header.navigation.avatars') as string },
    { href: `/${locale}/finder`, label: t('header.navigation.finder') as string },
    { href: `/${locale}/glbinspector`, label: t('header.navigation.viewer') as string },
    { href: `/${locale}/resources`, label: t('header.navigation.resources') as string },
    { href: `/${locale}/about`, label: t('header.navigation.about') as string },
  ];

  return (
    <header className="w-full bg-cream/90 dark:bg-cream-dark/90 backdrop-blur-md border-b border-gray-300/50 dark:border-gray-700/50 fixed top-0 left-0 right-0 z-50 transition-colors">
      <div className="max-w-7xl mx-auto px-6 md:px-8 lg:px-12">
        
               {/* HEADER BAR - Versión final equilibrada */}
        <div className="flex items-center justify-between h-20 md:h-24">
          
          {/* Logo Numinia - tamaño más pequeño y elegante */}
          <Link
            href={`/${locale}`}
            className="flex-shrink-0"
          >
            <img
              src="/logo-numinia.svg"
              alt="Numinia Digital Goods"
              className="h-6 md:h-8 w-auto"
            />
          </Link>

          {/* Desktop Navigation - Right Side */}
          {!isMobile && (
            <div className="flex items-center gap-28">   {/* ← mucho más espacio */}
              <nav className="flex items-center gap-10">
                {navigationLinks.map((link) => {
                  const isActive = pathname === link.href || pathname?.startsWith(link.href + '/');
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`text-sm uppercase tracking-wider transition-colors ${
                        isActive
                          ? 'text-gray-900 dark:text-gray-100 font-semibold'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                      }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </nav>

              {/* Separator */}
              <div className="w-px h-4 bg-gray-300 dark:bg-gray-700" />

              {/* Social Links & Actions */}
              <div className="flex items-center gap-4">
                {/* Aquí van tus iconos de ToxSam, Twitter, GitHub, ThemeToggle y LanguageSelector (déjalos exactamente como los tenías) */}
              </div>
            </div>
          )}

          {/* Mobile Menu Button */}
          {isMobile && (
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          )}
        </div>

        {/* Mobile Menu */}
        {isMobile && mobileMenuOpen && (
          <nav className="py-6 border-t border-gray-300 dark:border-gray-700 backdrop-blur-md">
            <div className="flex flex-col space-y-4">
              {navigationLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`text-base uppercase tracking-wider transition-colors py-2 ${
                      isActive ? 'text-gray-900 dark:text-gray-100 font-bold' : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}

              <div className="pt-4 border-t border-gray-300 dark:border-gray-700 flex items-center gap-4">
                <ThemeToggle />
                <LanguageSelector />
              </div>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
};
