
'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
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
import { Megaphone, Plus, Loader2, MoreVertical, Edit, Trash2, FileText, Download, Upload, Users, UserCheck, ChevronDown } from 'lucide-react';
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
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold font-headline tracking-tight">Recent Announcements</h2>
                {canCreate && <CreateAnnouncementForm />}
            </div>
            <div className="space-y-6">
                {recentAnnouncements.map(announcement => (
                    <AnnouncementCard key={announcement.id} announcement={announcement} users={users} canManage={canCreate} />
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
  documents: z.array(z.custom<Document>()).optional(),
  audience: z.string().optional(),
});

type AnnouncementFormData = z.infer<typeof announcementSchema>;

function CreateAnnouncementForm({ isEdit = false, announcement, onFormOpenChange }: { isEdit?: boolean; announcement?: Announcement, onFormOpenChange?: (open: boolean) => void }) {
  const { user: currentUser } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();
  
  const handleOpenChange = (open: boolean) => {
    if (onFormOpenChange) {
      onFormOpenChange(open);
    } else {
      setDialogOpen(open);
    }
  };

  const { register, handleSubmit, watch, setValue, control, formState: { errors, isSubmitting }, reset } = useForm<AnnouncementFormData>({
    resolver: zodResolver(announcementSchema),
    defaultValues: { title: '', content: '', documents: [], audience: 'all' },
  });

  useEffect(() => {
    if (isEdit && announcement) {
      reset({ title: announcement.title, content: announcement.content, documents: announcement.documents || [], audience: announcement.audience || 'all' });
    } else {
      reset({ title: '', content: '', documents: [], audience: 'all' });
    }
  }, [isEdit, announcement, reset]);

  const documents = watch('documents') || [];
  
  const handleAddDocument = async () => {
    if (!selectedFile || !currentUser) return;
    setUploading(true);
    try {
        const downloadURL = await uploadFile(selectedFile, 'announcement-documents');
        const newDocument: Document = {
            id: `doc_${Date.now()}`,
            name: selectedFile.name,
            url: downloadURL,
            uploadedBy: currentUser.id,
            createdAt: new Date().toISOString(),
        };
        setValue('documents', [...documents, newDocument]);
        setSelectedFile(null);
    } catch (err) {
        toast({variant: 'destructive', title: "Upload Failed"});
    } finally {
        setUploading(false);
    }
  };

  const handleRemoveDocument = (docId: string) => {
    setValue('documents', documents.filter(doc => doc.id !== docId));
  }

  const onSubmit = async (data: AnnouncementFormData) => {
    if (!currentUser) return;

    if(isEdit && announcement) {
        const updateData: Partial<Announcement> = { ...data };
        if(currentUser.role === 'SPT') {
            updateData.audience = data.audience as AnnouncementAudience;
        }
        await updateAnnouncement(announcement.id, updateData);
        toast({ title: 'Announcement Updated!' });
    } else {
        const newAnnouncementData: Omit<Announcement, 'id'> = {
            title: data.title,
            content: data.content,
            documents: data.documents,
            authorId: currentUser.id,
            createdAt: new Date().toISOString(),
        };
        if(currentUser.role === 'SPT') {
            newAnnouncementData.audience = data.audience as AnnouncementAudience;
        } else {
            newAnnouncementData.audience = 'all'; // JPTs can only post to all
        }

        await createAnnouncement(newAnnouncementData);
        toast({
            title: 'Announcement Posted!',
            description: `Your announcement "${data.title}" is now live.`,
        });
    }
    handleOpenChange(false);
    reset({ title: '', content: '', documents: [], audience: 'all' });
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
              <Textarea id="content" {...register('content')} className="min-h-[150px]" />
              {errors.content && <p className="text-sm text-destructive">{errors.content.message}</p>}
            </div>
            
            <Separator />

            <div className="space-y-2">
                <Label>Documents (Optional)</Label>
                <div className="flex gap-2">
                    <Input type="file" onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)} />
                    <Button type="button" variant="outline" onClick={handleAddDocument} disabled={!selectedFile || uploading}>
                        {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Upload className="mr-2 h-4 w-4" />} 
                        Add
                    </Button>
                </div>
                 {(documents.length > 0) && (
                    <div className="space-y-2 rounded-md border p-2">
                         <ul className="space-y-2">
                            {documents.map(doc => (
                                <li key={doc.id} className="flex items-center justify-between text-sm p-1">
                                    <div className="flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-muted-foreground" />
                                        <span className="font-medium">{doc.name}</span>
                                    </div>
                                    <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveDocument(doc.id)}>
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
            <Button type="submit" disabled={isSubmitting || uploading}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
