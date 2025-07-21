import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Users, BarChart3, Upload, Zap, Shield } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Users className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">SmartHire</h1>
          </div>
          <Button 
            onClick={() => window.location.href = '/api/login'}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Sign In
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <Badge variant="secondary" className="mb-4">
            🚀 AI-Powered Recruitment
          </Badge>
          <h2 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            Intelligent CV Ranking &
            <span className="text-blue-600 block">Job Matching Platform</span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
            Streamline your recruitment process with AI-powered candidate evaluation, 
            bulk resume uploads, and intelligent matching algorithms.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={() => window.location.href = '/api/login'}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
            >
              Get Started Free
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="px-8 py-3"
            >
              Watch Demo
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mt-20">
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-4">
                <Upload className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle>Bulk Resume Upload</CardTitle>
              <CardDescription>
                Upload up to 20 resumes simultaneously with automatic duplicate detection and parsing.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <CardTitle>AI-Powered Ranking</CardTitle>
              <CardDescription>
                Dual ranking system with configurable algorithmic scoring and OpenAI-powered intelligence.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle>Smart Analytics</CardTitle>
              <CardDescription>
                Comprehensive analytics dashboard with user management and usage statistics.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center mb-4">
                <CheckCircle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <CardTitle>Transparent Scoring</CardTitle>
              <CardDescription>
                Configurable scoring weights with detailed explanations for every candidate evaluation.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <CardTitle>Shortlist Management</CardTitle>
              <CardDescription>
                Organized candidate management with export functionality and comprehensive filtering.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <CardTitle>Secure Authentication</CardTitle>
              <CardDescription>
                Enterprise-grade security with role-based access control and session management.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Stats Section */}
        <div className="mt-20 py-16 bg-white dark:bg-gray-800 rounded-3xl shadow-lg">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Trusted by Recruitment Professionals
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Join thousands of recruiters who have streamlined their hiring process
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">50K+</div>
              <div className="text-gray-600 dark:text-gray-300">Resumes Processed</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-600 dark:text-purple-400 mb-2">95%</div>
              <div className="text-gray-600 dark:text-gray-300">Accuracy Rate</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-green-600 dark:text-green-400 mb-2">2H</div>
              <div className="text-gray-600 dark:text-gray-300">Time Saved</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-orange-600 dark:text-orange-400 mb-2">24/7</div>
              <div className="text-gray-600 dark:text-gray-300">Support</div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-20 text-center">
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Ready to transform your recruitment process?
          </h3>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            Get started with SmartHire today and experience the future of intelligent recruitment.
          </p>
          <Button 
            size="lg" 
            onClick={() => window.location.href = '/api/login'}
            className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-4 text-lg"
          >
            Start Your Free Trial
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 mt-20 border-t border-gray-200 dark:border-gray-700">
        <div className="text-center text-gray-600 dark:text-gray-300">
          <p>&copy; 2024 SmartHire. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}