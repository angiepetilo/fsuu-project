import { useState, useCallback } from "react";
import api from "@/lib/axios";
import { useDataCache } from "@/hooks/useDataCache";

export function useUserManagement() {
  const { data: usersData, loading: usersLoading, refresh: refreshUsers } = useDataCache('sysad_users', '/admin/users');
  const { data: officesData, loading: officesLoading, refresh: refreshOffices } = useDataCache('sysad_offices', '/admin/offices');

  const users = usersData ?? [];
  const offices = officesData ?? [];
  const loading = usersLoading || officesLoading;

  const [formLoading, setFormLoading] = useState(false);
  const [error, setError]             = useState(null);
  const [success, setSuccess]         = useState(null);
  
  const [showCreate, setShowCreate]   = useState(false);
  const [editUser, setEditUser]       = useState(null);
  const [deleteUser, setDeleteUser]   = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [createdCreds, setCreatedCreds]   = useState(null);
  
  const [search, setSearch] = useState("");

  const showMsg = (msg, isErr = false) => {
    if (isErr) setError(msg); else setSuccess(msg);
    setTimeout(() => { setError(null); setSuccess(null); }, 6000);
  };

  const fetchAll = useCallback(() => {
    refreshUsers();
    refreshOffices();
  }, [refreshUsers, refreshOffices]);

  const handleCreate = async (fd) => {
    setFormLoading(true);
    try {
      const res = await api.post("/admin/users", fd, { headers: { "Content-Type": "multipart/form-data" } });
      const { user } = res.data;
      setShowCreate(false);
      setCreatedCreds({ name: user.name, username: user.email, personalEmail: user.personal_email, role: user.role });
      showMsg("User created! Credentials emailed to their personal address.");
      fetchAll();
    } catch (err) {
      const msg = err.response?.data?.message
        ?? Object.values(err.response?.data?.errors ?? {}).flat().join(" ")
        ?? "Failed to create user.";
      showMsg(msg, true);
    } finally { setFormLoading(false); }
  };

  const handleUpdate = async (fd) => {
    setFormLoading(true);
    try {
      await api.post(`/admin/users/${editUser.id}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      showMsg("User updated successfully.");
      setEditUser(null);
      fetchAll();
    } catch (err) {
      showMsg(err.response?.data?.message ?? "Failed to update user.", true);
    } finally { setFormLoading(false); }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await api.delete(`/admin/users/${deleteUser.id}`);
      showMsg("User deleted.");
      setDeleteUser(null);
      fetchAll();
    } catch (err) {
      showMsg(err.response?.data?.message ?? "Failed to delete user.", true);
    } finally { setDeleteLoading(false); }
  };

  const filteredUsers = users.filter(u =>
    !search ||
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.office?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return {
    users: filteredUsers,
    totalUsers: users.length,
    offices,
    loading,
    formLoading,
    error,
    success,
    search,
    setSearch,
    showCreate,
    setShowCreate,
    editUser,
    setEditUser,
    deleteUser,
    setDeleteUser,
    deleteLoading,
    createdCreds,
    setCreatedCreds,
    handleCreate,
    handleUpdate,
    handleDelete,
  };
}
