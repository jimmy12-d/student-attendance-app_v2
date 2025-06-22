// import './polyfills.js'; // <-- ADD THIS AS THE VERY FIRST LINE
import type { Metadata } from "next";
import "../css/main.css";
import StoreProvider from "./_stores/StoreProvider";
import AppCheckProvider from "./_components/AppCheckProvider";
import Script from "next/script";
import DarkModeInit from "./_components/DarkModeInit";
import { useAppSelector } from './_stores/hooks'

const title = `Rodwell Attendance`;

const description =
  "Rodwell Attendance System";

const url = "https://justboil.github.io/admin-one-react-tailwind/";

const image = `https://static.justboil.me/templates/one/repo-tailwind-react.png`;

const imageWidth = "1920";

const imageHeight = "960";

export const metadata: Metadata = {
  title: 'Rodwell College Student Portal',
  description: 'Student portal for Rodwell College',
  icons: "/favicon.png",
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: {
      url: image,
      width: imageWidth,
      height: imageHeight,
    },
  },
  openGraph: {
    url,
    title,
    images: {
      url: image,
      width: imageWidth,
      height: imageHeight,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AppCheckProvider>
      <StoreProvider>
        <html lang="en" className="style-basic dark">
          <head>
            <link rel="icon" href="/rodwell_logo.png" type="image/png" />
            <Script 
              src={`https://www.google.com/recaptcha/api.js?render=${process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}`}
              strategy="beforeInteractive"
            />
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
    </AppCheckProvider>
  );
}
