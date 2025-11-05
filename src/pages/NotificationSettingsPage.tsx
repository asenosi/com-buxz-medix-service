import { NotificationSettings } from "@/components/NotificationSettings";

const NotificationSettingsPage = () => {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-4">
        <h1 className="text-xl font-semibold mb-1">Notification Settings</h1>
        <p className="text-muted-foreground text-sm">
          Configure your medication reminder preferences
        </p>
      </div>
      <NotificationSettings />
    </div>
  );
};

export default NotificationSettingsPage;
