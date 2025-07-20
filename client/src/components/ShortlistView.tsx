import { useAppStore } from "@/store/appStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Download, X, UserMinus, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ShortlistView() {
  const { candidates, selectedCandidateIds, toggleCandidateSelection, setSelectedCandidate, selectedJob } = useAppStore();
  const { toast } = useToast();

  const shortlistedCandidates = candidates.filter(candidate => 
    selectedCandidateIds.includes(candidate.id)
  );

  const handleDownloadCV = async (candidate: any) => {
    try {
      const response = await fetch(`/api/candidates/${candidate.id}/download`);
      
      if (!response.ok) {
        throw new Error('Failed to download CV');
      }

      const contentDisposition = response.headers.get('content-disposition');
      let filename = 'CV.pdf';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Download started",
        description: `${candidate.name}'s CV is being downloaded.`,
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Unable to download the CV file. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveFromShortlist = (candidateId: number, candidateName: string) => {
    toggleCandidateSelection(candidateId);
    toast({
      title: "Removed from shortlist",
      description: `${candidateName} has been removed from your shortlist.`,
    });
  };

  const handleExportShortlist = async () => {
    if (selectedCandidateIds.length === 0) return;
    
    try {
      const response = await fetch('/api/export/shortlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          candidateIds: selectedCandidateIds,
          jobId: selectedJob?.id,
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
      toast({
        title: "Export failed",
        description: "Unable to export the shortlist. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (shortlistedCandidates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] px-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <UserMinus className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No candidates shortlisted</h3>
          <p className="text-gray-600 max-w-md">
            Start by reviewing candidates in the ranking view and add promising candidates to your shortlist.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-border">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Shortlisted Candidates</h2>
          <p className="text-sm text-text-secondary mt-1">
            {shortlistedCandidates.length} candidate{shortlistedCandidates.length !== 1 ? 's' : ''} selected for {selectedJob?.title}
          </p>
        </div>
        <Button
          onClick={handleExportShortlist}
          className="bg-success hover:bg-green-600"
          disabled={shortlistedCandidates.length === 0}
        >
          <Download className="w-4 h-4 mr-2" />
          Export Shortlist
        </Button>
      </div>

      {/* Candidates Grid */}
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {shortlistedCandidates.map((candidate) => {
            const initials = candidate.name
              .split(' ')
              .map(n => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2);

            const score = candidate.score;

            return (
              <Card key={candidate.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="text-sm">{initials}</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-base">{candidate.name}</CardTitle>
                        <p className="text-sm text-text-secondary">{candidate.email}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveFromShortlist(candidate.id, candidate.name)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Score Information */}
                  {score && (
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-text-secondary">Score</div>
                      <div className="flex items-center space-x-3">
                        <div className="text-lg font-semibold text-text-primary">
                          {score.totalScore || 0}/100
                        </div>
                        {score.aiRank && (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                            AI Rank #{score.aiRank}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Experience */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">Experience</span>
                      <span className="font-medium">{candidate.yearsExperience || 0} years</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">Last Role</span>
                      <span className="font-medium text-right max-w-[150px] truncate">
                        {candidate.lastRoleTitle || 'Not specified'}
                      </span>
                    </div>
                  </div>

                  {/* Skills Preview */}
                  <div>
                    <div className="text-sm text-text-secondary mb-2">Skills</div>
                    <div className="flex flex-wrap gap-1">
                      {candidate.skills.slice(0, 3).map((skill, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {skill.skill}
                        </Badge>
                      ))}
                      {candidate.skills.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{candidate.skills.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Missing Skills Warning */}
                  {score?.missingMustHave && score.missingMustHave.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-2">
                      <div className="text-xs text-red-800 font-medium mb-1">
                        Missing {score.missingMustHave.length} required skill{score.missingMustHave.length !== 1 ? 's' : ''}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {score.missingMustHave.slice(0, 2).map((skill, index) => (
                          <Badge key={index} variant="destructive" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                        {score.missingMustHave.length > 2 && (
                          <span className="text-xs text-red-600">
                            +{score.missingMustHave.length - 2} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex space-x-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setSelectedCandidate(candidate)}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      View Details
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleDownloadCV(candidate)}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download CV
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}