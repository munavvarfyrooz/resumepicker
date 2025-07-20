import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/store/appStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type ScoreWeights } from "@shared/schema";

export default function ScoreWeightsModal() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const {
    weightsModalOpen,
    setWeightsModalOpen,
    scoreWeights,
    setScoreWeights,
    selectedJob,
  } = useAppStore();

  const [tempWeights, setTempWeights] = useState<ScoreWeights>(scoreWeights);

  // Update temp weights when modal opens
  useEffect(() => {
    if (weightsModalOpen) {
      setTempWeights(scoreWeights);
    }
  }, [weightsModalOpen, scoreWeights]);

  // Re-score mutation
  const rescoreMutation = useMutation({
    mutationFn: async (weights: ScoreWeights) => {
      if (!selectedJob) throw new Error('No job selected');
      return await apiRequest('POST', `/api/jobs/${selectedJob.id}/rescore`, { weights });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "All candidates have been re-scored with new weights",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/jobs', selectedJob?.id, 'candidates'] });
      setWeightsModalOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to re-score candidates",
        variant: "destructive",
      });
    },
  });

  const updateWeight = (key: keyof ScoreWeights, value: number) => {
    setTempWeights(prev => ({ ...prev, [key]: value / 100 }));
  };

  const handleSave = () => {
    setScoreWeights(tempWeights);
    rescoreMutation.mutate(tempWeights);
  };

  const handleCancel = () => {
    setTempWeights(scoreWeights);
    setWeightsModalOpen(false);
  };

  const total = Object.values(tempWeights).reduce((sum, weight) => sum + weight, 0);
  const isValidTotal = Math.abs(total - 1) < 0.01; // Allow small floating point errors

  return (
    <Dialog open={weightsModalOpen} onOpenChange={setWeightsModalOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Configure Score Weights</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Skills Weight */}
          <div>
            <Label className="text-sm font-medium text-text-primary">
              Skills Match ({Math.round(tempWeights.skills * 100)}%)
            </Label>
            <Slider
              value={[tempWeights.skills * 100]}
              onValueChange={([value]) => updateWeight('skills', value)}
              max={100}
              step={5}
              className="mt-2"
            />
            <div className="flex justify-between text-xs text-text-secondary mt-1">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Title Weight */}
          <div>
            <Label className="text-sm font-medium text-text-primary">
              Title Match ({Math.round(tempWeights.title * 100)}%)
            </Label>
            <Slider
              value={[tempWeights.title * 100]}
              onValueChange={([value]) => updateWeight('title', value)}
              max={100}
              step={5}
              className="mt-2"
            />
            <div className="flex justify-between text-xs text-text-secondary mt-1">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Seniority Weight */}
          <div>
            <Label className="text-sm font-medium text-text-primary">
              Seniority ({Math.round(tempWeights.seniority * 100)}%)
            </Label>
            <Slider
              value={[tempWeights.seniority * 100]}
              onValueChange={([value]) => updateWeight('seniority', value)}
              max={100}
              step={5}
              className="mt-2"
            />
            <div className="flex justify-between text-xs text-text-secondary mt-1">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Recency Weight */}
          <div>
            <Label className="text-sm font-medium text-text-primary">
              Recency ({Math.round(tempWeights.recency * 100)}%)
            </Label>
            <Slider
              value={[tempWeights.recency * 100]}
              onValueChange={([value]) => updateWeight('recency', value)}
              max={100}
              step={5}
              className="mt-2"
            />
            <div className="flex justify-between text-xs text-text-secondary mt-1">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Gap Penalty Weight */}
          <div>
            <Label className="text-sm font-medium text-text-primary">
              Gap Penalty ({Math.round(tempWeights.gaps * 100)}%)
            </Label>
            <Slider
              value={[tempWeights.gaps * 100]}
              onValueChange={([value]) => updateWeight('gaps', value)}
              max={100}
              step={5}
              className="mt-2"
            />
            <div className="flex justify-between text-xs text-text-secondary mt-1">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Total */}
          <div className="pt-4 border-t border-border">
            <div className="text-sm text-text-secondary mb-4">
              Total: <span className={`font-medium ${isValidTotal ? 'text-success' : 'text-danger'}`}>
                {Math.round(total * 100)}%
              </span>
              {!isValidTotal && (
                <span className="text-danger ml-2">
                  (Must equal 100%)
                </span>
              )}
            </div>
            <div className="flex space-x-3">
              <Button
                className="flex-1"
                onClick={handleSave}
                disabled={!isValidTotal || rescoreMutation.isPending}
              >
                {rescoreMutation.isPending ? 'Re-scoring...' : 'Save & Re-score'}
              </Button>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={rescoreMutation.isPending}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
