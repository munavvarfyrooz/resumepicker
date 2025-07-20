import { useEffect } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/store/appStore";
import LeftSidebar from "@/components/LeftSidebar";
import RankingTable from "@/components/RankingTable";
import CandidateDrawer from "@/components/CandidateDrawer";
import FilterBar from "@/components/FilterBar";
import ScoreWeightsModal from "@/components/ScoreWeightsModal";
import { Button } from "@/components/ui/button";
import { Settings, Download } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

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
    <div className="flex h-screen overflow-hidden bg-background">
      <LeftSidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation */}
        <div className="bg-surface border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
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
            
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setWeightsModalOpen(true)}
              >
                <Settings className="w-4 h-4 mr-1" />
                Configure Weights
              </Button>
              
              <Button
                variant="default"
                size="sm"
                onClick={handleExportShortlist}
                disabled={selectedCandidateIds.length === 0}
                className="bg-success hover:bg-green-600"
              >
                <Download className="w-4 h-4 mr-1" />
                Export Shortlist ({selectedCandidateIds.length})
              </Button>
            </div>
          </div>
        </div>

        {view === 'ranking' && (
          <>
            <FilterBar />
            <div className="flex-1 overflow-hidden">
              {candidatesLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-gray-600">Loading candidates...</p>
                  </div>
                </div>
              ) : (
                <RankingTable />
              )}
            </div>
          </>
        )}
      </div>

      {candidateDrawerOpen && <CandidateDrawer />}
      {weightsModalOpen && <ScoreWeightsModal />}
    </div>
  );
}
