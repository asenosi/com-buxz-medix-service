import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import PageLoader from "@/components/PageLoader";
import AppLayout from "@/components/AppLayout";

const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ManageMedications = lazy(() => import("./pages/ManageMedications"));
const MedicationsList = lazy(() => import("./pages/MedicationsList"));
const AddMedication = lazy(() => import("./pages/AddMedication"));
const MedicationDetails = lazy(() => import("./pages/MedicationDetails"));
const Calendar = lazy(() => import("./pages/Calendar"));
const CalendarDay = lazy(() => import("./pages/CalendarDay"));
const Search = lazy(() => import("./pages/Search"));
const Profile = lazy(() => import("./pages/Profile"));
const Alerts = lazy(() => import("./pages/Alerts"));
const NotificationSettingsPage = lazy(() => import("./pages/NotificationSettingsPage"));
const InstallPWA = lazy(() => import("./pages/InstallPWA"));
const Appointments = lazy(() => import("./pages/Appointments"));
const AppointmentDetails = lazy(() => import("./pages/AppointmentDetails"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />

            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/medications" element={<ManageMedications />} />
              <Route path="/medications/list" element={<MedicationsList />} />
              <Route path="/medications/add" element={<AddMedication />} />
              <Route path="/medications/:id" element={<MedicationDetails />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/calendar/day" element={<CalendarDay />} />
              <Route path="/search" element={<Search />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/notification-settings" element={<NotificationSettingsPage />} />
              <Route path="/install" element={<InstallPWA />} />
              <Route path="/appointments" element={<Appointments />} />
              <Route path="/appointments/:id" element={<AppointmentDetails />} />
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
