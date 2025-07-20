import { useState } from "react";
import { useAppStore } from "@/store/appStore";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { X, Plus } from "lucide-react";

export default function FilterBar() {
  const { filters, setFilters, candidates } = useAppStore();
  const [newSkill, setNewSkill] = useState("");
  const [skillsPopoverOpen, setSkillsPopoverOpen] = useState(false);

  // Get unique skills from all candidates for suggestions
  const availableSkills = Array.from(
    new Set(
      candidates.flatMap(candidate => 
        candidate.skills.map(skill => skill.skill)
      )
    )
  ).sort();

  const handleMinYearsChange = (value: string) => {
    setFilters({ minYears: value === "any" ? null : parseInt(value) });
  };

  const handleSkillAdd = (skill: string) => {
    if (skill && !filters.skills.includes(skill)) {
      setFilters({ skills: [...filters.skills, skill] });
    }
    setNewSkill("");
  };

  const handleSkillRemove = (skill: string) => {
    setFilters({ skills: filters.skills.filter(s => s !== skill) });
  };

  const handleNoMissingMustChange = (checked: boolean) => {
    setFilters({ noMissingMust: checked });
  };

  const filteredCandidatesCount = candidates.filter(candidate => {
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
  }).length;

  return (
    <div className="bg-surface border-b border-border px-3 md:px-6 py-2 md:py-3">
      <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-6">
        {/* Min Years Filter */}
        <div className="flex items-center space-x-2">
          <Label className="text-sm text-text-secondary whitespace-nowrap">Min Years:</Label>
          <Select value={filters.minYears?.toString() || "any"} onValueChange={handleMinYearsChange}>
            <SelectTrigger className="w-20 h-8">
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any</SelectItem>
              <SelectItem value="1">1+</SelectItem>
              <SelectItem value="2">2+</SelectItem>
              <SelectItem value="3">3+</SelectItem>
              <SelectItem value="5">5+</SelectItem>
              <SelectItem value="8">8+</SelectItem>
              <SelectItem value="10">10+</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Skills Filter */}
        <div className="flex items-center space-x-2">
          <Label className="text-sm text-text-secondary whitespace-nowrap">Skills:</Label>
          <div className="flex items-center space-x-1">
            {filters.skills.map(skill => (
              <Badge key={skill} variant="secondary" className="flex items-center space-x-1">
                <span>{skill}</span>
                <button
                  onClick={() => handleSkillRemove(skill)}
                  className="hover:bg-gray-300 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
            
            <Popover open={skillsPopoverOpen} onOpenChange={setSkillsPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-6 text-xs">
                  <Plus className="w-3 h-3 mr-1" />
                  Add
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-3">
                <div className="space-y-3">
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Enter skill name..."
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleSkillAdd(newSkill);
                          setSkillsPopoverOpen(false);
                        }
                      }}
                      className="flex-1 h-8"
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        handleSkillAdd(newSkill);
                        setSkillsPopoverOpen(false);
                      }}
                      disabled={!newSkill.trim()}
                      className="h-8"
                    >
                      Add
                    </Button>
                  </div>
                  
                  {availableSkills.length > 0 && (
                    <div>
                      <Label className="text-xs text-text-secondary">Common skills:</Label>
                      <div className="flex flex-wrap gap-1 mt-1 max-h-32 overflow-y-auto">
                        {availableSkills
                          .filter(skill => !filters.skills.includes(skill))
                          .slice(0, 20)
                          .map(skill => (
                            <Button
                              key={skill}
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs px-2"
                              onClick={() => {
                                handleSkillAdd(skill);
                                setSkillsPopoverOpen(false);
                              }}
                            >
                              {skill}
                            </Button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* No Missing Must-haves Filter */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="no-missing-must"
            checked={filters.noMissingMust}
            onCheckedChange={handleNoMissingMustChange}
          />
          <Label 
            htmlFor="no-missing-must" 
            className="text-sm text-text-secondary cursor-pointer whitespace-nowrap"
          >
            No missing must-haves
          </Label>
        </div>

        {/* Results Count */}
        <div className="ml-auto text-sm text-text-secondary">
          Showing {filteredCandidatesCount} of {candidates.length} candidates
        </div>
      </div>
    </div>
  );
}
