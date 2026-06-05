import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export function useIsAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!user) { setIsAdmin(false); setLoading(false); return; }
    setLoading(true);
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle()
      .then(({ data }) => { setIsAdmin(!!data); setLoading(false); });
  }, [user]);
  return { isAdmin, loading };
}

export function useRoles() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!user) { setRoles([]); setLoading(false); return; }
    setLoading(true);
    supabase.from("user_roles").select("role").eq("user_id", user.id)
      .then(({ data }) => { setRoles((data ?? []).map((r: any) => r.role)); setLoading(false); });
  }, [user]);
  return {
    roles, loading,
    isAdmin: roles.includes("admin"),
    isCoAdmin: roles.includes("co_admin"),
    isStaff: roles.includes("admin") || roles.includes("co_admin"),
    isTeacher: roles.includes("teacher"),
  };
}
