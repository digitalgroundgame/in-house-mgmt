"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconHome,
  IconTicket,
  IconUser,
  IconUsers,
  IconCalendarEvent,
  IconPhone,
  IconEyeFilled,
  IconLogout,
  IconBuilding,
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react";
import { NavLink } from "@mantine/core";
import classes from "./Navbar.module.css";
import { useState } from "react";
import { handleLogout } from "@/app/utils/oauth";
import { useUser } from "@/app/components/provider/UserContext";

const notAdminData = [
  { link: "/home", label: "Home", icon: IconHome },
  { link: "/tickets", label: "Tickets", icon: IconTicket },
  { link: "/contacts", label: "Contacts", icon: IconUsers },
  { link: "/events", label: "Events", icon: IconCalendarEvent },
];

const internalLinks = [{ link: "/phone-bank", label: "Internal Phone Bank", icon: IconPhone }];

const adminOnly = [{ link: "/management", label: "Management", icon: IconEyeFilled }];

export default function NavbarSimple() {
  const pathname = usePathname();
  const { user } = useUser();

  const [collapsed, setCollapsed] = useState(false);
  const data = notAdminData;
  const isAdmin = user?.groups.includes("ADMIN") ?? false;

  const showNavbar = pathname !== "/login";

  const isInternalActive = internalLinks.some((item) => item.link === pathname);

  if (!showNavbar) {
    return null;
  }

  return (
    <nav className={classes.navbar} data-collapsed={collapsed || undefined}>
      <button
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className={classes.collapseButton}
        onClick={() => setCollapsed((value) => !value)}
        type="button"
      >
        {collapsed ? (
          <IconChevronRight size={16} stroke={1.5} />
        ) : (
          <IconChevronLeft size={16} stroke={1.5} />
        )}
      </button>

      <div className={classes.navbarMain}>
        {data.map((item) => (
          <Link
            aria-label={item.label}
            className={classes.link}
            data-active={item.link === pathname || undefined}
            href={item.link}
            key={item.label}
          >
            <item.icon className={classes.linkIcon} stroke={1.5} />
            <span className={classes.linkLabel}>{item.label}</span>
          </Link>
        ))}

        <NavLink
          aria-label="Internal"
          className={classes.navLinkRoot}
          label="Internal"
          leftSection={<IconBuilding stroke={1.5} className={classes.navLinkIcon} />}
          defaultOpened={isInternalActive}
          classNames={{
            children: classes.navLinkChildren,
            label: classes.navLinkLabel,
            section: classes.navLinkSection,
          }}
          styles={{
            body: {
              display: collapsed ? "none" : undefined,
            },
            root: {
              padding: "var(--mantine-spacing-xs) var(--mantine-spacing-sm)",
              borderRadius: "var(--mantine-radius-sm)",
              fontSize: "var(--mantine-font-size-sm)",
              fontWeight: 500,
            },
            label: { padding: 0 },
          }}
        >
          {internalLinks.map((item) => (
            <Link
              aria-label={item.label}
              className={classes.link}
              data-active={item.link === pathname || undefined}
              href={item.link}
              key={item.label}
            >
              <item.icon className={classes.linkIcon} stroke={1.5} />
              <span>{item.label}</span>
            </Link>
          ))}
        </NavLink>
      </div>

      <div className={classes.footer}>
        {isAdmin &&
          adminOnly.map((item) => (
            <Link
              aria-label={item.label}
              className={classes.link}
              data-active={item.link === pathname || undefined}
              href={item.link}
              key={item.label}
            >
              <item.icon className={classes.linkIcon} stroke={1.5} />
              <span className={classes.linkLabel}>{item.label}</span>
            </Link>
          ))}

        <Link
          aria-label="Profile"
          className={classes.link}
          data-active={"/profile" === pathname || undefined}
          href={"/profile"}
          key={"profile"}
        >
          <IconUser className={classes.linkIcon} stroke={1.5} />
          <span className={classes.linkLabel}>Profile</span>
        </Link>

        <a aria-label="Logout" href="#" className={classes.link} onClick={handleLogout}>
          <IconLogout className={classes.linkIcon} stroke={1.5} />
          <span className={classes.linkLabel}>Logout</span>
        </a>
      </div>
    </nav>
  );
}
