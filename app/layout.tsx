// import './polyfills.js'; // <-- ADD THIS AS THE VERY FIRST LINE
import type { Metadata } from "next";
import "../css/main.css";
import StoreProvider from "./_stores/StoreProvider";
import DarkModeInit from "./_components/DarkModeInit";
import Script from "next/script";

const title = `Rodwell Portal`;
const description = "Portal for Rodwell Student.";
const url = "https://portal.rodwell.center/"; // Replace with your actual domain when you deploy
const imageUrl = `${url}/rodwell_logo.png`;

export const metadata: Metadata = {
  title: title,
  description: description,
  manifest: '/manifest.json',
  themeColor: '#0f172a',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: title,
  },
  openGraph: {
    title: title,
    description: description,
    url: url,
    siteName: 'Rodwell Portal',
    images: [
      {
        url: imageUrl,
        width: 512,
        height: 512,
        alt: 'Rodwell Logo',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: title,
    description: description,
    images: [imageUrl],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <StoreProvider>
      <html lang="en" className="style-basic dark">
        <head>
          <link rel="icon" href="/rodwell_logo.png" type="image/png" />
        </head>
        <body
          className={`bg-gray-50 dark:bg-slate-800 dark:text-slate-100 antialiased`}
        >
          <DarkModeInit />
          {children}

          <Script
            src="https://www.googletagmanager.com/gtag/js?id=UA-130795909-1"
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'UA-130795909-1');
            `}
          </Script>
        </body>
      </html>
    </StoreProvider>
  );
}
