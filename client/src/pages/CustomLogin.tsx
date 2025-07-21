import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Shield, ArrowRight } from "lucide-react";

export default function CustomLogin() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          {/* Logo/Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">SmartHire</h1>
            <p className="text-gray-600 dark:text-gray-300">
              Sign in to access your recruitment dashboard
            </p>
          </div>

          {/* Login Card */}
          <Card className="border-0 shadow-xl">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Welcome Back</CardTitle>
              <CardDescription>
                Continue to your SmartHire dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Secure Login Badge */}
              <div className="flex items-center justify-center space-x-2 p-3 bg-green-50 dark:bg-green-900 rounded-lg">
                <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
                <span className="text-sm text-green-700 dark:text-green-300">
                  Secure Enterprise Authentication
                </span>
              </div>

              {/* Login Button */}
              <Button 
                onClick={() => window.location.href = '/api/login'}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg"
                size="lg"
              >
                Sign In to SmartHire
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>

              {/* Features */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-300 text-center mb-3">
                  Access your features:
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <div>✓ AI-Powered Ranking</div>
                  <div>✓ Bulk CV Upload</div>
                  <div>✓ Smart Analytics</div>
                  <div>✓ Secure Access</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center mt-8">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Protected by enterprise-grade security
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}