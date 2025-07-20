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
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { useState } from "react";

export default function RankingTable() {
  const {
    candidates,
    selectedCandidateIds,
    setSelectedCandidateIds,
    toggleCandidateSelection,
    setSelectedCandidate,
    filters,
  } = useAppStore();
  
  const [sorting, setSorting] = useState<SortingState>([{ id: 'totalScore', desc: true }]);

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
          Total Score
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
          return <Badge variant="default" className="bg-success">None</Badge>;
        }
        
        return (
          <Badge variant="destructive" className="bg-danger">
            {missing.slice(0, 2).join(', ')}
            {missing.length > 2 && ` +${missing.length - 2}`}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'yearsExperience',
      header: 'Years Exp',
      cell: ({ row }) => {
        const years = row.original.yearsExperience;
        return <span className="text-text-primary">{years ? `${years} years` : 'N/A'}</span>;
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
    <div className="rounded-md border">
      <Table>
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
                  <TableCell key={cell.id} className="py-4 px-4">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No candidates found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
