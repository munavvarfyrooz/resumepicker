import { create } from 'zustand';
import { type Job, type CandidateWithScore, type ScoreWeights } from '@shared/schema';

interface AppState {
  // Jobs
  jobs: Job[];
  selectedJob: Job | null;
  setJobs: (jobs: Job[]) => void;
  setSelectedJob: (job: Job | null) => void;
  
  // Candidates
  candidates: CandidateWithScore[];
  selectedCandidate: CandidateWithScore | null;
  setCandidates: (candidates: CandidateWithScore[]) => void;
  setSelectedCandidate: (candidate: CandidateWithScore | null) => void;
  
  // UI State
  view: 'ranking' | 'jd-editor';
  candidateDrawerOpen: boolean;
  weightsModalOpen: boolean;
  selectedCandidateIds: number[];
  sidebarCollapsed: boolean;
  setView: (view: 'ranking' | 'jd-editor') => void;
  setCandidateDrawerOpen: (open: boolean) => void;
  setWeightsModalOpen: (open: boolean) => void;
  setSelectedCandidateIds: (ids: number[]) => void;
  toggleCandidateSelection: (id: number) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  
  // Filters
  filters: {
    minYears: number | null;
    skills: string[];
    noMissingMust: boolean;
  };
  setFilters: (filters: Partial<AppState['filters']>) => void;
  
  // Score weights
  scoreWeights: ScoreWeights;
  setScoreWeights: (weights: ScoreWeights) => void;
  
  // Upload state
  uploadProgress: Array<{
    fileName: string;
    status: 'uploading' | 'processing' | 'success' | 'error';
    message?: string;
  }>;
  setUploadProgress: (progress: AppState['uploadProgress']) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  jobs: [],
  selectedJob: null,
  candidates: [],
  selectedCandidate: null,
  view: 'ranking',
  candidateDrawerOpen: false,
  weightsModalOpen: false,
  selectedCandidateIds: [],
  sidebarCollapsed: false,
  filters: {
    minYears: null,
    skills: [],
    noMissingMust: false,
  },
  scoreWeights: {
    skills: 0.5,
    title: 0.2,
    seniority: 0.15,
    recency: 0.1,
    gaps: 0.05,
  },
  uploadProgress: [],

  // Actions
  setJobs: (jobs) => set({ jobs }),
  setSelectedJob: (job) => set({ selectedJob: job }),
  setCandidates: (candidates) => set({ candidates }),
  setSelectedCandidate: (candidate) => set({ 
    selectedCandidate: candidate,
    candidateDrawerOpen: !!candidate 
  }),
  setView: (view) => set({ view }),
  setCandidateDrawerOpen: (open) => set({ candidateDrawerOpen: open }),
  setWeightsModalOpen: (open) => set({ weightsModalOpen: open }),
  setSelectedCandidateIds: (ids) => set({ selectedCandidateIds: ids }),
  toggleCandidateSelection: (id) => set((state) => ({
    selectedCandidateIds: state.selectedCandidateIds.includes(id)
      ? state.selectedCandidateIds.filter(candidateId => candidateId !== id)
      : [...state.selectedCandidateIds, id]
  })),
  setFilters: (newFilters) => set((state) => ({
    filters: { ...state.filters, ...newFilters }
  })),
  setScoreWeights: (weights) => set({ scoreWeights: weights }),
  setUploadProgress: (progress) => set({ uploadProgress: progress }),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
}));
