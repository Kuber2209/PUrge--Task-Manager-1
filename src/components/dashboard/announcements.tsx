
'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { User, Announcement, Document, AnnouncementAudience } from '@/lib/types';
import { formatDistanceToNow, subDays } from 'date-fns';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Megaphone, Plus, Loader2, MoreVertical, Edit, Trash2, FileText, Download, Upload, Users, UserCheck, ChevronDown, Mic, Square } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { createAnnouncement, getAnnouncements, getUsers, updateAnnouncement, deleteAnnouncement } from '@/services/firestore';
import { uploadFile } from '@/services/storage';
import { Skeleton } from '../ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { Separator } from '../ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { cn } from '@/lib/utils';
import { FileUploader } from '../ui/file-uploader';


export function Announcements() {
    const { user: currentUser } = useAuth();
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [visibleOlderCount, setVisibleOlderCount] = useState(5);

    useEffect(() => {
        setLoading(true);
        if (!currentUser) return;
        
        const unsubscribe = getAnnouncements(currentUser, (data) => {
            setAnnouncements(data);
            setLoading(false);
        });
        
        getUsers().then(setUsers);

        return () => unsubscribe();
    }, [currentUser]);
    
    const { recentAnnouncements, olderAnnouncements } = useMemo(() => {
        const twoDaysAgo = subDays(new Date(), 2);
        const recent: Announcement[] = [];
        const older: Announcement[] = [];

        announcements.forEach(announcement => {
            if (new Date(announcement.createdAt) >= twoDaysAgo) {
                recent.push(announcement);
            } else {
                older.push(announcement);
            }
        });
        return { recentAnnouncements: recent, olderAnnouncements: older };
    }, [announcements]);


    if (!currentUser) return null;

    const canCreate = currentUser.role === 'SPT' || currentUser.role === 'JPT';
    
    if (loading) {
        return (
            <div>
                 <div className="flex items-center justify-between mb-4">
                    <Skeleton className="h-8 w-64" />
                    {canCreate && <Skeleton className="h-10 w-44" />}
                </div>
                <div className="space-y-6">
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-48 w-full" />
                </div>
            </div>
        )
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold font-headline tracking-tight">Recent Announcements</h2>
                    <p className="text-muted-foreground">Catch up on the latest updates and news.</p>
                </div>
                {canCreate && <CreateAnnouncementForm />}
            </div>
            <div className="space-y-6">
                {recentAnnouncements.map(announcement => (
                    <AnnouncementCard key={announcement.id} announcement={announcement} users={users} canManage={canManage} />
                ))}
                 {recentAnnouncements.length === 0 && !loading && (
                     <div className="flex flex-col items-center justify-center rounded-lg border border-dashed shadow-sm h-40 bg-card">
                        <Megaphone className="w-10 h-10 text-muted-foreground" />
                        <h3 className="text-xl font-bold tracking-tight font-headline mt-4">No New Announcements</h3>
                        <p className="text-sm text-muted-foreground">Nothing posted in the last two days.</p>
                    </div>
                )}
            </div>

            {olderAnnouncements.length > 0 && (
                 <Collapsible className="mt-8">
                    <CollapsibleTrigger asChild>
                        <Button variant="outline" className="w-full">
                            <ChevronDown className="mr-2 h-4 w-4" />
                            View Older Announcements ({olderAnnouncements.length})
                        </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-4 space-y-6">
                        {olderAnnouncements.slice(0, visibleOlderCount).map(announcement => (
                           <AnnouncementCard key={announcement.id} announcement={announcement} users={users} canManage={canCreate} />
                        ))}
                        {visibleOlderCount < olderAnnouncements.length && (
                            <Button variant="secondary" className="w-full" onClick={() => setVisibleOlderCount(prev => prev + 5)}>
                                Load 5 More
                            </Button>
                        )}
                    </CollapsibleContent>
                 </Collapsible>
            )}

        </div>
    );
}

function AnnouncementCard({ announcement, users, canManage }: { announcement: Announcement, users: User[], canManage: boolean}) {
    const author = users.find(u => u.id === announcement.authorId);
    return (
        <Collapsible key={announcement.id} asChild>
            <Card className="transition-all hover:shadow-md">
                <CardHeader>
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <Avatar>
                                <AvatarImage src={author?.avatar} alt={author?.name} />
                                <AvatarFallback>{author?.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                                <CardTitle className="font-headline text-xl flex items-center gap-2">
                                    {announcement.title}
                                    {announcement.audience === 'jpt-only' && (
                                        <Badge variant="secondary" className='flex items-center gap-1'>
                                            <UserCheck className='w-3 h-3'/> JPTs Only
                                        </Badge>
                                    )}
                                </CardTitle>
                                {author && <p className="text-sm text-muted-foreground">
                                    Posted by {author?.name} ({author?.role}) - {formatDistanceToNow(new Date(announcement.createdAt), { addSuffix: true })}
                                </p>}
                            </div>
                        </div>
                        <div className='flex items-center'>
                            <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm" className="w-9 p-0 data-[state=open]:rotate-180 transition-transform">
                                    <ChevronDown className="h-4 w-4" />
                                    <span className="sr-only">Toggle</span>
                                </Button>
                            </CollapsibleTrigger>
                            {canManage && <AnnouncementActions announcement={announcement} />}
                        </div>
                    </div>
                </CardHeader>
                <CollapsibleContent>
                    <CardContent>
                        <p className="whitespace-pre-wrap">{announcement.content}</p>
                         {announcement.voiceNoteUrl && (
                            <div className="mt-4 space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">Content Voice Note</p>
                                <audio src={announcement.voiceNoteUrl} controls className="w-full h-10" />
                            </div>
                        )}
                    </CardContent>
                    {(announcement.documents && announcement.documents.length > 0) && (
                        <CardFooter className="flex-col items-start gap-2 pt-4 border-t">
                            <h4 className="font-semibold text-sm">Attached Documents:</h4>
                            <ul className="space-y-2 w-full">
                                {announcement.documents.map(doc => {
                                const uploader = users.find(u => u.id === doc.uploadedBy);
                                return (
                                    <li key={doc.id} className="flex items-center justify-between text-sm hover:bg-muted/50 p-2 rounded-md">
                                        <div className="flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-muted-foreground" />
                                        <div className='flex flex-col'>
                                            <span className="font-medium">{doc.name}</span>
                                            {uploader && <span className='text-xs text-muted-foreground'>
                                                by {uploader.name} - {formatDistanceToNow(new Date(doc.createdAt), {addSuffix: true})}
                                            </span>}
                                        </div>
                                        </div>
                                        <Button variant="ghost" size="sm" asChild>
                                          <a href={doc.url} download={doc.name} target="_blank" rel="noopener noreferrer"><Download className="w-4 h-4"/></a>
                                        </Button>
                                    </li>
                                )
                                })}
                            </ul>
                        </CardFooter>
                    )}
                </CollapsibleContent>
            </Card>
        </Collapsible>
    )
}

const announcementSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters long.'),
  content: z.string().min(10, 'Content must be at least 10 characters long.'),
  files: z.array(z.instanceof(File)).optional(),
  documents: z.array(z.custom<Document>()).optional(),
  audience: z.string().optional(),
  voiceNoteUrl: z.string().optional(),
});

type AnnouncementFormData = z.infer<typeof announcementSchema>;

function CreateAnnouncementForm({ isEdit = false, announcement, onFormOpenChange }: { isEdit?: boolean; announcement?: Announcement, onFormOpenChange?: (open: boolean) => void }) {
  const { user: currentUser } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  const handleOpenChange = (open: boolean) => {
    if (onFormOpenChange) {
      onFormOpenChange(open);
    } else {
      setDialogOpen(open);
    }
  };

  const { register, handleSubmit, watch, setValue, control, formState: { errors, isSubmitting }, reset } = useForm<AnnouncementFormData>({
    resolver: zodResolver(announcementSchema),
    defaultValues: { title: '', content: '', documents: [], audience: 'all', files: [], voiceNoteUrl: undefined },
  });

  useEffect(() => {
    if (isEdit && announcement) {
      reset({ title: announcement.title, content: announcement.content, documents: announcement.documents || [], audience: announcement.audience || 'all', files: [], voiceNoteUrl: announcement.voiceNoteUrl });
    } else {
      reset({ title: '', content: '', documents: [], audience: 'all', files: [], voiceNoteUrl: undefined });
    }
  }, [isEdit, announcement, reset]);

  const files = watch('files') || [];
  const voiceNoteUrl = watch('voiceNoteUrl');

   const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            mediaRecorderRef.current.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };
            mediaRecorderRef.current.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                try {
                    const tempId = announcement?.id || `temp_${Date.now()}`;
                    const downloadURL = await uploadFile(new File([audioBlob], "announcement-content.webm"), `announcements/${tempId}/voice-notes`);
                    setValue('voiceNoteUrl', downloadURL);
                    toast({ title: "Voice note added!" });
                } catch (error) {
                    console.error("Failed to upload voice note:", error);
                    toast({ variant: "destructive", title: "Upload Failed", description: "Could not upload voice note." });
                }
                audioChunksRef.current = [];
            };
            audioChunksRef.current = [];
            mediaRecorderRef.current.start();
            setIsRecording(true);
            toast({ title: "Recording started..." });
        } catch (err) {
            console.error("Error accessing microphone:", err);
            toast({ variant: "destructive", title: "Microphone Access Denied", description: "Please enable microphone permissions in your browser." });
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            toast({ title: "Recording stopped. Uploading..." });
        }
    };

  const onSubmit = async (data: AnnouncementFormData) => {
    if (!currentUser) return;
    setUploading(true);

    try {
        let uploadedDocuments: Document[] = data.documents || [];

        if (data.files && data.files.length > 0) {
            const tempId = announcement?.id || `temp_${Date.now()}`;
            const uploadPromises = data.files.map(file => uploadFile(file, `announcements/${tempId}/documents`));
            const downloadURLs = await Promise.all(uploadPromises);
            
            const newDocuments: Document[] = data.files.map((file, index) => ({
                id: `doc_${Date.now()}_${index}`,
                name: file.name,
                url: downloadURLs[index],
                uploadedBy: currentUser.id,
                createdAt: new Date().toISOString(),
            }));
            uploadedDocuments = [...uploadedDocuments, ...newDocuments];
        }

        const finalData = { ...data, documents: uploadedDocuments };
        delete (finalData as any).files;

        if(isEdit && announcement) {
            const updateData: Partial<Announcement> = { ...finalData };
            if(currentUser.role === 'SPT') {
                updateData.audience = data.audience as AnnouncementAudience;
            }
            await updateAnnouncement(announcement.id, updateData);
            toast({ title: 'Announcement Updated!' });
        } else {
            const newAnnouncementData: Omit<Announcement, 'id'> = {
                title: finalData.title,
                content: finalData.content,
                documents: finalData.documents,
                authorId: currentUser.id,
                createdAt: new Date().toISOString(),
                audience: 'all',
                voiceNoteUrl: finalData.voiceNoteUrl,
            };
            if(currentUser.role === 'SPT') {
                newAnnouncementData.audience = data.audience as AnnouncementAudience;
            }
            await createAnnouncement(newAnnouncementData);
            toast({
                title: 'Announcement Posted!',
                description: `Your announcement "${data.title}" is now live.`,
            });
        }
        handleOpenChange(false);
        reset({ title: '', content: '', documents: [], audience: 'all', files: [], voiceNoteUrl: undefined });

    } catch (err) {
         toast({variant: 'destructive', title: "An Error Occurred", description: "Could not save the announcement."});
    } finally {
        setUploading(false);
    }
  };
  
  return (
    <Dialog open={onFormOpenChange ? undefined : dialogOpen} onOpenChange={handleOpenChange}>
      {!isEdit && (
         <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> New Announcement
            </Button>
        </DialogTrigger>
      )}
     <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <form onSubmit={handleSubmit(onSubmit)} className='flex flex-col flex-1 overflow-hidden'>
          <DialogHeader>
            <DialogTitle className="font-headline">{isEdit ? 'Edit Announcement' : 'Post a New Announcement'}</DialogTitle>
            <DialogDescription>
              {isEdit ? 'Modify the details below.' : 'This announcement will be visible to all team members.'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto -mr-6 pr-6 py-4 grid gap-4">
             {currentUser?.role === 'SPT' && (
                <div className="space-y-2">
                    <Label htmlFor="audience">Audience</Label>
                    <Controller
                        name="audience"
                        control={control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select audience..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        <div className='flex items-center gap-2'>
                                            <Users className='w-4 h-4' /> All Members
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="jpt-only">
                                         <div className='flex items-center gap-2'>
                                            <UserCheck className='w-4 h-4' /> JPTs Only
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        )}
                    />
                </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" {...register('title')} />
              {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <div className="flex gap-2">
                <Textarea id="content" {...register('content')} className="min-h-[150px] flex-1" />
                <Button
                    type="button"
                    variant={isRecording ? "destructive" : "outline"}
                    size="icon"
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isSubmitting || uploading}
                >
                    {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
              </div>
              {errors.content && <p className="text-sm text-destructive">{errors.content.message}</p>}
              {voiceNoteUrl && (
                    <div className="mt-2 space-y-1">
                      <Label className='text-xs'>Content Voice Note</Label>
                      <audio src={voiceNoteUrl} controls className='w-full h-10' />
                      <Button variant="link" size="sm" className="p-0 h-auto text-destructive" onClick={() => setValue('voiceNoteUrl', undefined)}>Remove</Button>
                    </div>
                  )}
            </div>
            
            <Separator />

            <div className="space-y-2">
                <Label>Documents (Optional)</Label>
                <Controller
                    control={control}
                    name="files"
                    render={({ field }) => (
                        <FileUploader
                            value={field.value ?? []}
                            onValueChange={field.onChange}
                            dropzoneOptions={{
                                accept: {
                                    'image/*': ['.jpg', '.jpeg', '.png', '.gif'],
                                    'application/pdf': ['.pdf'],
                                    'application/msword': ['.doc'],
                                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
                                },
                                maxSize: 10 * 1024 * 1024, // 10MB
                            }}
                        />
                    )}
                />

                 {isEdit && (announcement?.documents || []).length > 0 && (
                    <div className="space-y-2 rounded-md border p-2">
                         <h4 className="font-medium text-sm text-muted-foreground">Previously Uploaded:</h4>
                         <ul className="space-y-2">
                            {(announcement?.documents || []).map(doc => (
                                <li key={doc.id} className="flex items-center justify-between text-sm p-1">
                                    <div className="flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-muted-foreground" />
                                        <span className="font-medium">{doc.name}</span>
                                    </div>
                                    <Button type="button" variant="ghost" size="icon" onClick={() => {
                                        const currentDocs = watch('documents') || [];
                                        setValue('documents', currentDocs.filter(d => d.id !== doc.id));
                                    }}>
                                        <Trash2 className="w-4 h-4 text-destructive"/>
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting || uploading || isRecording}>
              {(isSubmitting || uploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Post Announcement'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


function AnnouncementActions({ announcement }: { announcement: Announcement }) {
    const [editOpen, setEditOpen] = useState(false);
    const { toast } = useToast();

    const handleDelete = async () => {
        try {
            await deleteAnnouncement(announcement.id);
            toast({ title: "Announcement Deleted" });
        } catch (err) {
            toast({ variant: 'destructive', title: "Error", description: "Could not delete the announcement." });
        }
    }

    return (
        <>
            <AlertDialog>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onSelect={() => setEditOpen(true)}>
                            <Edit className="mr-2 h-4 w-4" />
                            <span>Edit</span>
                        </DropdownMenuItem>
                        <AlertDialogTrigger asChild>
                            <DropdownMenuItem className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Delete</span>
                            </DropdownMenuItem>
                        </AlertDialogTrigger>
                    </DropdownMenuContent>
                </DropdownMenu>

                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the announcement titled "{announcement.title}".
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            {/* This Dialog wrapper is essential for the edit functionality to be self-contained */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
               {editOpen && <CreateAnnouncementForm isEdit announcement={announcement} onFormOpenChange={setEditOpen} />}
            </Dialog>
        </>
    )
}
