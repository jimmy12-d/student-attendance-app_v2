"use client";

import React from 'react';
import { usePWANavigation } from '../_hooks/usePWANavigation';

interface PWALinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  replace?: boolean;
  external?: boolean;
  onClick?: () => void;
}

/**
 * PWA-aware Link component that prevents breaking out of standalone mode
 */
export const PWALink: React.FC<PWALinkProps> = ({
  href,
  children,
  className = '',
  replace = false,
  external = false,
  onClick,
}) => {
  const { navigateWithinPWA, handleExternalLink } = usePWANavigation();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    
    if (onClick) {
      onClick();
    }

    if (external) {
      handleExternalLink(href);
    } else {
      navigateWithinPWA(href, { replace });
    }
  };

  return (
    <a
      href={href}
      className={className}
      onClick={handleClick}
      role="button"
      tabIndex={0}
    >
      {children}
    </a>
  );
};

interface PWAButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
}

/**
 * PWA-aware Button component for navigation actions
 */
export const PWAButton: React.FC<PWAButtonProps> = ({
  onClick,
  children,
  className = '',
  type = 'button',
  disabled = false,
}) => {
  return (
    <button
      type={type}
      className={className}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export default PWALink;
