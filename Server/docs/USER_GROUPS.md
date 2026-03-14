# User Groups and Permissions

## Adding Users via Django Admin

### Step 1: Create the User
- Go to **Admin → Users → Add User**
- Enter username, first name, last name, password
- Click Save

### Step 2: Create the EmailAddress
The app uses `django-allauth` which stores emails in a separate table.
- Go to **Admin → Email Addresses → Add**
- Link the email to the user you just created (using that id)
- Check "Verified" and "Primary" (unless this is a secondary email)

### Step 3: Assign to Group
- Go to **Admin → Users → Select the user**
- In the "Groups" field, select the appropriate group (ORGANIZER, HELPER, or TRAINEE)
- Click Save

---

## Group Permissions

You can view your group assignments on the /profile page.

### Admin
Full admin access. Always can do anything. Access to the /admin and /management pages as well, which no other group does.

### ORGANIZER
Near total control of all data. Can view, edit, and delete all contacts, events, and tickets. Can assign tickets to any user, unclaim any ticket, and comment on any ticket regardless of assignment. Can assign users to events. Has complete control over all features and data in the system.

### HELPER
Can view and edit contacts and events they're assigned to. Can claim tickets and manage them (edit, comment, unclaim). Can view tickets associated with events they're part of. Good for staff who handle specific events and need to manage tickets but don't need full system access.

### TRAINEE
Read-only access to contacts and events. Can view tickets but not edit them. Can only comment on tickets that are specifically assigned to them. Designed for new volunteers who need to see what's happening but shouldn't make changes except to communicate on their own assigned tasks.

---

## Detailed Permission Matrix

| Permission | ORGANIZER | HELPER | TRAINEE |
|------------|:---------:|:------:|:-------:|
| **Contacts** | | | |
| view_contact | ✅ | ✅ | ✅ |
| view_all_contacts | ✅ | ❌ | ❌ |
| view_contacts_via_event | ✅ | ✅ | ✅ |
| change_contact | ✅ | ✅ | ❌ |
| change_all_contacts | ✅ | ❌ | ❌ |
| **Events** | | | |
| view_event | ✅ | ✅ | ❌ |
| view_all_events | ✅ | ❌ | ❌ |
| view_any_assigned_event | ❌ | ✅ | ❌ |
| change_assigned_event | ✅ | ❌ | ❌ |
| **Event Participations** | | | |
| view_eventparticipation | ✅ | ✅ | ❌ |
| view_all_participations | ✅ | ❌ | ❌ |
| add_eventparticipation | ✅ | ✅ | ❌ |
| delete_eventparticipation | ✅ | ❌ | ❌ |
| change_eventparticipation | ✅ | ✅ | ✅ |
| change_participation_via_ticket | ✅ | ✅ | ✅ |
| change_participation_via_event | ❌ | ✅ | ❌ |
| change_all_participations | ✅ | ❌ | ❌ |
| **Users in Events** | | | |
| view_usersinevent | ✅ | ✅ | ❌ |
| view_all_usersinevents | ✅ | ❌ | ❌ |
| view_usersinevent_via_event | ✅ | ✅ | ❌ |
| change_all_usersinevents | ✅ | ❌ | ❌ |
| delete_usersinevents | ✅ | ❌ | ❌ |
| **Tickets** | | | |
| view_ticket | ✅ | ✅ | ✅ |
| view_all_tickets | ✅ | ❌ | ❌ |
| view_tickets_via_event | ❌ | ✅ | ❌ |
| change_ticket | ✅ | ✅ | ❌ |
| claim_ticket | ✅ | ✅ | ❌ |
| unclaim_ticket | ✅ | ❌ | ❌ |
| assign_ticket | ✅ | ❌ | ❌ |
| add_any_comment | ✅ | ❌ | ❌ |
| add_ticketcomment | ✅ | ✅ | ✅ |
