import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Bell, Eye, CheckCircle, XCircle } from "lucide-react";

type Prefs = {
  notify_viewed: boolean;
  notify_accepted: boolean;
  notify_rejected: boolean;
};

export default function NotificationPreferences() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<Prefs>({ notify_viewed: true, notify_accepted: true, notify_rejected: true });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("notification_preferences" as any)
      .select("notify_viewed, notify_accepted, notify_rejected")
      .eq("user_id", user.id)
      .single()
      .then(({ data, error }: any) => {
        if (data) {
          setPrefs(data);
        } else if (error?.code === "PGRST116") {
          // No row yet, insert defaults
          supabase.from("notification_preferences" as any).insert({ user_id: user.id } as any);
        }
        setLoading(false);
      });
  }, [user]);

  const toggle = async (key: keyof Prefs) => {
    const newVal = !prefs[key];
    setPrefs((p) => ({ ...p, [key]: newVal }));
    const { error } = await supabase
      .from("notification_preferences" as any)
      .update({ [key]: newVal } as any)
      .eq("user_id", user!.id);
    if (error) {
      setPrefs((p) => ({ ...p, [key]: !newVal }));
      toast.error("Failed to update preference");
    }
  };

  const items = [
    { key: "notify_viewed" as const, label: "Proposal Viewed", desc: "When a client views your shared proposal", icon: Eye },
    { key: "notify_accepted" as const, label: "Proposal Accepted", desc: "When a client accepts your proposal", icon: CheckCircle },
    { key: "notify_rejected" as const, label: "Proposal Rejected", desc: "When a client declines your proposal", icon: XCircle },
  ];

  if (loading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" /> Email Notifications
        </CardTitle>
        <CardDescription>Choose which email notifications you'd like to receive</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item) => (
          <div key={item.key} className="flex items-center justify-between rounded-lg border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <item.icon className="h-4 w-4" />
              </div>
              <div>
                <Label className="text-sm font-medium">{item.label}</Label>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            </div>
            <Switch checked={prefs[item.key]} onCheckedChange={() => toggle(item.key)} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
