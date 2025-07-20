import { useAppStore } from "@/store/appStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { X, Download, UserPlus } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function CandidateModal() {
  const { selectedCandidate, setSelectedCandidate, selectedCandidateIds, toggleCandidateSelection } = useAppStore();

  if (!selectedCandidate) return null;

  const candidate = selectedCandidate;
  const score = candidate.score;
  const initials = candidate.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-danger';
  };

  const getScoreBorderColor = (score: number) => {
    if (score >= 80) return 'border-success';
    if (score >= 60) return 'border-warning';
    return 'border-danger';
  };

  const getScoreGrade = (score: number) => {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    return 'D';
  };

  const isShortlisted = selectedCandidateIds.includes(candidate.id);

  return (
    <Dialog open={!!selectedCandidate} onOpenChange={() => setSelectedCandidate(null)}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Candidate Details</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[80vh] pr-4">
          {/* Candidate Summary */}
          <div className="flex items-center space-x-4 mb-6">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-text-primary text-xl">{candidate.name}</h3>
              <p className="text-sm text-text-secondary">{candidate.email}</p>
              <p className="text-sm text-text-secondary">{candidate.lastRoleTitle || 'Role not specified'}</p>
            </div>
          </div>
          
          {/* Ranking Information */}
          {score && (
            <div className="mb-6 grid grid-cols-2 gap-4">
              <Card className="bg-gray-50">
                <CardContent className="p-4 text-center">
                  <div className={`text-2xl font-bold ${getScoreColor(score.totalScore || 0)}`}>
                    {score.totalScore || 0}
                  </div>
                  <div className="text-sm text-text-secondary">Manual Rank Score</div>
                  <div className="text-lg font-semibold mt-1">
                    Grade {getScoreGrade(score.totalScore || 0)}
                  </div>
                </CardContent>
              </Card>
              
              {score.aiRank && (
                <Card className="bg-blue-50">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      #{score.aiRank}
                    </div>
                    <div className="text-sm text-text-secondary">AI Rank</div>
                    <div className="text-xs text-blue-600 mt-1">
                      AI Powered
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* AI Analysis */}
          {score?.aiRankReason && (
            <Card className="mb-6 bg-blue-50">
              <CardContent className="p-4">
                <h4 className="font-semibold text-blue-900 mb-2">AI Analysis</h4>
                <p className="text-sm text-blue-800">{score.aiRankReason}</p>
              </CardContent>
            </Card>
          )}

          {/* Experience & Skills */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <h4 className="font-semibold mb-3">Experience</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-text-secondary">Years of Experience</span>
                    <span className="font-medium">{candidate.yearsExperience || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-text-secondary">Last Role</span>
                    <span className="font-medium text-right max-w-[150px] truncate">
                      {candidate.lastRoleTitle || 'Not specified'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-text-secondary">Experience Gaps</span>
                    <span className="font-medium">{candidate.experienceGaps?.length || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h4 className="font-semibold mb-3">Score Breakdown</h4>
                {score && (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-text-secondary">Skills Match</span>
                      <span className="font-medium">{score.skillMatchScore || 0}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-text-secondary">Title Match</span>
                      <span className="font-medium">{score.titleScore || 0}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-text-secondary">Seniority Match</span>
                      <span className="font-medium">{score.seniorityScore || 0}%</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Skills */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <h4 className="font-semibold mb-3">Skills ({candidate.skills.length})</h4>
              <div className="flex flex-wrap gap-2">
                {candidate.skills.map((skill, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {skill.skill}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Missing Must-Have Skills */}
          {score?.missingMustHave && score.missingMustHave.length > 0 && (
            <Card className="mb-6 bg-red-50">
              <CardContent className="p-4">
                <h4 className="font-semibold text-red-900 mb-3">Missing Must-Have Skills</h4>
                <div className="flex flex-wrap gap-2">
                  {score.missingMustHave.map((skill, index) => (
                    <Badge key={index} variant="destructive" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex space-x-3 pt-4 border-t">
            <Button
              onClick={() => toggleCandidateSelection(candidate.id)}
              variant={isShortlisted ? "default" : "outline"}
              className={isShortlisted ? "bg-success hover:bg-green-600" : ""}
            >
              {isShortlisted ? (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Shortlisted
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add to Shortlist
                </>
              )}
            </Button>
            
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Download CV
            </Button>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}