
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { addEmailToWhitelist, removeEmailFromWhitelist, getWhitelist } from '@/services/firestore';
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';

const whitelistSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
});

type WhitelistFormData = z.infer<typeof whitelistSchema>;

export function WhitelistManagement() {
  const [whitelistedEmails, setWhitelistedEmails] = useState<{ id: string, email: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<WhitelistFormData>({
    resolver: zodResolver(whitelistSchema),
  });

  useEffect(() => {
    const unsubscribe = getWhitelist((emails) => {
      setWhitelistedEmails(emails);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAddEmail = async (data: WhitelistFormData) => {
    try {
      await addEmailToWhitelist(data.email);
      toast({
        title: 'Email Whitelisted',
        description: `${data.email} has been added to the whitelist.`,
      });
      reset();
    } catch (error) {
      console.error('Failed to add email to whitelist:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to add email to the whitelist.',
      });
    }
  };

  const handleRemoveEmail = async (email: string) => {
    try {
      await removeEmailFromWhitelist(email);
      toast({
        title: 'Email Removed',
        description: `${email} has been removed from the whitelist.`,
      });
    } catch (error) {
      console.error('Failed to remove email from whitelist:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to remove email from the whitelist.',
      });
    }
  };

  if (loading) {
    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-10 w-24" />
            </div>
            <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
            </div>
        </div>
    )
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(handleAddEmail)} className="flex items-start gap-2">
        <div className="flex-1 space-y-1">
          <Input 
            id="email" 
            type="email" 
            placeholder="Enter email to whitelist" 
            {...register('email')}
          />
          {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
        </div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
          Add
        </Button>
      </form>

      <div className="space-y-2">
        <h4 className="font-medium text-sm text-muted-foreground">Whitelisted Emails ({whitelistedEmails.length})</h4>
        {whitelistedEmails.length > 0 ? (
          <ul className="border rounded-md max-h-60 overflow-y-auto">
            {whitelistedEmails.map(({ id, email }) => (
              <li key={id} className="flex items-center justify-between p-3 border-b last:border-b-0">
                <span className="font-mono text-sm">{email}</span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => handleRemoveEmail(email)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
            <div className="text-center text-sm text-muted-foreground py-8">
                The whitelist is empty.
            </div>
        )}
      </div>
    </div>
  );
}
