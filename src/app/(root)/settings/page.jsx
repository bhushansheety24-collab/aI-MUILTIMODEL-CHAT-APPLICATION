"use client";
import { useState, useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { Mail, Calendar, FolderOpen, Loader2 } from "lucide-react";

function Toggle({ checked, onChange, loading }) {
  return (
    <button
      onClick={onChange}
      disabled={loading}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? "bg-primary" : "bg-muted-foreground/30"
      }`}
    >
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin absolute left-1/2 -translate-x-1/2 text-white" />
      ) : (
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      )}
    </button>
  );
}

export default function SettingsPage() {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    fetch("/api/settings/google-status")
      .then((res) => res.json())
      .then((data) => setConnected(data.connected))
      .finally(() => setLoading(false));
  }, []);

  const toggleGoogle = async () => {
    if (connected) return; // disconnect flow can be added later if needed

    setConnecting(true);
    await authClient.linkSocial({
      provider: "google",
      scopes: [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/drive.readonly",
        "https://www.googleapis.com/auth/calendar",
      ],
    });
    setConnecting(false);
  };

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Connections</h1>

      <div className="border border-border rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium">Google</p>
              <p className="text-sm text-muted-foreground">
                {connected ? "Connected" : "Not connected"}
              </p>
            </div>
          </div>
          {!loading && (
            <Toggle
              checked={connected}
              onChange={toggleGoogle}
              loading={connecting}
            />
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-border grid grid-cols-3 gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-4 w-4" /> Gmail
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FolderOpen className="h-4 w-4" /> Drive
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" /> Calendar
          </div>
        </div>
      </div>
    </div>
  );
}