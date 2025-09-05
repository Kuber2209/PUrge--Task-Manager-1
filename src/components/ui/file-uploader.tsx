
'use client';

import { cn } from '@/lib/utils';
import { UploadCloud, File as FileIcon, X } from 'lucide-react';
import React, { useCallback } from 'react';
import { useDropzone, type DropzoneOptions } from 'react-dropzone';
import { Button } from './button';
import { Input } from './input';


type FileUploaderProps = {
  value: File[];
  onValueChange: (value: File[]) => void;
  dropzoneOptions?: DropzoneOptions;
  className?: string;
};

export function FileUploader({
  value,
  onValueChange,
  dropzoneOptions,
  className,
}: FileUploaderProps) {

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      // Combines the current files with the new ones.
      const newFiles = [...(value || []), ...acceptedFiles];
      onValueChange(newFiles);
    },
    [value, onValueChange]
  );

  const removeFile = (index: number) => {
    if (!value) return;
    const newFiles = value.filter((_, i) => i !== index);
    onValueChange(newFiles);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    ...dropzoneOptions,
  });


  return (
    <div className={cn('grid gap-2', className)}>
      <div
        {...getRootProps()}
        className={cn(
          'relative flex flex-col items-center justify-center w-full p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors',
          isDragActive ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/50'
        )}
      >
        <UploadCloud className="w-8 h-8 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">
          <span className="font-semibold">Drag and drop</span> files here, or click to select files
        </p>
        <Input {...getInputProps()} />
      </div>

      {(value || []).length > 0 && (
        <div className="space-y-2">
            <h4 className="font-medium text-sm">Selected Files:</h4>
            <div className="grid gap-2">
            {value.map((file, index) => (
                <div key={file.name + index} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                        <FileIcon className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium truncate">{file.name}</span>
                        <span className="text-xs text-muted-foreground">({(file.size / 1024).toFixed(2)} KB)</span>
                    </div>
                    <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => removeFile(index)}>
                        <X className="w-4 h-4 text-destructive" />
                    </Button>
                </div>
            ))}
            </div>
        </div>
      )}
    </div>
  );
}
