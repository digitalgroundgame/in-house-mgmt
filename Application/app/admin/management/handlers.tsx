import { type Organization } from "@/app/components/OrganizationsTable";
import { type GroupMember } from "@/app/components/OrganizationMembersTable";
import { type ContactWithRole } from "@/app/components/RolesTable";
import { type UseFormReturnType } from "@mantine/form";

// Form value types
export interface AddOrgFormValues {
  name: string;
}

export interface AddMemberFormValues {
  contact: string;
  access_level: string;
}

export interface AccessLevelFormValues {
  access_level: string;
}

export interface AssignRoleFormValues {
  contact: string;
  access_level: string;
}

interface UseHandlersProps {
  // State setters
  setSelectedOrg: (org: Organization | null) => void;
  setOrgDetailsOpen: (open: boolean) => void;
  setAddOrgOpen: (open: boolean) => void;
  setDeleteOrgOpen: (open: boolean) => void;
  setAddMemberOpen: (open: boolean) => void;
  setEditMemberOpen: (open: boolean) => void;
  setSelectedMember: (member: GroupMember | null) => void;
  setSelectedContact: (contact: ContactWithRole | null) => void;
  setAssignRoleOpen: (open: boolean) => void;
  setEditRoleOpen: (open: boolean) => void;
  setSubmitting: (submitting: boolean) => void;

  // Forms
  addOrgForm: UseFormReturnType<AddOrgFormValues>;
  addMemberForm: UseFormReturnType<AddMemberFormValues>;
  editMemberForm: UseFormReturnType<AccessLevelFormValues>;
  assignRoleForm: UseFormReturnType<AssignRoleFormValues>;
  editRoleForm: UseFormReturnType<AccessLevelFormValues>;

  // Fetch functions
  fetchOrganizations: () => Promise<void>;
  fetchOrgMembers: (gid: number) => Promise<void>;
  fetchContactsWithRoles: () => Promise<void>;

  // Current selections
  selectedOrg: Organization | null;
  selectedMember: GroupMember | null;
  selectedContact: ContactWithRole | null;
}

export function useAdminHandlers(props: UseHandlersProps) {
  const {
    setSelectedOrg,
    setOrgDetailsOpen,
    setAddOrgOpen,
    setDeleteOrgOpen,
    setAddMemberOpen,
    setEditMemberOpen,
    setSelectedMember,
    setSelectedContact,
    setAssignRoleOpen,
    setEditRoleOpen,
    setSubmitting,
    addOrgForm,
    addMemberForm,
    editMemberForm,
    assignRoleForm,
    editRoleForm,
    fetchOrganizations,
    fetchOrgMembers,
    fetchContactsWithRoles,
    selectedOrg,
    selectedMember,
    selectedContact,
  } = props;

  // ===== Organization Handlers =====

  const handleOrgRowClick = (org: Organization) => {
    setSelectedOrg(org);
    setOrgDetailsOpen(true);
  };

  const handleAddOrganization = () => {
    addOrgForm.reset();
    setAddOrgOpen(true);
  };

  const handleSubmitOrganization = async (values: AddOrgFormValues) => {
    setSubmitting(true);
    try {
      const response = await fetch("/api/groups/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) throw new Error("Failed to create organization");

      setAddOrgOpen(false);
      addOrgForm.reset();
      fetchOrganizations();
    } catch (error) {
      console.error("Error creating organization:", error);
      alert("Failed to create organization. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteOrganization = (org: Organization) => {
    setSelectedOrg(org);
    setDeleteOrgOpen(true);
  };

  const confirmDeleteOrganization = async () => {
    if (!selectedOrg) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/groups/${selectedOrg.gid}/`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete organization");

      setDeleteOrgOpen(false);
      setOrgDetailsOpen(false);
      setSelectedOrg(null);
      fetchOrganizations();
    } catch (error) {
      console.error("Error deleting organization:", error);
      alert("Failed to delete organization. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ===== Member Handlers =====

  const handleAddMember = () => {
    addMemberForm.reset();
    setAddMemberOpen(true);
  };

  const handleSubmitAddMember = async (values: AddMemberFormValues) => {
    if (!selectedOrg) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/volunteer-in-groups/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact: values.contact,
          group: selectedOrg.gid,
          access_level: parseInt(values.access_level),
        }),
      });

      if (!response.ok) throw new Error("Failed to add member");

      setAddMemberOpen(false);
      addMemberForm.reset();
      fetchOrgMembers(selectedOrg.gid);
      fetchOrganizations(); // Refresh member counts
    } catch (error) {
      console.error("Error adding member:", error);
      alert("Failed to add member. They may already be in this organization.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditMember = (member: GroupMember) => {
    setSelectedMember(member);
    editMemberForm.setValues({ access_level: member.access_level.toString() });
    setEditMemberOpen(true);
  };

  const handleSubmitEditMember = async (values: AccessLevelFormValues) => {
    if (!selectedMember || !selectedOrg) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/volunteer-in-groups/${selectedMember.id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_level: parseInt(values.access_level),
        }),
      });

      if (!response.ok) throw new Error("Failed to update member");

      setEditMemberOpen(false);
      fetchOrgMembers(selectedOrg.gid);
    } catch (error) {
      console.error("Error updating member:", error);
      alert("Failed to update member. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveMember = (member: GroupMember) => {
    if (!confirm(`Remove ${member.name} from this organization?`)) return;
    if (!selectedOrg) return;

    setSubmitting(true);
    fetch(`/api/volunteer-in-groups/${member.id}/`, {
      method: "DELETE",
    })
      .then((response) => {
        if (!response.ok) throw new Error("Failed to remove member");
        fetchOrgMembers(selectedOrg.gid);
        fetchOrganizations(); // Refresh member counts
      })
      .catch((error) => {
        console.error("Error removing member:", error);
        alert("Failed to remove member. Please try again.");
      })
      .finally(() => {
        setSubmitting(false);
      });
  };

  // ===== Role Handlers =====

  const handleAssignRole = (contact: ContactWithRole) => {
    setSelectedContact(contact);
    assignRoleForm.reset();
    setAssignRoleOpen(true);
  };

  const handleSubmitAssignRole = async (values: AccessLevelFormValues) => {
    if (!selectedContact) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/general-roles/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact: selectedContact.discord_id,
          access_level: parseInt(values.access_level),
        }),
      });

      if (!response.ok) throw new Error("Failed to assign role");

      setAssignRoleOpen(false);
      assignRoleForm.reset();
      fetchContactsWithRoles();
    } catch (error) {
      console.error("Error assigning role:", error);
      alert("Failed to assign role. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditRole = (contact: ContactWithRole) => {
    setSelectedContact(contact);
    editRoleForm.setValues({ access_level: contact.access_level?.toString() || "1" });
    setEditRoleOpen(true);
  };

  const handleSubmitEditRole = async (values: AccessLevelFormValues) => {
    if (!selectedContact || !selectedContact.role_id) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/general-roles/${selectedContact.role_id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_level: parseInt(values.access_level),
        }),
      });

      if (!response.ok) throw new Error("Failed to update role");

      setEditRoleOpen(false);
      fetchContactsWithRoles();
    } catch (error) {
      console.error("Error updating role:", error);
      alert("Failed to update role. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveRole = (contact: ContactWithRole) => {
    if (!contact.role_id) return;
    if (!confirm(`Remove role for ${contact.full_name}? The contact will remain in the system.`))
      return;

    setSubmitting(true);
    fetch(`/api/general-roles/${contact.role_id}/`, {
      method: "DELETE",
    })
      .then((response) => {
        if (!response.ok) throw new Error("Failed to remove role");
        fetchContactsWithRoles();
      })
      .catch((error) => {
        console.error("Error removing role:", error);
        alert("Failed to remove role. Please try again.");
      })
      .finally(() => {
        setSubmitting(false);
      });
  };

  return {
    handleOrgRowClick,
    handleAddOrganization,
    handleSubmitOrganization,
    handleDeleteOrganization,
    confirmDeleteOrganization,
    handleAddMember,
    handleSubmitAddMember,
    handleEditMember,
    handleSubmitEditMember,
    handleRemoveMember,
    handleAssignRole,
    handleSubmitAssignRole,
    handleEditRole,
    handleSubmitEditRole,
    handleRemoveRole,
  };
}
