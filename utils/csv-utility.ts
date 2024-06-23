import * as fs from 'fs';
import {volumeMountPath} from "../main";
import XLSX from 'xlsx';

function createExcelFile(filename: string, data: string[][], columnHeaders: string[], rowHeaders?: string[]): void {
    // Create a new workbook
    const workbook = XLSX.utils.book_new();

    // Prepend row headers to each row if provided
    if (rowHeaders) {
        data = data.map((row, index) => [rowHeaders[index], ...row]);
        columnHeaders = ["", ...columnHeaders]; // Add an empty column header for row headers
    }

    // Add the column headers to the data
    const worksheetData = [columnHeaders, ...data];

    // Create a worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Append the worksheet to the workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

    // Define the file path
    const filepath = volumeMountPath + '/' + filename;

    // Write the workbook to the file system
    try {
        XLSX.writeFile(workbook, filepath);
    } catch (e) {
        console.error("Failed to write file, with error: \n", e);
    }
}

export { createExcelFile }