import { useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useAppStore } from "@/store/appStore";
import { type CandidateWithScore } from "@shared/schema";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowUpDown, ArrowUp, ArrowDown, Trash2, MoreVertical } from "lucide-react";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function RankingTable() {
  const {
    candidates,
    selectedCandidateIds,
    setSelectedCandidateIds,
    toggleCandidateSelection,
    setSelectedCandidate,
    filters,
    selectedJob,
  } = useAppStore();
  
  const [sorting, setSorting] = useState<SortingState>([{ id: 'totalScore', desc: true }]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Delete candidate mutation
  const deleteCandidateMutation = useMutation({
    mutationFn: async (candidateId: number) => {
      return await apiRequest('DELETE', `/api/candidates/${candidateId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/jobs', selectedJob?.id, 'candidates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/jobs', 'candidate-counts'] });
      toast({
        title: "Success",
        description: "Candidate deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete candidate",
        variant: "destructive",
      });
    },
  });

  // Filter candidates based on current filters
  const filteredCandidates = useMemo(() => {
    return candidates.filter(candidate => {
      // Min years filter
      if (filters.minYears && (!candidate.yearsExperience || candidate.yearsExperience < filters.minYears)) {
        return false;
      }

      // Skills filter
      if (filters.skills.length > 0) {
        const candidateSkills = candidate.skills.map(s => s.skill.toLowerCase());
        const hasAllSkills = filters.skills.every(skill => 
          candidateSkills.some(cSkill => cSkill.includes(skill.toLowerCase()))
        );
        if (!hasAllSkills) return false;
      }

      // No missing must-haves filter
      if (filters.noMissingMust && candidate.score?.missingMustHave && candidate.score.missingMustHave.length > 0) {
        return false;
      }

      return true;
    });
  }, [candidates, filters]);

  const columns: ColumnDef<CandidateWithScore>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => {
            if (value) {
              setSelectedCandidateIds(filteredCandidates.map(c => c.id));
            } else {
              setSelectedCandidateIds([]);
            }
          }}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={selectedCandidateIds.includes(row.original.id)}
          onCheckedChange={() => toggleCandidateSelection(row.original.id)}
        />
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-auto p-0 font-medium"
        >
          Candidate
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4" />
          )}
        </Button>
      ),
      cell: ({ row }) => {
        const candidate = row.original;
        const initials = candidate.name
          .split(' ')
          .map(n => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);

        return (
          <div className="flex items-center space-x-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-text-primary">{candidate.name}</p>
              <p className="text-sm text-text-secondary">{candidate.email}</p>
            </div>
          </div>
        );
      },
    },
    {
      id: 'totalScore',
      accessorFn: (row) => row.score?.totalScore || 0,
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-auto p-0 font-medium"
        >
          Manual Rank
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4" />
          )}
        </Button>
      ),
      cell: ({ row }) => {
        const score = row.original.score?.totalScore || 0;
        const getScoreColor = (score: number) => {
          if (score >= 80) return 'text-success';
          if (score >= 60) return 'text-warning';
          return 'text-danger';
        };

        return (
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-full border-4 flex items-center justify-center ${
              score >= 80 ? 'border-success' : score >= 60 ? 'border-warning' : 'border-danger'
            }`}>
              <span className={`text-sm font-semibold ${getScoreColor(score)}`}>
                {score}
              </span>
            </div>
            <div className="text-sm text-text-secondary">/100</div>
          </div>
        );
      },
    },
    {
      id: 'skillMatch',
      accessorFn: (row) => row.score?.skillMatchScore || 0,
      header: 'Skill Match',
      cell: ({ row }) => {
        const score = row.original.score?.skillMatchScore || 0;
        
        return (
          <div className="flex items-center space-x-2">
            <div className="w-full bg-gray-200 rounded-full h-2 max-w-[100px]">
              <div
                className={`h-2 rounded-full ${
                  score >= 80 ? 'bg-success' : score >= 60 ? 'bg-warning' : 'bg-danger'
                }`}
                style={{ width: `${score}%` }}
              />
            </div>
            <span className="text-sm text-text-secondary min-w-[35px]">{score}%</span>
          </div>
        );
      },
    },
    {
      id: 'missingMust',
      accessorFn: (row) => row.score?.missingMustHave?.length || 0,
      header: 'Missing Must',
      cell: ({ row }) => {
        const missing = row.original.score?.missingMustHave || [];
        
        if (missing.length === 0) {
          return <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">None</Badge>;
        }
        
        return (
          <div className="max-w-[150px]">
            <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200 whitespace-normal">
              {missing.slice(0, 1).join(', ')}
              {missing.length > 1 && ` +${missing.length - 1} more`}
            </Badge>
          </div>
        );
      },
    },
    {
      id: 'titleMatch',
      accessorFn: (row) => row.score?.titleScore || 0,
      header: 'Title Match',
      cell: ({ row }) => {
        const score = row.original.score?.titleScore || 0;
        
        return (
          <div className="flex items-center space-x-2">
            <div className="w-full bg-gray-200 rounded-full h-2 max-w-[80px]">
              <div
                className={`h-2 rounded-full ${
                  score >= 80 ? 'bg-success' : score >= 60 ? 'bg-warning' : 'bg-danger'
                }`}
                style={{ width: `${score}%` }}
              />
            </div>
            <span className="text-sm text-text-secondary min-w-[35px]">{score}%</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'yearsExperience',
      header: 'Years Exp',
      cell: ({ row }) => {
        const years = row.original.yearsExperience;
        const seniorityScore = row.original.score?.seniorityScore || 0;
        
        return (
          <div className="flex flex-col">
            <span className="text-text-primary">{years ? `${years} years` : 'N/A'}</span>
            <span className="text-xs text-text-secondary">({seniorityScore}% match)</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'lastRoleTitle',
      header: 'Last Role',
      cell: ({ row }) => {
        const role = row.original.lastRoleTitle;
        return <span className="text-text-primary">{role || 'Not specified'}</span>;
      },
    },
    {
      id: 'gaps',
      accessorFn: (row) => row.experienceGaps?.length || 0,
      header: 'Gaps',
      cell: ({ row }) => {
        const gaps = row.original.experienceGaps || [];
        
        if (gaps.length === 0) {
          return <Badge variant="secondary">None</Badge>;
        }
        
        const totalMonths = gaps.reduce((sum, gap) => sum + gap.months, 0);
        if (totalMonths <= 3) {
          return <Badge variant="secondary">{totalMonths} months</Badge>;
        }
        
        return <Badge variant="outline" className="text-warning">{totalMonths} months</Badge>;
      },
    },
    {
      id: 'aiRank',
      accessorFn: (row) => row.score?.aiRank || 0,
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-auto p-0 font-medium"
        >
          AI Rank
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4" />
          )}
        </Button>
      ),
      cell: ({ row }) => {
        const aiRank = row.original.score?.aiRank;
        const aiReason = row.original.score?.aiRankReason;
        
        if (!aiRank) {
          return <span className="text-gray-400 text-sm">Not ranked</span>;
        }

        return (
          <div className="flex items-center space-x-2 min-w-[300px] w-[300px]">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0 ${
              aiRank <= 3 ? 'bg-green-100 text-green-800' : 
              aiRank <= 6 ? 'bg-yellow-100 text-yellow-800' : 
              'bg-red-100 text-red-800'
            }`}>
              #{aiRank}
            </div>
            {aiReason && (
              <div className="text-xs text-gray-500 max-w-[240px] truncate" title={aiReason}>
                {aiReason}
              </div>
            )}
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => deleteCandidateMutation.mutate(row.original.id)}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Candidate
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const table = useReactTable({
    data: filteredCandidates,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Mobile Card View */}
      <div className="md:hidden p-3">
        {filteredCandidates.length > 0 ? (
          <div className="space-y-3">
            {filteredCandidates.map((candidate) => (
              <div
                key={candidate.id}
                className="bg-white rounded-lg p-4 border shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedCandidate(candidate)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      checked={selectedCandidateIds.includes(candidate.id)}
                      onCheckedChange={(checked) => toggleCandidateSelection(candidate.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="text-sm bg-blue-100 text-blue-600">
                        {candidate.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-right">
                      <div className="text-xl font-bold text-blue-600">
                        {candidate.score?.totalScore?.toFixed(0) || 0}
                      </div>
                      <div className="text-xs text-gray-500">Total Score</div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteCandidateMutation.mutate(candidate.id);
                          }}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Candidate
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                
                <div className="mb-3">
                  <h3 className="font-semibold text-gray-900 text-base mb-1">
                    {candidate.name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {candidate.lastRoleTitle || 'No title'} • {candidate.yearsExperience || 0} years
                  </p>
                </div>
                
                <div className="flex flex-wrap gap-1 mb-3">
                  {candidate.skills.slice(0, 4).map((skill, index) => (
                    <Badge key={index} variant="secondary" className="text-xs px-2 py-1">
                      {skill.skill}
                    </Badge>
                  ))}
                  {candidate.skills.length > 4 && (
                    <Badge variant="outline" className="text-xs px-2 py-1">
                      +{candidate.skills.length - 4}
                    </Badge>
                  )}
                </div>
                
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div className="text-center">
                    <div className="font-medium text-gray-900">
                      {candidate.score?.skillMatchScore?.toFixed(0) || 0}%
                    </div>
                    <div className="text-gray-500">Skills</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-gray-900">
                      {candidate.score?.titleScore?.toFixed(0) || 0}%
                    </div>
                    <div className="text-gray-500">Title</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-gray-900">
                      {candidate.score?.seniorityScore?.toFixed(0) || 0}%
                    </div>
                    <div className="text-gray-500">Seniority</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-gray-900">
                      {(candidate.experienceGaps || []).length}
                    </div>
                    <div className="text-gray-500">Gaps</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">No candidates found</p>
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block">
        <div className="w-full overflow-x-auto border rounded-md bg-white">
          <Table className="min-w-[1600px]">
              <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="bg-gray-50">
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="py-3 px-4 font-medium text-text-secondary text-sm border-b border-border">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => setSelectedCandidate(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-3 px-4 border-b border-border">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No candidates found
                  </TableCell>
                </TableRow>
              )}
              </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
