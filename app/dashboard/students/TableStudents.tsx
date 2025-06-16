// app/dashboard/students/TableStudents.tsx
"use client";

import { mdiQrcode, mdiPencil, mdiTrashCan, mdiDownload } from "@mdi/js";
import React, { useState, useRef } from "react";
import { Student } from "../../_interfaces";
import Button from "../../_components/Button";
import Buttons from "../../_components/Buttons";
import CardBoxModal from "../../_components/CardBox/Modal";
import StudentQRCode from "../../student/_components/StudentQRCode";

import { toPng } from 'html-to-image';

type Props = {
  students: Student[];
  onEdit: (student: Student) => void;
  onDelete: (student: Student) => void;
};

const TableStudents = ({ students, onEdit, onDelete }: Props) => {
  const perPage = 5;
  const [currentPage, setCurrentPage] = useState(0);

  // **** MOVE THESE CALCULATIONS INSIDE THE COMPONENT ****
  const studentsPaginated = students.slice(
    perPage * currentPage,
    perPage * (currentPage + 1)
  );

  const numPages = Math.ceil(students.length / perPage);
  const pagesList: number[] = [];
  for (let i = 0; i < numPages; i++) {
    pagesList.push(i);
  }
  // ******************************************************

  const [isQrModalActive, setIsQrModalActive] = useState(false);
  const [selectedStudentForQr, setSelectedStudentForQr] = useState<Student | null>(null);
  const offscreenQrContainerRef = useRef<HTMLDivElement>(null);
  const [studentToDownload, setStudentToDownload] = useState<Student | null>(null);


  return (
    <>

      <div className="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Class</th>
              <th className="w-32">Shift</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {/* Ensure studentsPaginated is used here */}
            {studentsPaginated.map((student: Student) => (
              <tr key={student.id}>
                <td data-label="Name">{student.fullName}</td>
                <td data-label="Class">{student.class}</td>
                <td data-label="Shift" className="w-32">{student.shift}</td>
                <td className="before:hidden lg:w-1 whitespace-nowrap">
                  <Buttons type="justify-start lg:justify-end" noWrap>
                    <Button color="success" icon={mdiPencil} onClick={() => onEdit(student)} small isGrouped />
                    <Button color="danger" icon={mdiTrashCan} onClick={() => onDelete(student)} small isGrouped />
                  </Buttons>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Pagination */}
      <div className="p-3 lg:px-6 border-t border-gray-100 dark:border-slate-800">
        <div className="flex flex-col md:flex-row items-center justify-between py-3 md:py-0">
          <Buttons>
            {/* Ensure pagesList is used here */}
            {pagesList.map((page) => (
              <Button
                key={page}
                active={page === currentPage}
                label={(page + 1).toString()}
                color={page === currentPage ? "lightDark" : "whiteDark"}
                small
                onClick={() => setCurrentPage(page)}
                isGrouped
              />
            ))}
          </Buttons>
          {/* Ensure numPages is used here */}
          <small className="mt-6 md:mt-0">
            Page {currentPage + 1} of {numPages} (Total: {students.length} students)
          </small>
        </div>
      </div>
    </>
  );
};

export default TableStudents;