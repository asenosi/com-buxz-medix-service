import { NotificationSettings } from "@/components/NotificationSettings";

const NotificationSettingsPage = () => {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Notification Settings</h1>
        <p className="text-muted-foreground text-lg">
          Configure your medication reminder preferences
        </p>
      </div>
      <NotificationSettings />
    </div>
  );
};

export default NotificationSettingsPage;
