
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicyPage() {
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
            <CardTitle className="font-headline text-3xl">Privacy Policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground">
            <p><strong>Last Updated:</strong> {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

            <h2 className="font-semibold text-lg text-card-foreground">1. Introduction</h2>
            <p>Welcome to PUrge BPHC ("we," "our," or "us"). We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our application. Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the application.</p>

            <h2 className="font-semibold text-lg text-card-foreground">2. Collection of Your Information</h2>
            <p>We may collect information about you in a variety of ways. The information we may collect via the Application includes:</p>
            <ul className="list-disc list-inside space-y-2">
                <li><strong>Personal Data:</strong> Personally identifiable information, such as your name, email address, that you voluntarily give to us when you register with the Application.</li>
                <li><strong>Derivative Data:</strong> Information our servers automatically collect when you access the Application, such as your IP address, your browser type, your operating system, your access times, and the pages you have viewed directly before and after accessing the Application.</li>
                <li><strong>Data from Social Networks:</strong> User information from social networking sites, such as Google, including your name, your social network username, location, gender, birth date, email address, profile picture, and public data for contacts, if you connect your account to such social networks.</li>
            </ul>

            <h2 className="font-semibold text-lg text-card-foreground">3. Use of Your Information</h2>
            <p>Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you via the Application to:</p>
             <ul className="list-disc list-inside space-y-2">
                <li>Create and manage your account.</li>
                <li>Email you regarding your account or order.</li>
                <li>Enable user-to-user communications.</li>
                <li>Monitor and analyze usage and trends to improve your experience with the Application.</li>
            </ul>
            
            <h2 className="font-semibold text-lg text-card-foreground">4. Contact Us</h2>
            <p>If you have questions or comments about this Privacy Policy, please contact us.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
