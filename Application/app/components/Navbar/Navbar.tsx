"use client"
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  IconHome,
  IconTicket,
  IconUser,
  IconUsers,
  IconCalendarEvent,
  IconEyeFilled,
  IconLogout,
  IconSwitchHorizontal
} from '@tabler/icons-react';
import { Code, Group, Switch } from '@mantine/core';
import classes from './Navbar.module.css';
import { useEffect, useState } from 'react';
import { handleLogout } from '@/app/utils/oauth';

const notAdminData = [
  { link: '/home', label: 'Home', icon: IconHome },
  { link: '/tickets', label: 'Tickets', icon: IconTicket },
  { link: '/contacts', label: 'Contacts', icon: IconUsers },
  { link: '/events', label: 'Events', icon: IconCalendarEvent },
];

const adminOnly = [
  { link: '/admin/management', label: 'Management', icon: IconEyeFilled },
];

export default function NavbarSimple() {
  const pathname = usePathname();

  const [admin, changeMode] = useState(false);
  const [data, changeData] = useState<typeof notAdminData>(notAdminData);

  useEffect (() => {
    const assignData = () => {
      if (admin) {
        changeData([...notAdminData, ...adminOnly])
      } else {
        changeData(notAdminData)
      }
    }
    assignData();
  }, [admin]);

  const showNavbar = pathname !== '/login';

  const links = data.map((item) => (
    <Link
      className={classes.link}
      data-active={item.link === pathname || undefined}
      href={item.link}
      key={item.label}
    >
      <item.icon className={classes.linkIcon} stroke={1.5} />
      <span>{item.label}</span>
    </Link>
  ));

  if (!showNavbar) {
    return null;
  }

  return (
    <nav className={classes.navbar}>
      <div className={classes.navbarMain}>
        {links}
      </div>

      <div className={classes.footer}>
        <div>
          <Switch
          color='red'
          label='Admin Mode'
          onChange={() => changeMode(!admin)}
          />
        </div>

        <a
          href="#"
          className={classes.link}
          onClick={(event) => event.preventDefault()}
        >
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

        <a
          href="#"
          className={classes.link}
          onClick={handleLogout}
        >
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
