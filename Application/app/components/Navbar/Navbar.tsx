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
  IconTicketOff,
  IconEyeFilled,
  IconLogout,
  IconSwitchHorizontal,
  IconBuilding,
} from "@tabler/icons-react";
import { Code, Group, NavLink, Switch } from "@mantine/core";
import classes from "./Navbar.module.css";
import { useState } from "react";
import { handleLogout } from "@/app/utils/oauth";

const notAdminData = [
  { link: "/home", label: "Home", icon: IconHome },
  { link: "/tickets", label: "Tickets", icon: IconTicket },
  { link: "/contacts", label: "Contacts", icon: IconUsers },
  { link: "/events", label: "Events", icon: IconCalendarEvent },
];

const internalLinks = [
  { link: "/phone-bank", label: "Internal Phone Bank", icon: IconPhone },
  { link: "/internal-tickets", label: "Internal Tickets", icon: IconTicketOff },
];

const adminOnly = [{ link: "/management", label: "Management", icon: IconEyeFilled }];

export default function NavbarSimple() {
  const pathname = usePathname();

  const [admin, changeMode] = useState(false);
  const data = admin ? [...notAdminData, ...adminOnly] : notAdminData;

  const showNavbar = pathname !== "/login";

  const isInternalActive = internalLinks.some((item) => item.link === pathname);

  if (!showNavbar) {
    return null;
  }

  return (
    <nav className={classes.navbar}>
      <div className={classes.navbarMain}>
        {data.map((item) => (
          <Link
            className={classes.link}
            data-active={item.link === pathname || undefined}
            href={item.link}
            key={item.label}
          >
            <item.icon className={classes.linkIcon} stroke={1.5} />
            <span>{item.label}</span>
          </Link>
        ))}

        <NavLink
          label="Internal"
          leftSection={<IconBuilding size={20} stroke={1.5} className={classes.linkIcon} />}
          defaultOpened={isInternalActive}
          classNames={{ children: classes.navLinkChildren }}
          styles={{
            root: {
              padding: "var(--mantine-spacing-xs) var(--mantine-spacing-sm)",
              borderRadius: "var(--mantine-radius-sm)",
              fontSize: "var(--mantine-font-size-sm)",
              fontWeight: 500,
              color: "var(--mantine-color-gray-7)",
            },
            label: { padding: 0 },
          }}
        >
          {internalLinks.map((item) => (
            <Link
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
        <div>
          <Switch color="red" label="Admin Mode" onChange={() => changeMode(!admin)} />
        </div>

        <a href="#" className={classes.link} onClick={(event) => event.preventDefault()}>
          <IconSwitchHorizontal className={classes.linkIcon} stroke={1.5} />
          <span>Change account</span>
        </a>

        <Link
          className={classes.link}
          data-active={"/profile" === pathname || undefined}
          href={"/profile"}
          key={"profile"}
        >
          <IconUser className={classes.linkIcon} stroke={1.5} />
          <span>Profile</span>
        </Link>

        <a href="#" className={classes.link} onClick={handleLogout}>
          <IconLogout className={classes.linkIcon} stroke={1.5} />
          <span>Logout</span>
        </a>
      </div>
      <Group className={classes.header} justify="space-between">
        <Code fw={700}>v0.0.0</Code>
      </Group>
    </nav>
  );
}
