"use client";

import React from "react";
import CardBox from "../../_components/CardBox";
import SectionFullScreen from "../../_components/Section/FullScreen";
import AdminLoginForm from "./AdminLoginForm";

const AdminPageClient = () => {
  return (
    <SectionFullScreen bg="purplePink">
      <CardBox className="w-11/12 md:w-7/12 lg:w-5/12 xl:w-4/12 shadow-2xl">
        <AdminLoginForm />
      </CardBox>
    </SectionFullScreen>
  );
};

export default AdminPageClient; 