"use client";

import { LogOut } from "lucide-react";
import { logoutAction } from "@/app/backoffice/actions";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <Button type="submit" variant="outline" size="sm">
        <LogOut /> Keluar
      </Button>
    </form>
  );
}
