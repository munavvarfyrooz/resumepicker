import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Mail, Send, AlertCircle, CheckCircle2 } from "lucide-react";

export default function EmailSettings() {
  const [testEmail, setTestEmail] = useState("");
  const { toast } = useToast();

  const testEmailMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await apiRequest("POST", "/api/test-email", { email });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Test email sent!",
        description: "Check your inbox for the test email.",
      });
      setTestEmail("");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send test email",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Email Settings</h1>
          <p className="text-muted-foreground mt-2">
            Configure SMTP settings for sending emails from ResumePicker
          </p>
        </div>

        <Alert className="border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-900">SMTP Configuration Required</AlertTitle>
          <AlertDescription className="text-amber-800 space-y-2 mt-2">
            <p>
              To enable email functionality, you need to set up SMTP credentials in your environment variables.
            </p>
            <p className="font-semibold mt-2">Required environment variables:</p>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li><code className="bg-amber-100 px-1">SMTP_USER</code> - Your email address</li>
              <li><code className="bg-amber-100 px-1">SMTP_PASS</code> - Your email password or app-specific password</li>
            </ul>
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Gmail Setup Instructions
            </CardTitle>
            <CardDescription>
              Gmail requires an app-specific password for security
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-600 text-sm font-semibold">1</span>
                <div>
                  <p className="font-medium">Enable 2-Factor Authentication</p>
                  <p className="text-sm text-muted-foreground">Go to your Google Account security settings and enable 2FA</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-600 text-sm font-semibold">2</span>
                <div>
                  <p className="font-medium">Generate App Password</p>
                  <p className="text-sm text-muted-foreground">
                    Visit <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      myaccount.google.com/apppasswords
                    </a>
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-600 text-sm font-semibold">3</span>
                <div>
                  <p className="font-medium">Select "Mail" as the app</p>
                  <p className="text-sm text-muted-foreground">Choose "Mail" from the dropdown menu</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-600 text-sm font-semibold">4</span>
                <div>
                  <p className="font-medium">Use the generated password</p>
                  <p className="text-sm text-muted-foreground">
                    Copy the 16-character password and use it as <code className="bg-gray-100 px-1">SMTP_PASS</code>
                  </p>
                </div>
              </div>
            </div>

            <Alert className="border-blue-200 bg-blue-50">
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-900">
                <strong>Important:</strong> Use the app-specific password, not your regular Gmail password
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Test Email Configuration
            </CardTitle>
            <CardDescription>
              Send a test email to verify your SMTP settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="test-email">Email Address</Label>
              <Input
                id="test-email"
                type="email"
                placeholder="test@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                disabled={testEmailMutation.isPending}
              />
            </div>
            <Button
              onClick={() => testEmailMutation.mutate(testEmail)}
              disabled={!testEmail || testEmailMutation.isPending}
              className="w-full sm:w-auto"
            >
              <Send className="h-4 w-4 mr-2" />
              {testEmailMutation.isPending ? "Sending..." : "Send Test Email"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Other Email Providers</CardTitle>
            <CardDescription>
              Configuration for popular email services
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h3 className="font-medium">Outlook / Hotmail</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>Host: smtp-mail.outlook.com</li>
                  <li>Port: 587</li>
                  <li>Use regular password or app password if 2FA enabled</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-medium">Yahoo Mail</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>Host: smtp.mail.yahoo.com</li>
                  <li>Port: 587</li>
                  <li>Generate app password from account security</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-medium">Custom SMTP</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>Set <code className="bg-gray-100 px-1">SMTP_HOST</code></li>
                  <li>Set <code className="bg-gray-100 px-1">SMTP_PORT</code></li>
                  <li>Set <code className="bg-gray-100 px-1">SMTP_SECURE</code> (true/false)</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}