"use client";

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import {mdiQrcode} from "@mdi/js";
import Head from "next/head";
import SectionMain from "../../_components/Section/Main";
import SectionTitleLineWithButton from "../../_components/Section/TitleLineWithButton";
import { getPageTitle } from "../../_lib/config";
import AttendanceScanner from "../scan-qr/AttendanceScanner"; // <-- Import the scanner

export default function FormsPage() {
  return (
    <>
      <Head>
        <title>{getPageTitle("Forms")}</title>
      </Head>

      <SectionMain>
        <SectionTitleLineWithButton
          icon={mdiQrcode}
          title="Scan QR Payment"
          main
        >
        </SectionTitleLineWithButton>
          <AttendanceScanner>
          </AttendanceScanner>
      </SectionMain>

      {/* ...rest of your page... */}
    </>
  );
}