import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/store/appStore";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, FileText, CheckCircle, XCircle, Loader } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface UploadResult {
  success: boolean;
  candidate?: any;
  error?: string;
  fileName: string;
}

export default function FileUpload() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedJob, uploadProgress, setUploadProgress } = useAppStore();
  const [isUploading, setIsUploading] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });
      
      return await apiRequest('POST', '/api/upload', formData);
    },
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
      if (selectedJob) {
        queryClient.invalidateQueries({ queryKey: ['/api/jobs', selectedJob.id, 'candidates'] });
      }
      
      toast({
        title: "Upload Complete",
        description: "CVs have been processed successfully",
      });
    },
    onError: () => {
      toast({
        title: "Upload Failed",
        description: "Failed to upload and process CVs",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsUploading(false);
      // Clear progress after a delay
      setTimeout(() => {
        setUploadProgress([]);
      }, 3000);
    },
  });

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setIsUploading(true);
    
    // Initialize progress tracking
    const initialProgress = acceptedFiles.map(file => ({
      fileName: file.name,
      status: 'uploading' as const,
    }));
    setUploadProgress(initialProgress);

    try {
      // Simulate processing stages
      for (let i = 0; i < acceptedFiles.length; i++) {
        const updatedProgress = [...initialProgress];
        updatedProgress[i] = { ...updatedProgress[i], status: 'processing' };
        setUploadProgress(updatedProgress);
        
        // Small delay to show processing state
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      const response = await uploadMutation.mutateAsync(acceptedFiles);
      const results: { results: UploadResult[] } = await response.json();
      
      // Update progress with final results
      const finalProgress = results.results.map(result => ({
        fileName: result.fileName,
        status: result.success ? 'success' as const : 'error' as const,
        message: result.error || undefined,
      }));
      setUploadProgress(finalProgress);

    } catch (error) {
      // Update all to error state
      const errorProgress = initialProgress.map(item => ({
        ...item,
        status: 'error' as const,
        message: 'Upload failed',
      }));
      setUploadProgress(errorProgress);
    }
  }, [uploadMutation, setUploadProgress]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
    multiple: true,
    disabled: isUploading,
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'uploading':
        return <Upload className="w-4 h-4 text-primary" />;
      case 'processing':
        return <Loader className="w-4 h-4 text-primary animate-spin" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-danger" />;
      default:
        return <FileText className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'uploading':
        return 'Uploading...';
      case 'processing':
        return 'Processing...';
      case 'success':
        return 'Processed successfully';
      case 'error':
        return 'Processing failed';
      default:
        return '';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-success';
      case 'error':
        return 'text-danger';
      default:
        return 'text-primary';
    }
  };

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <Card
        {...getRootProps()}
        className={`cursor-pointer transition-colors ${
          isDragActive
            ? 'border-primary bg-blue-50'
            : isUploading
            ? 'border-gray-300 cursor-not-allowed'
            : 'border-dashed border-2 hover:border-primary hover:bg-blue-50'
        }`}
      >
        <CardContent className="p-6 text-center">
          <input {...getInputProps()} />
          <Upload className="w-12 h-12 text-text-secondary mx-auto mb-3" />
          {isDragActive ? (
            <p className="text-sm text-primary font-medium mb-1">Drop files here</p>
          ) : (
            <p className="text-sm text-text-primary font-medium mb-1">
              Drop files here or click to upload
            </p>
          )}
          <p className="text-xs text-text-secondary mb-3">
            PDF, DOCX, TXT files supported
          </p>
          <Button
            size="sm"
            disabled={isUploading}
            type="button"
          >
            {isUploading ? 'Processing...' : 'Choose Files'}
          </Button>
        </CardContent>
      </Card>

      {/* Upload Progress */}
      {uploadProgress.length > 0 && (
        <div className="space-y-2">
          {uploadProgress.map((item, index) => (
            <Card key={index} className="bg-gray-50">
              <CardContent className="p-3">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(item.status)}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-text-primary truncate">
                      {item.fileName}
                    </p>
                    <p className={`text-xs ${getStatusColor(item.status)}`}>
                      {item.message || getStatusText(item.status)}
                    </p>
                  </div>
                </div>
                {(item.status === 'uploading' || item.status === 'processing') && (
                  <Progress
                    value={item.status === 'uploading' ? 30 : 70}
                    className="mt-2 h-1"
                  />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
