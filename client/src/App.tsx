import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Dashboard from "@/pages/Dashboard";
import JDEditor from "@/pages/JDEditor";
import Landing from "@/pages/Landing";
import Home from "@/pages/Home";
import AdminDashboard from "@/pages/AdminDashboard";
import AuthPage from "@/pages/AuthPage";
import BlogManagement from "@/pages/BlogManagement";
import BeautifulBlog from "@/pages/BeautifulBlog";
import BeautifulBlogPost from "@/pages/BeautifulBlogPost";
import ChangePassword from "@/pages/ChangePassword";
import VerifyEmail from "@/pages/VerifyEmail";
import NotFound from "@/pages/not-found";
import { useEffect } from "react";
import { initGA } from "./lib/analytics";
import { useAnalytics } from "./hooks/use-analytics";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  
  // Track page views when routes change
  useAnalytics();

  return (
    <Switch>
      {/* Public routes - accessible without authentication */}
      <Route path="/blog" component={BeautifulBlog} />
      <Route path="/blog/:slug" component={BeautifulBlogPost} />
      <Route path="/verify-email" component={VerifyEmail} />
      
      {isLoading || !isAuthenticated ? (
        <>
          <Route path="/" component={Landing} />
          <Route path="/auth" component={AuthPage} />
        </>
      ) : (
        <>
          <Route path="/" component={Home} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/jobs/:id" component={Dashboard} />
          <Route path="/jobs/:id/editor" component={JDEditor} />
          <Route path="/admin" component={AdminDashboard} />
          <Route path="/blog-management" component={BlogManagement} />
          <Route path="/blog-view" component={BeautifulBlog} />
          <Route path="/change-password" component={ChangePassword} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Initialize Google Analytics when app loads
  useEffect(() => {
    // Verify required environment variable is present
    if (!import.meta.env.VITE_GA_MEASUREMENT_ID) {
      console.warn('Missing required Google Analytics key: VITE_GA_MEASUREMENT_ID');
    } else {
      initGA();
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
