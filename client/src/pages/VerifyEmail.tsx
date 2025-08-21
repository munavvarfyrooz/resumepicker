import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const [verifying, setVerifying] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyToken = async () => {
      try {
        // Get token from URL
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');
        
        if (!token) {
          setError("No verification token provided");
          setVerifying(false);
          return;
        }

        // Send verification request
        const response = await apiRequest("POST", "/api/verify-email", { token });
        const data = await response.json();
        
        setSuccess(true);
        setVerifying(false);
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          setLocation("/auth");
        }, 3000);
      } catch (err: any) {
        setError(err.message || "Failed to verify email");
        setVerifying(false);
      }
    };

    verifyToken();
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Email Verification</CardTitle>
          <CardDescription>Confirming your email address</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {verifying && (
            <div className="flex flex-col items-center justify-center space-y-4 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-gray-600">Verifying your email address...</p>
            </div>
          )}

          {success && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>Email verified successfully!</strong>
                <br />
                You will be redirected to the login page in a moment...
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <>
              <Alert className="border-red-200 bg-red-50">
                <XCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <strong>Verification failed</strong>
                  <br />
                  {error}
                </AlertDescription>
              </Alert>
              <div className="flex gap-2">
                <Button 
                  onClick={() => setLocation("/auth")}
                  className="flex-1"
                >
                  Go to Login
                </Button>
                <Button 
                  onClick={() => setLocation("/auth")}
                  variant="outline"
                  className="flex-1"
                >
                  Request New Link
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}