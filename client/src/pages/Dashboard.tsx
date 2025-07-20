import React, { useEffect, useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/store/appStore";
import LeftSidebar from "@/components/LeftSidebar";
import RankingTable from "@/components/RankingTable";
import CandidateDrawer from "@/components/CandidateDrawer";
import CandidateModal from "@/components/CandidateModal";
import FilterBar from "@/components/FilterBar";
import ScoreWeightsModal from "@/components/ScoreWeightsModal";
import JDEditor from "./JDEditor";
import { Button } from "@/components/ui/button";
import { Settings, Download, Briefcase, Loader2, Brain } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const params = useParams();
  const {
    selectedJob,
    setSelectedJob,
    candidates,
    setCandidates,
    candidateDrawerOpen,
    weightsModalOpen,
    setWeightsModalOpen,
    selectedCandidateIds,
    selectedCandidate,
    view,
    setView,
    sidebarCollapsed,
    setSidebarCollapsed,
  } = useAppStore();

  // Fetch jobs
  const { data: jobs = [] } = useQuery({
    queryKey: ['/api/jobs'],
    select: (data: any) => Array.isArray(data) ? data : [],
  });

  // Fetch candidates for selected job
  const { data: jobCandidates = [], isLoading: candidatesLoading } = useQuery({
    queryKey: ['/api/jobs', selectedJob?.id, 'candidates'],
    enabled: !!selectedJob,
    select: (data: any) => Array.isArray(data) ? data : [],
  });

  // Set initial job if ID in URL
  useEffect(() => {
    if (params.id && Array.isArray(jobs) && jobs.length > 0) {
      const job = jobs.find((j: any) => j.id === parseInt(params.id!));
      if (job) {
        setSelectedJob(job);
      }
    } else if (Array.isArray(jobs) && jobs.length > 0) {
      setSelectedJob(jobs[0]);
    }
  }, [params.id, JSON.stringify(jobs)]);

  // Update candidates when data changes
  useEffect(() => {
    if (Array.isArray(jobCandidates) && jobCandidates.length >= 0) {
      setCandidates(jobCandidates);
    }
  }, [JSON.stringify(jobCandidates)]);

  const handleExportShortlist = async () => {
    if (!selectedJob || selectedCandidateIds.length === 0) return;

    try {
      const response = await fetch('/api/export/shortlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          candidateIds: selectedCandidateIds,
          jobId: selectedJob.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to export shortlist');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'shortlist.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export successful",
        description: `Shortlist with ${selectedCandidateIds.length} candidates has been downloaded.`,
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: "Export failed",
        description: "Unable to export the shortlist. Please try again.",
        variant: "destructive",
      });
    }
  };

  const [isCalculatingScores, setIsCalculatingScores] = useState(false);
  const [isAIRanking, setIsAIRanking] = useState(false);
  const { toast } = useToast();

  const handleCalculateScores = async () => {
    if (!selectedJob || isCalculatingScores) return;

    setIsCalculatingScores(true);
    
    toast({
      title: "Calculating Scores",
      description: "Processing candidate rankings with AI analysis...",
    });

    try {
      await apiRequest('POST', `/api/jobs/${selectedJob.id}/rescore`, {
        weights: {
          skills: 0.5,
          title: 0.2,
          seniority: 0.15,
          recency: 0.1,
          gaps: 0.05,
        },
      });
      
      // Invalidate and refetch candidates data
      queryClient.invalidateQueries({ queryKey: ['/api/jobs', selectedJob.id, 'candidates'] });
      
      toast({
        title: "Scores Updated",
        description: "All candidate rankings have been recalculated successfully",
      });
    } catch (error) {
      console.error('Failed to calculate scores:', error);
      toast({
        title: "Calculation Failed",
        description: "Unable to calculate scores. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCalculatingScores(false);
    }
  };

  const handleAIRanking = async () => {
    if (!selectedJob || isAIRanking) return;

    setIsAIRanking(true);
    
    toast({
      title: "AI Ranking in Progress",
      description: "OpenAI is analyzing candidates and generating intelligent rankings...",
    });

    try {
      await apiRequest('POST', `/api/jobs/${selectedJob.id}/ai-rank`);
      
      // Invalidate and refetch candidates data
      queryClient.invalidateQueries({ queryKey: ['/api/jobs', selectedJob.id, 'candidates'] });
      
      toast({
        title: "AI Ranking Complete",
        description: "Intelligent rankings have been generated using OpenAI analysis",
      });
    } catch (error) {
      console.error('Failed to generate AI rankings:', error);
      toast({
        title: "AI Ranking Failed",
        description: "Unable to generate AI rankings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAIRanking(false);
    }
  };

  if (!selectedJob) {
    return (
      <div className="flex h-screen">
        <LeftSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No job selected</h2>
            <p className="text-gray-600">Please select a job from the sidebar to view candidates</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-surface border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-lg font-semibold text-text-primary">TalentMatch</h1>
          </div>
          <div className="flex space-x-1">
            <Button
              variant={view === 'ranking' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('ranking')}
            >
              Ranking
            </Button>
            <Button
              variant={view === 'jd-editor' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('jd-editor')}
            >
              Edit
            </Button>
          </div>
        </div>
      </div>

      {/* Sidebar - Hidden on mobile, collapsible on desktop */}
      <div className={`hidden md:block transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-80'}`}>
        <LeftSidebar />
      </div>
      
      <div className="flex-1 flex flex-col min-h-0">
        {/* Desktop Top Navigation */}
        <div className="hidden md:block bg-surface border-b border-border px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-2 hover:bg-gray-100"
                title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={sidebarCollapsed ? "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" : "M4 6h16M4 12h8m-8 6h16"}
                  />
                </svg>
              </Button>
              <h1 className="text-lg font-semibold text-text-primary">{selectedJob.title}</h1>
              <div className="flex space-x-2">
                <Button
                  variant={view === 'ranking' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setView('ranking')}
                >
                  Ranking
                </Button>
                <Button
                  variant={view === 'jd-editor' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setView('jd-editor')}
                >
                  Edit JD
                </Button>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCalculateScores}
                disabled={isCalculatingScores}
                className="text-xs md:text-sm"
              >
                {isCalculatingScores ? (
                  <Loader2 className="w-3 h-3 md:w-4 md:h-4 mr-1 animate-spin" />
                ) : (
                  <Settings className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                )}
                <span className="hidden sm:inline">
                  {isCalculatingScores ? "Calculating..." : "Manual Rank"}
                </span>
                <span className="sm:hidden">
                  {isCalculatingScores ? "Calc..." : "Manual"}
                </span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleAIRanking}
                disabled={isAIRanking}
                className="text-xs md:text-sm bg-gradient-to-r from-purple-50 to-blue-50 hover:from-purple-100 hover:to-blue-100 border-purple-200"
              >
                {isAIRanking ? (
                  <Loader2 className="w-3 h-3 md:w-4 md:h-4 mr-1 animate-spin" />
                ) : (
                  <Brain className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                )}
                <span className="hidden sm:inline">
                  {isAIRanking ? "AI Ranking..." : "AI Rank"}
                </span>
                <span className="sm:hidden">
                  {isAIRanking ? "AI..." : "AI"}
                </span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setWeightsModalOpen(true)}
                className="text-xs md:text-sm"
              >
                <Settings className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                <span className="hidden sm:inline">Configure Weights</span>
                <span className="sm:hidden">Config</span>
              </Button>
              
              <Button
                variant="default"
                size="sm"
                onClick={handleExportShortlist}
                disabled={selectedCandidateIds.length === 0}
                className="bg-success hover:bg-green-600 text-xs md:text-sm"
              >
                <Download className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                <span className="hidden sm:inline">Export Shortlist ({selectedCandidateIds.length})</span>
                <span className="sm:hidden">Export ({selectedCandidateIds.length})</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Action Bar */}
        <div className="md:hidden bg-surface border-b border-border px-4 py-2">
          <div className="flex items-center justify-between space-x-2">
            <div className="text-sm font-medium text-text-primary truncate">
              {selectedJob.title}
            </div>
            <div className="flex items-center space-x-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCalculateScores}
                disabled={isCalculatingScores}
                className="text-xs px-2"
              >
                {isCalculatingScores ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Settings className="w-3 h-3" />
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setWeightsModalOpen(true)}
                className="text-xs px-2"
              >
                Config
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleExportShortlist}
                disabled={selectedCandidateIds.length === 0}
                className="bg-success hover:bg-green-600 text-xs px-2"
              >
                Export ({selectedCandidateIds.length})
              </Button>
            </div>
          </div>
        </div>

        {view === 'ranking' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <FilterBar />
            <div className="flex-1 h-full min-h-0 overflow-hidden">
              {candidatesLoading ? (
                <div className="flex items-center justify-center h-full min-h-[200px]">
                  <div className="text-center">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-gray-600">Loading candidates...</p>
                  </div>
                </div>
              ) : (
                <div className="flex h-full relative">
                  <div className="flex-1 overflow-hidden">
                    <RankingTable />
                  </div>
                  {selectedCandidate && (
                    <div className="w-96 flex-shrink-0 border-l border-gray-200 bg-white">
                      <CandidateDrawer />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'jd-editor' && (
          <div className="flex-1 overflow-auto">
            <JDEditor />
          </div>
        )}
      </div>


      {weightsModalOpen && <ScoreWeightsModal />}
      <CandidateModal />
    </div>
  );
}
