import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/store/appStore";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Plus, X, Sparkles, Check, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";

export default function JDEditor() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedJob, setSelectedJob } = useAppStore();
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mustHaveSkills, setMustHaveSkills] = useState<string[]>([]);
  const [niceToHaveSkills, setNiceToHaveSkills] = useState<string[]>([]);
  const [newMustSkill, setNewMustSkill] = useState("");
  const [newNiceSkill, setNewNiceSkill] = useState("");
  const [previewMode, setPreviewMode] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<any>(null);

  // Fetch job details
  const { data: job, isLoading } = useQuery({
    queryKey: ['/api/jobs', selectedJob?.id || params.id],
    enabled: !!(selectedJob?.id || params.id),
  });

  // Initialize form when job loads
  useEffect(() => {
    const currentJob = job || selectedJob;
    if (currentJob) {
      if (!selectedJob) setSelectedJob(currentJob);
      setTitle(currentJob.title || "");
      setDescription(currentJob.description || "");
      if (currentJob.requirements) {
        setMustHaveSkills(currentJob.requirements.must || []);
        setNiceToHaveSkills(currentJob.requirements.nice || []);
      }
    }
  }, [job, selectedJob, setSelectedJob]);

  // Save job mutation
  // AI Analysis mutation
  const analyzeSkillsMutation = useMutation({
    mutationFn: async (description: string) => {
      const response = await fetch('/api/jobs/analyze-skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to analyze skills');
      }
      
      return await response.json();
    },
    onSuccess: (response) => {
      console.log('AI Analysis Response:', response); // Debug log
      const analysis = response;
      setAiAnalysisResult(analysis);
      
      // Update the skills arrays with AI results (avoiding duplicates with case-insensitive check)
      if (analysis.mustHaveSkills && Array.isArray(analysis.mustHaveSkills)) {
        setMustHaveSkills(prev => {
          const prevLower = prev.map(skill => skill.toLowerCase());
          const newSkills = analysis.mustHaveSkills.filter(skill => 
            !prevLower.includes(skill.toLowerCase())
          );
          return [...prev, ...newSkills];
        });
      }
      if (analysis.niceToHaveSkills && Array.isArray(analysis.niceToHaveSkills)) {
        setNiceToHaveSkills(prev => {
          const prevLower = prev.map(skill => skill.toLowerCase());
          const newSkills = analysis.niceToHaveSkills.filter(skill => 
            !prevLower.includes(skill.toLowerCase())
          );
          return [...prev, ...newSkills];
        });
      }
      
      const mustCount = analysis.mustHaveSkills?.length || 0;
      const niceCount = analysis.niceToHaveSkills?.length || 0;
      toast({
        title: "AI Analysis Complete",
        description: `Found ${mustCount} must-have and ${niceCount} nice-to-have skills`,
      });
    },
    onError: () => {
      toast({
        title: "Analysis Failed",
        description: "Could not analyze job description. Please try again.",
        variant: "destructive",
      });
    },
  });

  const saveJobMutation = useMutation({
    mutationFn: async (jobData: any) => {
      const currentJob = job || selectedJob;
      if (currentJob?.id) {
        return await apiRequest('PUT', `/api/jobs/${currentJob.id}`, jobData);
      } else {
        return await apiRequest('POST', '/api/jobs', jobData);
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Job description saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      if (job?.id) {
        queryClient.invalidateQueries({ queryKey: ['/api/jobs', job.id] });
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save job description",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    const jobData = {
      title,
      description,
      requirements: {
        must: mustHaveSkills,
        nice: niceToHaveSkills,
      },
      status: job?.status || 'active', // Default to active for new jobs
    };

    saveJobMutation.mutate(jobData);
  };

  const addMustSkill = () => {
    if (newMustSkill.trim() && !mustHaveSkills.includes(newMustSkill.trim())) {
      setMustHaveSkills([...mustHaveSkills, newMustSkill.trim()]);
      setNewMustSkill("");
    }
  };

  const addNiceSkill = () => {
    if (newNiceSkill.trim() && !niceToHaveSkills.includes(newNiceSkill.trim())) {
      setNiceToHaveSkills([...niceToHaveSkills, newNiceSkill.trim()]);
      setNewNiceSkill("");
    }
  };

  const removeMustSkill = (skill: string) => {
    setMustHaveSkills(mustHaveSkills.filter(s => s !== skill));
  };

  const removeNiceSkill = (skill: string) => {
    setNiceToHaveSkills(niceToHaveSkills.filter(s => s !== skill));
  };

  const handleAnalyzeSkills = () => {
    if (!description.trim()) {
      toast({
        title: "No Description",
        description: "Please write a job description first",
        variant: "destructive",
      });
      return;
    }
    analyzeSkillsMutation.mutate(description);
  };

  const applyAISkills = () => {
    if (aiAnalysisResult) {
      const newMustSkills = aiAnalysisResult.mustHaveSkills || [];
      const newNiceSkills = aiAnalysisResult.niceToHaveSkills || [];
      setMustHaveSkills([...new Set([...mustHaveSkills, ...newMustSkills])]);
      setNiceToHaveSkills([...new Set([...niceToHaveSkills, ...newNiceSkills])]);
      setAiAnalysisResult(null);
      toast({
        title: "Skills Applied",
        description: "AI-suggested skills have been added to your job requirements",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-gray-600">Loading job details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => setLocation('/')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-2xl font-bold text-text-primary">
              {job ? 'Edit Job Description' : 'Create New Job'}
            </h1>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={() => setPreviewMode(!previewMode)}
            >
              {previewMode ? 'Edit' : 'Preview'}
            </Button>
            <Button
              onClick={handleSave}
              disabled={saveJobMutation.isPending}
            >
              <Save className="w-4 h-4 mr-2" />
              {saveJobMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Editor Panel */}
          <div className="space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Job Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Senior React Developer"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Job Description */}
            <Card>
              <CardHeader>
                <CardTitle>Job Description (Markdown)</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Write your job description in Markdown..."
                  className="min-h-[300px] font-mono"
                />
              </CardContent>
            </Card>

            {/* Skills */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle>Skills & Requirements</CardTitle>
                <Button
                  onClick={handleAnalyzeSkills}
                  disabled={analyzeSkillsMutation.isPending || !description.trim()}
                  size="sm"
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  {analyzeSkillsMutation.isPending ? (
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  <span>AI Extract Skills</span>
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Must-have skills */}
                <div>
                  <Label className="text-base font-medium text-danger">Must-have Skills</Label>
                  <p className="text-sm text-gray-600 mb-3">Critical skills that candidates must possess</p>
                  <div className="flex space-x-2 mb-3">
                    <Input
                      value={newMustSkill}
                      onChange={(e) => setNewMustSkill(e.target.value)}
                      placeholder="Add a required skill..."
                      onKeyPress={(e) => e.key === 'Enter' && addMustSkill()}
                    />
                    <Button onClick={addMustSkill} size="sm">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {mustHaveSkills.map((skill) => (
                      <Badge key={skill} variant="destructive" className="flex items-center space-x-1">
                        <span>{skill}</span>
                        <button onClick={() => removeMustSkill(skill)}>
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Nice-to-have skills */}
                <div>
                  <Label className="text-base font-medium text-primary">Nice-to-have Skills</Label>
                  <p className="text-sm text-gray-600 mb-3">Additional skills that would be beneficial</p>
                  <div className="flex space-x-2 mb-3">
                    <Input
                      value={newNiceSkill}
                      onChange={(e) => setNewNiceSkill(e.target.value)}
                      placeholder="Add a nice-to-have skill..."
                      onKeyPress={(e) => e.key === 'Enter' && addNiceSkill()}
                    />
                    <Button onClick={addNiceSkill} size="sm">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {niceToHaveSkills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="flex items-center space-x-1">
                        <span>{skill}</span>
                        <button onClick={() => removeNiceSkill(skill)}>
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* AI Suggestions */}
                {aiAnalysisResult && (
                  <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Sparkles className="w-5 h-5 text-blue-600" />
                        <h3 className="font-medium text-blue-900 dark:text-blue-100">AI Skill Suggestions</h3>
                      </div>
                      <div className="flex space-x-2">
                        <Button onClick={applyAISkills} size="sm" variant="default">
                          <Check className="w-4 h-4 mr-1" />
                          Apply All
                        </Button>
                        <Button onClick={() => setAiAnalysisResult(null)} size="sm" variant="outline">
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      {aiAnalysisResult.mustHaveSkills && aiAnalysisResult.mustHaveSkills.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-2">Suggested Must-Have Skills:</p>
                          <div className="flex flex-wrap gap-2">
                            {aiAnalysisResult.mustHaveSkills.map((skill: string) => (
                              <Badge key={skill} variant="destructive" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {aiAnalysisResult.niceToHaveSkills && aiAnalysisResult.niceToHaveSkills.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">Suggested Nice-to-Have Skills:</p>
                          <div className="flex flex-wrap gap-2">
                            {aiAnalysisResult.niceToHaveSkills.map((skill: string) => (
                              <Badge key={skill} variant="secondary" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {aiAnalysisResult.reasoning && (
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                          <strong>AI Reasoning:</strong> {aiAnalysisResult.reasoning}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Preview Panel */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h2 className="text-xl font-bold text-text-primary">{title || 'Untitled Job'}</h2>
                  </div>
                  
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown>{description || '*No description provided*'}</ReactMarkdown>
                  </div>

                  {(mustHaveSkills.length > 0 || niceToHaveSkills.length > 0) && (
                    <div className="space-y-4 pt-4 border-t">
                      {mustHaveSkills.length > 0 && (
                        <div>
                          <h3 className="font-medium text-danger mb-2">Required Skills</h3>
                          <div className="flex flex-wrap gap-2">
                            {mustHaveSkills.map((skill) => (
                              <Badge key={skill} variant="destructive">{skill}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {niceToHaveSkills.length > 0 && (
                        <div>
                          <h3 className="font-medium text-primary mb-2">Nice to Have</h3>
                          <div className="flex flex-wrap gap-2">
                            {niceToHaveSkills.map((skill) => (
                              <Badge key={skill} variant="secondary">{skill}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
