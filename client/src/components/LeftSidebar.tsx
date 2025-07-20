import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/store/appStore";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import FileUpload from "@/components/FileUpload";
import { Plus, Briefcase, Users } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function LeftSidebar() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedJob, setSelectedJob } = useAppStore();

  // Fetch jobs
  const { data: jobs = [] } = useQuery({
    queryKey: ['/api/jobs'],
  });

  // Create new job mutation
  const createJobMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/jobs', {
        title: 'New Job',
        description: '# Job Description\n\nWrite your job description here...',
        requirements: { must: [], nice: [] },
        status: 'draft',
      });
    },
    onSuccess: (response) => {
      const newJob = response.json();
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      toast({
        title: "Success",
        description: "New job created successfully",
      });
      setLocation(`/jobs/${newJob.id}/editor`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create new job",
        variant: "destructive",
      });
    },
  });

  const getJobStatus = (status: string) => {
    switch (status) {
      case 'active':
        return { label: 'Active', variant: 'default' as const };
      case 'draft':
        return { label: 'Draft', variant: 'secondary' as const };
      case 'closed':
        return { label: 'Closed', variant: 'outline' as const };
      default:
        return { label: 'Unknown', variant: 'outline' as const };
    }
  };

  // Fetch candidate counts for all jobs
  const { data: candidateCounts = {} } = useQuery({
    queryKey: ['/api/jobs', 'candidate-counts'],
    select: (data) => data || {},
  });

  return (
    <div className="w-80 bg-surface border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-semibold text-text-primary">TalentMatch</h1>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto">
        {/* Jobs Section */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider">Jobs</h2>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => createJobMutation.mutate()}
              disabled={createJobMutation.isPending}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="space-y-1">
            {jobs.map((job: any) => {
              const status = getJobStatus(job.status);
              const candidateCount = candidateCounts[job.id] || 0;
              const isSelected = selectedJob?.id === job.id;
              
              return (
                <Card
                  key={job.id}
                  className={`p-3 cursor-pointer transition-colors hover:bg-accent ${
                    isSelected ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                  onClick={() => {
                    setSelectedJob(job);
                    setLocation(`/jobs/${job.id}`);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-text-primary truncate">
                        {job.title}
                      </h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <Users className="w-3 h-3 text-text-secondary" />
                        <p className="text-xs text-text-secondary">
                          {candidateCount} candidates
                        </p>
                      </div>
                    </div>
                    <Badge variant={status.variant} className="ml-2 text-xs">
                      {status.label}
                    </Badge>
                  </div>
                </Card>
              );
            })}
            
            {jobs.length === 0 && (
              <div className="text-center py-8">
                <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No jobs yet</p>
                <p className="text-xs text-gray-400">Create your first job posting</p>
              </div>
            )}
          </div>
        </div>

        {/* Upload Section */}
        <div className="p-4 border-t border-border">
          <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider mb-3">
            Upload CVs
          </h2>
          <FileUpload />
        </div>
      </div>
    </div>
  );
}
