import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/hooks/use-auth';

export const metadata: Metadata = {
  title: 'PUrge BPHC',
  description: 'Task management for the BITS Pilani, Hyderabad Campus Placement Unit',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300&family=Space+Grotesk:wght@700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased flex flex-col min-h-screen">
        <AuthProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <div className="flex-grow">
              {children}
            </div>
            <Toaster />
            <footer className="w-full p-4 text-center text-sm text-muted-foreground">
              Made by Kuber and Bhoovan
            </footer>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
