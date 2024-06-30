import { User } from '../classes/user';
import { Note } from '../classes/note';
import { Link } from '../classes/link';
import { dbNotes } from '../db/db-notes';
import { dbLinks } from '../db/db-links';
import { createExcelFile } from '../utils/csv-utility';
import { client } from '../main';
import * as fs from 'fs';
import * as path from 'path';
import { volumeMountPath } from '../main';
import PDFDocument from 'pdfkit';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import {dbUsers} from "../db/db-users";

export class Exporter {
    async export(user: User, exportType: string, format: string): Promise<string> {
        try {
            if (exportType === 'לינקים') {
                return await this.exportLinks(user, format);
            } else if (exportType === 'הערות') {
                return await this.exportNotes(user, format);
            } else {
                throw new Error('סוג ייצוא לא חוקי');
            }
        } catch (error) {
            console.error('שגיאה בייצוא:', error);
            throw error;
        }
    }

    private async exportLinks(user: User, format: string): Promise<string> {
        const links = await dbUsers.getAllLinksForUser(user.dbId || "");
        switch (format) {
            case 'pdf':
                return await this.exportLinksToPdf(links, user);
            case 'הודעה':
                return await this.exportLinksToMessage(links, user);
            case 'אקסל':
                return await this.exportLinksToExcel(links, user);
            case 'וורד':
                return await this.exportLinksToWord(links, user);
            default:
                throw new Error('פורמט ייצוא לא חוקי');
        }
    }

    private async exportNotes(user: User, format: string): Promise<string> {
        const notes = await dbUsers.getAllNotesForUser(user.dbId || "");
        switch (format) {
            case 'pdf':
                return await this.exportNotesToPdf(notes, user);
            case 'הודעה':
                return await this.exportNotesToMessage(notes, user);
            case 'אקסל':
                return await this.exportNotesToExcel(notes, user);
            case 'וורד':
                return await this.exportNotesToWord(notes, user);
            default:
                throw new Error('פורמט ייצוא לא חוקי');
        }
    }

    private async exportLinksToPdf(links: Link[], user: User): Promise<string> {
        const filename = `links_${user.dbId}_${Date.now()}.pdf`;
        const filePath = path.join(volumeMountPath, filename);

        const doc = new PDFDocument();
        const stream = fs.createWriteStream(filePath);

        doc.pipe(stream);

        doc.fontSize(16).text('הקישורים שלך', { align: 'center' });
        doc.moveDown();

        links.forEach((link, index) => {
            doc.fontSize(12).text(`${index + 1}. ${link.url}`);
            if (link.extraText) {
                doc.fontSize(10).text(`הערה: ${link.extraText}`, { indent: 20 });
            }
            doc.moveDown();
        });

        doc.end();

        await new Promise<void>((resolve) => stream.on('finish', resolve));

        await this.sendFile(filename, user.phone, 'קישורים');
        return 'הקישורים יוצאו לקובץ PDF';
    }

    private async exportLinksToMessage(links: Link[], user: User): Promise<string> {
        let message = 'הקישורים שלך:\n\n';
        links.forEach((link, index) => {
            message += `${index + 1}. ${link.url}\n`;
            if (link.extraText) {
                message += `   הערה: ${link.extraText}\n`;
            }
            message += '\n';
        });
        await client.sendMessage(message, user.phone);
        return 'הקישורים נשלחו כהודעה';
    }

    private async exportLinksToExcel(links: Link[], user: User): Promise<string> {
        const data = links.map(link => [link.url, link.extraText || '', link.createdAt.toISOString()]);
        const headers = ['קישור', 'הערה', 'תאריך יצירה'];
        const filename = `links_${user.dbId}_${Date.now()}.xlsx`;
        createExcelFile(filename, data, headers);
        await this.sendFile(filename, user.phone, 'קישורים');
        return 'הקישורים יוצאו לקובץ אקסל';
    }

    private async exportLinksToWord(links: Link[], user: User): Promise<string> {
        const filename = `links_${user.dbId}_${Date.now()}.docx`;
        const filePath = path.join(volumeMountPath, filename);

        const doc = new Document({
            sections: [{
                properties: {},
                children: [
                    new Paragraph({
                        children: [new TextRun({ text: 'הקישורים שלך', bold: true, size: 28 })],
                        alignment: 'center',
                    }),
                    ...links.flatMap((link, index) => {
                        const paragraphs: Paragraph[] = [
                            new Paragraph({
                                children: [new TextRun({ text: `${index + 1}. ${link.url}`, size: 24 })],
                            })
                        ];

                        if (link.extraText) {
                            paragraphs.push(
                                new Paragraph({
                                    children: [new TextRun({ text: `הערה: ${link.extraText}`, size: 20 })],
                                    indent: { left: 720 }, // 0.5 inch indent
                                })
                            );
                        }

                        paragraphs.push(new Paragraph({})); // Empty paragraph for spacing

                        return paragraphs;
                    }),
                ],
            }],
        });

        const buffer = await Packer.toBuffer(doc);
        fs.writeFileSync(filePath, buffer);

        await this.sendFile(filename, user.phone, 'קישורים');
        return 'הקישורים יוצאו לקובץ Word';
    }

    private async exportNotesToPdf(notes: Note[], user: User): Promise<string> {
        const filename = `notes_${user.dbId}_${Date.now()}.pdf`;
        const filePath = path.join(volumeMountPath, filename);

        const doc = new PDFDocument();
        const stream = fs.createWriteStream(filePath);

        doc.pipe(stream);

        doc.fontSize(16).text('ההערות שלך', { align: 'center' });
        doc.moveDown();

        notes.forEach((note, index) => {
            doc.fontSize(12).text(`${index + 1}. ${note.noteText}`);
            if (note.tags.length > 0) {
                doc.fontSize(10).text(`תגיות: ${note.tags.join(', ')}`, { indent: 20 });
            }
            doc.moveDown();
        });

        doc.end();

        await new Promise<void>((resolve) => stream.on('finish', resolve));

        await this.sendFile(filename, user.phone, 'הערות');
        return 'ההערות יוצאו לקובץ PDF';
    }

    private async exportNotesToMessage(notes: Note[], user: User): Promise<string> {
        let message = 'ההערות שלך:\n\n';
        notes.forEach((note, index) => {
            message += `${index + 1}. ${note.noteText}\n`;
            if (note.tags.length > 0) {
                message += `   תגיות: ${note.tags.join(', ')}\n`;
            }
            message += '\n';
        });
        await client.sendMessage(message, user.phone);
        return 'ההערות נשלחו כהודעה';
    }

    private async exportNotesToExcel(notes: Note[], user: User): Promise<string> {
        const data = notes.map(note => [note.noteText, note.tags.join(', '), note.createdAt.toISOString()]);
        const headers = ['הערה', 'תגיות', 'תאריך יצירה'];
        const filename = `notes_${user.dbId}_${Date.now()}.xlsx`;
        createExcelFile(filename, data, headers);
        await this.sendFile(filename, user.phone, 'הערות');
        return 'ההערות יוצאו לקובץ אקסל';
    }

    private async exportNotesToWord(notes: Note[], user: User): Promise<string> {
        const filename = `notes_${user.dbId}_${Date.now()}.docx`;
        const filePath = path.join(volumeMountPath, filename);

        const doc = new Document({
            sections: [{
                properties: {},
                children: [
                    new Paragraph({
                        children: [new TextRun({ text: 'ההערות שלך', bold: true, size: 28 })],
                        alignment: 'center',
                    }),
                    ...notes.flatMap((note, index) => {
                        const paragraphs: Paragraph[] = [
                            new Paragraph({
                                children: [new TextRun({ text: `${index + 1}. ${note.noteText}`, size: 24 })],
                            })
                        ];

                        if (note.tags.length > 0) {
                            paragraphs.push(
                                new Paragraph({
                                    children: [new TextRun({ text: `תגיות: ${note.tags.join(', ')}`, size: 20 })],
                                    indent: { left: 720 }, // 0.5 inch indent
                                })
                            );
                        }

                        paragraphs.push(new Paragraph({})); // Empty paragraph for spacing

                        return paragraphs;
                    }),
                ],
            }],
        });

        const buffer = await Packer.toBuffer(doc);
        fs.writeFileSync(filePath, buffer);

        await this.sendFile(filename, user.phone, 'הערות');
        return 'ההערות יוצאו לקובץ Word';
    }

    private async sendFile(filename: string, phone: string, caption: string): Promise<void> {
        const filePath = path.join(volumeMountPath, filename);
        await client.sendExcelFile(caption, filename, phone);
        fs.unlinkSync(filePath); // Delete the file after sending
    }
}