"use client";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Mail, FolderOpen } from "lucide-react";

export default function SettingsPage() {
  const connectGoogle = async () => {
    await authClient.linkSocial({
      provider: "google",
      scopes: [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/drive.readonly",
      ],
    });
  };

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Connections</h1>

      <div className="border border-border rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium">Google (Gmail + Drive)</p>
            <p className="text-sm text-muted-foreground">
              Let T3 Chat search your Gmail and Google Drive
            </p>
          </div>
        </div>
        <Button onClick={connectGoogle}>Connect Google</Button>
      </div>
    </div>
  );
}