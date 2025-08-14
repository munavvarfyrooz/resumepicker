import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, BarChart3, Activity, TrendingUp, UserCheck, UserX, Crown, Calendar, Lock, Shield } from "lucide-react";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { User, UserStats, UsageStats, UserUsageDetail } from "@shared/schema";

// Password change schema
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm your new password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ChangePasswordForm = z.infer<typeof changePasswordSchema>;

export default function AdminDashboard() {
  const { toast } = useToast();
  const { user: currentUser, isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();

  // Password change form
  const passwordForm = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || currentUser?.role !== 'admin')) {
      toast({
        title: "Access Required",
        description: "Admin access required. Redirecting to login...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, currentUser, toast]);

  // Data fetching
  const { data: users = [] as User[], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    retry: false,
    enabled: !!currentUser && currentUser.role === 'admin',
  });

  const { data: userStats, isLoading: userStatsLoading } = useQuery<UserStats>({
    queryKey: ["/api/admin/stats/users"],
    retry: false,
    enabled: !!currentUser && currentUser.role === 'admin',
  });

  const { data: usageStats, isLoading: usageStatsLoading } = useQuery<UsageStats>({
    queryKey: ["/api/admin/stats/usage"],
    retry: false,
    enabled: !!currentUser && currentUser.role === 'admin',
  });

  const { data: userUsageDetails = [] as UserUsageDetail[], isLoading: userUsageLoading } = useQuery<UserUsageDetail[]>({
    queryKey: ["/api/admin/users/usage"],
    retry: false,
    enabled: !!currentUser && currentUser.role === 'admin',
  });

  // Mutations
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'user' | 'admin' }) => {
      await apiRequest("PATCH", `/api/admin/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats/users"] });
      toast({
        title: "Success",
        description: "User role updated successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "Session expired. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      await apiRequest("PATCH", `/api/admin/users/${userId}/status`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats/users"] });
      toast({
        title: "Success",
        description: "User status updated successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "Session expired. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update user status",
        variant: "destructive",
      });
    },
  });

  // Password change mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: ChangePasswordForm) => {
      const response = await apiRequest("POST", "/api/auth/change-password", {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Password Updated",
        description: "Your password has been changed successfully.",
      });
      passwordForm.reset();
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Session Expired",
          description: "Please log in again to continue.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Password Change Failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    },
  });

  const onPasswordSubmit = (data: ChangePasswordForm) => {
    changePasswordMutation.mutate(data);
  };

  if (isLoading || !currentUser || currentUser.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                <Crown className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
                <p className="text-sm text-gray-600 dark:text-gray-300">System management and analytics</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => window.location.href = '/'}
              >
                Back to Main App
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    const response = await fetch('/api/logout', { method: 'POST' });
                    if (response.ok) {
                      window.location.href = '/';
                    }
                  } catch (error) {
                    console.error('Logout failed:', error);
                    window.location.href = '/api/logout';
                  }
                }}
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Stats Overview */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userStats?.totalUsers || 0}</div>
              <p className="text-xs text-muted-foreground">
                {userStats?.newUsersThisWeek || 0} new this week
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userStats?.activeUsers || 0}</div>
              <p className="text-xs text-muted-foreground">
                Currently active accounts
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{usageStats?.totalJobs || 0}</div>
              <p className="text-xs text-muted-foreground">
                {usageStats?.avgCandidatesPerJob || 0} avg candidates/job
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Candidates Processed</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{usageStats?.totalCandidates || 0}</div>
              <p className="text-xs text-muted-foreground">
                {usageStats?.totalUploads || 0} total uploads
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-500">
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="usage">Usage Details</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          {/* User Management Tab */}
          <TabsContent value="users">
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  Manage user roles, permissions, and account status
                </CardDescription>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Login</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user: User) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              {user.profileImageUrl && (
                                <img 
                                  src={user.profileImageUrl} 
                                  alt="Profile" 
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                              )}
                              <div>
                                <div className="font-medium">
                                  {user.firstName} {user.lastName}
                                </div>
                                <div className="text-sm text-gray-500">ID: {user.id}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Select
                              value={user.role}
                              onValueChange={(role: 'user' | 'admin') => 
                                updateRoleMutation.mutate({ userId: user.id, role })
                              }
                              disabled={updateRoleMutation.isPending}
                            >
                              <SelectTrigger className="w-24">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="user">User</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Switch
                                checked={user.isActive}
                                onCheckedChange={(isActive) => 
                                  updateStatusMutation.mutate({ userId: user.id, isActive })
                                }
                                disabled={updateStatusMutation.isPending}
                              />
                              <Badge variant={user.isActive ? "default" : "secondary"}>
                                {user.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            {user.lastLoginAt ? (
                              <div className="text-sm">
                                {format(new Date(user.lastLoginAt), 'MMM dd, yyyy')}
                                <div className="text-xs text-gray-500">
                                  {format(new Date(user.lastLoginAt), 'HH:mm')}
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400">Never</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {user.role === 'admin' && (
                                <Badge variant="outline" className="text-purple-600 border-purple-300">
                                  <Crown className="h-3 w-3 mr-1" />
                                  Admin
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle>User Statistics</CardTitle>
                  <CardDescription>Overview of user accounts and activity</CardDescription>
                </CardHeader>
                <CardContent>
                  {userStatsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
                        <div>
                          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {userStats?.totalUsers || 0}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-300">Total Users</div>
                        </div>
                        <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                      </div>
                      
                      <div className="flex justify-between items-center p-4 bg-green-50 dark:bg-green-900 rounded-lg">
                        <div>
                          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                            {userStats?.activeUsers || 0}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-300">Active Users</div>
                        </div>
                        <UserCheck className="h-8 w-8 text-green-600 dark:text-green-400" />
                      </div>
                      
                      <div className="flex justify-between items-center p-4 bg-purple-50 dark:bg-purple-900 rounded-lg">
                        <div>
                          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                            {userStats?.adminUsers || 0}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-300">Admin Users</div>
                        </div>
                        <Crown className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle>System Usage</CardTitle>
                  <CardDescription>Platform activity and performance metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  {usageStatsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-4 bg-orange-50 dark:bg-orange-900 rounded-lg">
                        <div>
                          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                            {usageStats?.totalJobs || 0}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-300">Total Jobs</div>
                        </div>
                        <BarChart3 className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                      </div>
                      
                      <div className="flex justify-between items-center p-4 bg-indigo-50 dark:bg-indigo-900 rounded-lg">
                        <div>
                          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                            {usageStats?.totalCandidates || 0}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-300">Total Candidates</div>
                        </div>
                        <Users className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      
                      <div className="flex justify-between items-center p-4 bg-red-50 dark:bg-red-900 rounded-lg">
                        <div>
                          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                            {usageStats?.avgCandidatesPerJob || 0}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-300">Avg Candidates/Job</div>
                        </div>
                        <TrendingUp className="h-8 w-8 text-red-600 dark:text-red-400" />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Usage Details Tab */}
          <TabsContent value="usage">
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle>User Usage Details</CardTitle>
                <CardDescription>
                  Detailed breakdown of user activity and engagement
                </CardDescription>
              </CardHeader>
              <CardContent>
                {userUsageLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Jobs Created</TableHead>
                        <TableHead>Candidates Uploaded</TableHead>
                        <TableHead>Total Sessions</TableHead>
                        <TableHead>Last Activity</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userUsageDetails.map((detail: UserUsageDetail) => (
                        <TableRow key={detail.user.id}>
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              {detail.user.profileImageUrl && (
                                <img 
                                  src={detail.user.profileImageUrl} 
                                  alt="Profile" 
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                              )}
                              <div>
                                <div className="font-medium">
                                  {detail.user.firstName} {detail.user.lastName}
                                </div>
                                <div className="text-sm text-gray-500">{detail.user.email}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{detail.jobsCreated}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{detail.candidatesUploaded}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{detail.totalSessions}</Badge>
                          </TableCell>
                          <TableCell>
                            {detail.lastActivity ? (
                              <div className="text-sm">
                                {format(new Date(detail.lastActivity), 'MMM dd, yyyy')}
                                <div className="text-xs text-gray-500">
                                  {format(new Date(detail.lastActivity), 'HH:mm')}
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400">Never</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Lock className="h-5 w-5" />
                    <span>Change Password</span>
                  </CardTitle>
                  <CardDescription>
                    Update your admin account password for enhanced security
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...passwordForm}>
                    <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                      <FormField
                        control={passwordForm.control}
                        name="currentPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Current Password</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="Enter your current password"
                                {...field}
                                data-testid="input-current-password"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={passwordForm.control}
                        name="newPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>New Password</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="Enter your new password (min 6 characters)"
                                {...field}
                                data-testid="input-new-password"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={passwordForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm New Password</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="Confirm your new password"
                                {...field}
                                data-testid="input-confirm-password"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button
                        type="submit"
                        disabled={changePasswordMutation.isPending}
                        className="w-full"
                        data-testid="button-change-password"
                      >
                        {changePasswordMutation.isPending ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Updating Password...
                          </>
                        ) : (
                          <>
                            <Lock className="h-4 w-4 mr-2" />
                            Change Password
                          </>
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Shield className="h-5 w-5" />
                    <span>Security Information</span>
                  </CardTitle>
                  <CardDescription>
                    Current security settings and best practices
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-green-50 dark:bg-green-900 rounded-lg border border-green-200 dark:border-green-700">
                    <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">Current Security Status</h4>
                    <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                      <li>✅ Strong password hashing (bcrypt)</li>
                      <li>✅ Session-based authentication</li>
                      <li>✅ PostgreSQL session storage</li>
                      <li>✅ Admin role protection</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-blue-50 dark:bg-blue-900 rounded-lg border border-blue-200 dark:border-blue-700">
                    <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">Password Requirements</h4>
                    <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                      <li>• Minimum 6 characters length</li>
                      <li>• Use a mix of letters, numbers & symbols</li>
                      <li>• Avoid common passwords</li>
                      <li>• Change regularly for security</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900 rounded-lg border border-yellow-200 dark:border-yellow-700">
                    <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">Security Tips</h4>
                    <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                      <li>• Always log out when finished</li>
                      <li>• Don't share admin credentials</li>
                      <li>• Monitor user activity regularly</li>
                      <li>• Update passwords after team changes</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}