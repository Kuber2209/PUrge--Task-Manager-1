
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function TermsOfServicePage() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-muted/40 p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-4xl">
        <Button asChild variant="ghost" className="mb-4">
            <Link href="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
            </Link>
        </Button>
        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-3xl">Terms of Service</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground">
            <p><strong>Last Updated:</strong> {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

            <h2 className="font-semibold text-lg text-card-foreground">1. Agreement to Terms</h2>
            <p>By using PUrge BPHC (the "Application"), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Application. These terms are a legal agreement between you and the creators of the Application.</p>

            <h2 className="font-semibold text-lg text-card-foreground">2. User Accounts</h2>
            <p>When you create an account with us, you must provide us with information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Application.</p>
            
            <h2 className="font-semibold text-lg text-card-foreground">3. User Conduct</h2>
            <p>You agree not to use the Application to:</p>
            <ul className="list-disc list-inside space-y-2">
                <li>Violate any local, state, national, or international law.</li>
                <li>Post any content that is threatening, abusive, defamatory, obscene, or invasive of another's privacy.</li>
                <li>Impersonate any person or entity or falsely state or otherwise misrepresent your affiliation with a person or entity.</li>
            </ul>

            <h2 className="font-semibold text-lg text-card-foreground">4. Termination</h2>
            <p>We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms. Upon termination, your right to use the Application will immediately cease.</p>

            <h2 className="font-semibold text-lg text-card-foreground">5. Limitation of Liability</h2>
            <p>In no event shall the creators of the Application, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Application.</p>

            <h2 className="font-semibold text-lg text-card-foreground">6. Governing Law</h2>
            <p>These Terms shall be governed and construed in accordance with the laws of the jurisdiction, without regard to its conflict of law provisions.</p>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
