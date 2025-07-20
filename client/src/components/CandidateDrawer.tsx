import { useAppStore } from "@/store/appStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { X, Download, UserPlus } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function CandidateDrawer() {
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
    <div className="w-full h-full bg-white flex flex-col animate-in slide-in-from-right-300 duration-300">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-primary">Candidate Details</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedCandidate(null)}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        {/* Candidate Summary */}
        <div className="flex items-center space-x-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-lg">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-text-primary">{candidate.name}</h3>
            <p className="text-sm text-text-secondary">{candidate.email}</p>
            <p className="text-sm text-text-secondary">{candidate.lastRoleTitle || 'Role not specified'}</p>
          </div>
        </div>
        
        {/* Ranking Information */}
        {score && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Card className="bg-gray-50">
              <CardContent className="p-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    #{score.totalScore?.toFixed(0) || 0}
                  </div>
                  <div className="text-xs text-gray-500">Manual Rank</div>
                </div>
              </CardContent>
            </Card>
            {score.aiRank && (
              <Card className="bg-purple-50">
                <CardContent className="p-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      #{score.aiRank}
                    </div>
                    <div className="text-xs text-gray-500">AI Rank</div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* AI Ranking Reason */}
        {score?.aiRankReason && (
          <Card className="mt-4 bg-purple-50">
            <CardContent className="p-4">
              <h4 className="font-medium text-purple-800 mb-2 flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                AI Ranking Analysis
              </h4>
              <p className="text-sm text-purple-700 leading-relaxed">
                {score.aiRankReason}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Overall Score */}
        {score && (
          <Card className="mt-4 bg-gray-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-text-secondary">Overall Score</h4>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className={`text-2xl font-bold ${getScoreColor(score.totalScore)}`}>
                      {score.totalScore}
                    </span>
                    <span className="text-text-secondary">/100</span>
                  </div>
                </div>
                <div className={`w-16 h-16 rounded-full border-8 flex items-center justify-center ${getScoreBorderColor(score.totalScore)}`}>
                  <span className={`text-sm font-semibold ${getScoreColor(score.totalScore)}`}>
                    {getScoreGrade(score.totalScore)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 p-6">
        <div className="space-y-6">
          {/* Score Breakdown */}
          {score && (
            <div>
              <h4 className="font-medium text-text-primary mb-3">Score Breakdown</h4>
              <div className="space-y-3">
                <Card className="bg-gray-50">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-text-primary">Skills Match</p>
                        <p className="text-xs text-text-secondary">Weight: {(score.weights?.skills || 0.5) * 100}%</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-lg font-semibold ${getScoreColor(score.skillMatchScore)}`}>
                          {score.skillMatchScore}
                        </span>
                        <span className="text-sm text-text-secondary">/100</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-gray-50">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-text-primary">Title Match</p>
                        <p className="text-xs text-text-secondary">Weight: {(score.weights?.title || 0.2) * 100}%</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-lg font-semibold ${getScoreColor(score.titleScore)}`}>
                          {score.titleScore}
                        </span>
                        <span className="text-sm text-text-secondary">/100</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-gray-50">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-text-primary">Seniority</p>
                        <p className="text-xs text-text-secondary">Weight: {(score.weights?.seniority || 0.15) * 100}%</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-lg font-semibold ${getScoreColor(score.seniorityScore)}`}>
                          {score.seniorityScore}
                        </span>
                        <span className="text-sm text-text-secondary">/100</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-gray-50">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-text-primary">Recency</p>
                        <p className="text-xs text-text-secondary">Weight: {(score.weights?.recency || 0.1) * 100}%</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-lg font-semibold ${getScoreColor(score.recencyScore)}`}>
                          {score.recencyScore}
                        </span>
                        <span className="text-sm text-text-secondary">/100</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-gray-50">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-text-primary">Gap Penalty</p>
                        <p className="text-xs text-text-secondary">Weight: {(score.weights?.gaps || 0.05) * 100}%</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-lg font-semibold ${getScoreColor(100 - score.gapPenalty)}`}>
                          {100 - score.gapPenalty}
                        </span>
                        <span className="text-sm text-text-secondary">/100</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Matched Skills */}
          <div>
            <h4 className="font-medium text-text-primary mb-3">Matched Skills</h4>
            <div className="flex flex-wrap gap-2">
              {candidate.skills.map((skill) => (
                <Badge key={skill.skill} variant="default" className="bg-success">
                  {skill.skill}
                </Badge>
              ))}
              {candidate.skills.length === 0 && (
                <p className="text-sm text-text-secondary">No skills extracted</p>
              )}
            </div>
          </div>

          {/* Missing Critical Skills */}
          <div>
            <h4 className="font-medium text-text-primary mb-3">Missing Critical Skills</h4>
            {score?.missingMustHave && score.missingMustHave.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {score.missingMustHave.map((skill) => (
                  <Badge key={skill} variant="destructive">
                    {skill}
                  </Badge>
                ))}
              </div>
            ) : (
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-3">
                  <p className="text-sm text-success font-medium">✓ All critical skills present</p>
                  <p className="text-xs text-text-secondary mt-1">
                    This candidate meets all must-have requirements.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Experience Timeline */}
          <div>
            <h4 className="font-medium text-text-primary mb-3">Experience Timeline</h4>
            <div className="space-y-4">
              {candidate.experienceTimeline && candidate.experienceTimeline.length > 0 ? (
                candidate.experienceTimeline.map((exp, index) => (
                  <div key={index} className="border-l-2 border-primary pl-4">
                    <div className="flex items-center justify-between">
                      <h5 className="font-medium text-text-primary">{exp.role}</h5>
                      <span className="text-xs text-text-secondary">
                        {exp.startDate} - {exp.endDate}
                      </span>
                    </div>
                    <p className="text-sm text-text-secondary">{exp.company}</p>
                    <p className="text-xs text-text-secondary mt-1">{exp.yearsInRole} years</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-text-secondary">No detailed timeline available</p>
              )}
            </div>
          </div>

          {/* AI Explanation */}
          {score?.explanation && (
            <div>
              <h4 className="font-medium text-text-primary mb-3">Scoring Explanation</h4>
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <p className="text-sm text-text-primary">{score.explanation}</p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Actions */}
      <div className="p-6 border-t border-border">
        <div className="flex space-x-3">
          <Button
            className="flex-1 bg-success hover:bg-green-600"
            onClick={() => toggleCandidateSelection(candidate.id)}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            {isShortlisted ? 'Remove from Shortlist' : 'Add to Shortlist'}
          </Button>
          <Button variant="outline" className="flex-1">
            <Download className="w-4 h-4 mr-2" />
            Download CV
          </Button>
        </div>
      </div>
    </div>
  );
}
