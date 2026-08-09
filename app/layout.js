import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";
import Header from "@/components/header";
import { ThemeProvider } from "@/components/theme-provider";
import { dark } from "@clerk/themes";
import GlobalLoader from "@/components/global-loader";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const metadata = {
  title: "QuantAI — AI-Powered Career Coach",
  description:
    "QuantAI helps you land your dream job with AI-driven career insights, industry analysis, resume building, mock interviews, and personalized growth roadmaps.",
  keywords: ["AI career coach", "resume builder", "interview prep", "career insights", "job search", "QuantAI"],
  openGraph: {
    title: "QuantAI — AI-Powered Career Coach",
    description: "Land your dream job with AI-driven career guidance.",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!clerkPublishableKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY. Set it in your .env or .env.local"
    );
  }

  return (
    <ClerkProvider
      publishableKey={clerkPublishableKey}
      appearance={{ baseTheme: dark }}
    >
      <html lang="en" suppressHydrationWarning className="dark">
        <head>
          <link rel="icon" href="/logo.png" sizes="any" />
          <meta name="theme-color" content="#0a0f1e" />
        </head>
        <body className={`${inter.variable} ${outfit.variable} font-sans antialiased`}>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
            disableTransitionOnChange
          >
            <GlobalLoader />
            <Header />
            <main className="min-h-screen pt-20">{children}</main>
            <Toaster
              richColors
              position="top-right"
              toastOptions={{
                style: {
                  background: "hsl(222, 47%, 8%)",
                  border: "1px solid hsl(222, 30%, 18%)",
                  color: "hsl(210, 40%, 98%)",
                },
              }}
            />
            <footer className="border-t border-white/5 py-10 mt-8">
              <div className="container mx-auto px-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Made with{" "}
                  <span className="text-red-400 animate-pulse">❤</span> by{" "}
                  <span className="gradient-title text-sm">Amanul Hasan</span>
                </p>
                <p className="text-xs text-muted-foreground/50 mt-1">
                  © 2026 QuantAI — AI-Powered Career Coach
                </p>
              </div>
            </footer>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
