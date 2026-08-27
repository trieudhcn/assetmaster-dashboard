import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MobileTableControls } from "@/components/MobileTableControls";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import { LegacySectionLabelEnhancer } from "./components/LegacySectionLabelEnhancer";
import { MotionSettingsRelocator } from "./components/MotionSettingsRelocator";
import { SearchClearAffordance } from "./components/SearchClearAffordance";
import { RecoveryCertificatePdfShortcut } from "./components/RecoveryCertificatePdfShortcut";
import SetupInstaller from "./pages/SetupInstaller";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/setup"} component={SetupInstaller} />
      <Route path={"/"} component={Home} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <MobileTableControls />
          <LegacySectionLabelEnhancer />
          <MotionSettingsRelocator />
          <SearchClearAffordance />
          <RecoveryCertificatePdfShortcut />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
