import { useEffect } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/store/appStore";
import LeftSidebar from "@/components/LeftSidebar";
import RankingTable from "@/components/RankingTable";
import CandidateDrawer from "@/components/CandidateDrawer";
import FilterBar from "@/components/FilterBar";
import ScoreWeightsModal from "@/components/ScoreWeightsModal";
import JDEditor from "./JDEditor";
import { Button } from "@/components/ui/button";
import { Settings, Download, Briefcase } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

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
    view,
    setView,
  } = useAppStore();

  // Fetch jobs
  const { data: jobs } = useQuery({
    queryKey: ['/api/jobs'],
    select: (data) => data || [],
  });

  // Fetch candidates for selected job
  const { data: jobCandidates, isLoading: candidatesLoading } = useQuery({
    queryKey: ['/api/jobs', selectedJob?.id, 'candidates'],
    enabled: !!selectedJob,
    select: (data) => data || [],
  });

  // Set initial job if ID in URL
  useEffect(() => {
    if (params.id && jobs) {
      const job = jobs.find((j: any) => j.id === parseInt(params.id));
      if (job) {
        setSelectedJob(job);
      }
    } else if (jobs && jobs.length > 0 && !selectedJob) {
      setSelectedJob(jobs[0]);
    }
  }, [params.id, jobs, selectedJob, setSelectedJob]);

  // Update candidates when data changes
  useEffect(() => {
    if (jobCandidates) {
      setCandidates(jobCandidates);
    }
  }, [jobCandidates, setCandidates]);

  const handleExportShortlist = async () => {
    if (!selectedJob || selectedCandidateIds.length === 0) return;

    try {
      const response = await apiRequest('POST', '/api/export/shortlist', {
        candidateIds: selectedCandidateIds,
        jobId: selectedJob.id,
      });

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'shortlist.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleCalculateScores = async () => {
    if (!selectedJob) return;

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
    } catch (error) {
      console.error('Failed to calculate scores:', error);
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

      {/* Sidebar - Hidden on mobile, visible on desktop */}
      <div className="hidden md:block">
        <LeftSidebar />
      </div>
      
      <div className="flex-1 flex flex-col min-h-0">
        {/* Desktop Top Navigation */}
        <div className="hidden md:block bg-surface border-b border-border px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center space-x-4">
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
                className="text-xs md:text-sm"
              >
                <Settings className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                <span className="hidden sm:inline">Calculate Scores</span>
                <span className="sm:hidden">Calc</span>
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
                className="text-xs px-2"
              >
                <Settings className="w-3 h-3" />
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
          <div className="flex-1 flex flex-col overflow-hidden">
            <FilterBar />
            <div className="flex-1 overflow-auto">
              {candidatesLoading ? (
                <div className="flex items-center justify-center h-full min-h-[200px]">
                  <div className="text-center">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-gray-600">Loading candidates...</p>
                  </div>
                </div>
              ) : (
                <RankingTable />
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

      {candidateDrawerOpen && <CandidateDrawer />}
      {weightsModalOpen && <ScoreWeightsModal />}
    </div>
  );
}
