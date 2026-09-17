import { useEffect, useId, useState } from "react";
import { Link, NavLink, Outlet } from "react-router";
import { Menu, X } from "lucide-react";

import { FacilioMark, FacilioWordmark } from "@/components/brand/FacilioMark";
import { RouteFocus } from "@/components/a11y/RouteFocus";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { IconButton } from "@/components/ui/IconButton";
import {
  PUBLIC_CREATE_ACCOUNT,
  PUBLIC_FOOTER_BLURB,
  PUBLIC_PRIMARY_CTA,
  PUBLIC_PRODUCT,
  PUBLIC_SIGN_IN,
} from "@/features/public/public-content";

const NAV_LINKS = [
  { to: "/#product", label: "Product", hash: true },
  { to: "/#how-it-works", label: "How it works", hash: true },
  { to: "/learn", label: "Learn", hash: false },
] as const;

export function PublicShell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <div className="public-shell min-h-screen bg-canvas text-ink">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <header className="public-header">
        <div className="public-header-inner">
          <Link
            to="/"
            className="flex min-w-0 items-center gap-2.5"
            aria-label={PUBLIC_PRODUCT}
          >
            <FacilioMark size="sm" />
            <span className="font-sans text-[13px] font-semibold tracking-[0.14em] text-ink">
              {PUBLIC_PRODUCT}
            </span>
          </Link>
          <nav className="flex items-center gap-1" aria-label="Public">
            <div className="hidden items-center gap-1 lg:flex">
              {NAV_LINKS.map((item) =>
                item.hash ? (
                  <a key={item.to} href={item.to} className="public-nav-link">
                    {item.label}
                  </a>
                ) : (
                  <NavLink key={item.to} to={item.to} className="public-nav-link">
                    {item.label}
                  </NavLink>
                ),
              )}
              <NavLink to="/login" className="public-nav-link">
                {PUBLIC_SIGN_IN}
              </NavLink>
              <ButtonLink to="/overview" size="sm" className="ml-2">
                {PUBLIC_PRIMARY_CTA}
              </ButtonLink>
            </div>
            <div className="flex items-center gap-1 lg:hidden">
              <ButtonLink to="/overview" size="sm">
                {PUBLIC_PRIMARY_CTA}
              </ButtonLink>
              <IconButton
                label={menuOpen ? "Close menu" : "Open menu"}
                aria-expanded={menuOpen}
                aria-controls={menuId}
                onClick={() => {
                  setMenuOpen((open) => !open);
                }}
              >
                {menuOpen ? (
                  <X size={16} aria-hidden="true" />
                ) : (
                  <Menu size={16} aria-hidden="true" />
                )}
              </IconButton>
            </div>
          </nav>
        </div>
        {menuOpen ? (
          <div id={menuId} className="public-mobile-menu lg:hidden">
            <ul className="flex flex-col gap-1 px-4 py-3">
              {NAV_LINKS.map((item) => (
                <li key={item.to}>
                  {item.hash ? (
                    <a
                      href={item.to}
                      className="public-nav-link block"
                      onClick={closeMenu}
                    >
                      {item.label}
                    </a>
                  ) : (
                    <NavLink
                      to={item.to}
                      className="public-nav-link block"
                      onClick={closeMenu}
                    >
                      {item.label}
                    </NavLink>
                  )}
                </li>
              ))}
              <li>
                <NavLink
                  to="/login"
                  className="public-nav-link block"
                  onClick={closeMenu}
                >
                  {PUBLIC_SIGN_IN}
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/signup"
                  className="public-nav-link block"
                  onClick={closeMenu}
                >
                  {PUBLIC_CREATE_ACCOUNT}
                </NavLink>
              </li>
            </ul>
          </div>
        ) : null}
      </header>
      <main id="main-content" tabIndex={-1} className="outline-none">
        <RouteFocus />
        <Outlet />
      </main>
      <footer className="public-footer">
        <div className="public-footer-inner">
          <div className="min-w-0">
            <FacilioWordmark compact />
            <p className="type-body-sm mt-3 max-w-md text-ink-secondary">
              {PUBLIC_FOOTER_BLURB}
            </p>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-4 gap-y-2">
            <Link to="/learn" className="type-body-sm text-ink-secondary hover:text-ink">
              Learn
            </Link>
            <Link
              to="/overview"
              className="type-body-sm text-ink-secondary hover:text-ink"
            >
              {PUBLIC_PRIMARY_CTA}
            </Link>
            <Link to="/login" className="type-body-sm text-ink-secondary hover:text-ink">
              {PUBLIC_SIGN_IN}
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
