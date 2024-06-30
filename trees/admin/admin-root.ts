import { ConvoNode } from '../../conversation-handler/classes/convo-node';
import { VarRead, VarAppend } from '../../conversation-handler/classes/convo-vars';
import { IncomingMessage } from '../../client/classes/incoming-message';
import { dbUsers } from '../../db/db-users';
import { User } from "../../classes/user";
import { client } from '../../main';
import { createExcelFile } from '../../utils/csv-utility';
import * as path from 'path';
import * as fs from 'fs';
import { volumeMountPath } from '../../main';

export const adminRoot: ConvoNode = new ConvoNode(
    'buttons',
    {
        body: 'ברוך הבא לממשק הניהול. מה תרצה לעשות?',
        buttons: [
            { id: 'view_users', title: 'צפה במשתמשים' },
            { id: 'view_stats', title: 'צפה בסטטיסטיקות' },
            { id: 'send_broadcast', title: 'שלח הודעה לכולם' },
        ],
    },
    {
        view_users: new ConvoNode(
            'open',
            { body: 'מכין קובץ אקסל עם רשימת המשתמשים...' },
            {
                answer: async (message: IncomingMessage | undefined, read: VarRead, append: VarAppend) => {
                    const users: User[] = await dbUsers.getAllUsers();

                    // Prepare data for Excel
                    const data = users.map(user => [user.phone, user.dbId]);
                    const columnHeaders = ['מספר טלפון', 'מזהה משתמש'];

                    // Generate filename
                    const filename = `users_${Date.now()}.xlsx`;

                    // Create Excel file
                    createExcelFile(filename, data, columnHeaders);

                    // Send file
                    await client.sendExcelFile('רשימת משתמשים', filename, message?.from || '');

                    // Delete file after sending
                    const filepath = path.join(volumeMountPath, filename);
                    fs.unlinkSync(filepath);

                    return adminRoot;
                }
            },
            true
        ),
        view_stats: new ConvoNode(
            'open',
            { body: 'מציג סטטיסטיקות...' },
            {
                answer: async (message: IncomingMessage | undefined, read: VarRead, append: VarAppend) => {
                    // Here you would fetch and calculate statistics
                    const stats = 'סטטיסטיקות יתווספו בעתיד';
                    append('stats', stats);
                    return new ConvoNode(
                        'open',
                        { body: (read) => `${read('stats')}` },
                        { answer: adminRoot }
                    );
                }
            },
            true
        ),
        send_broadcast: new ConvoNode(
            'open',
            { body: 'אנא הקלד את ההודעה שברצונך לשלוח לכל המשתמשים:' },
            {
                answer: async (message: IncomingMessage | undefined, read: VarRead, append: VarAppend) => {
                    if (message && message.body) {
                        append('broadcast_message', message.body);
                        // Here you would implement the logic to send the message to all users
                        return new ConvoNode(
                            'open',
                            { body: 'ההודעה נשלחה בהצלחה לכל המשתמשים.' },
                            { answer: adminRoot }
                        );
                    } else {
                        return new ConvoNode(
                            'open',
                            { body: 'לא התקבלה הודעה. נסה שוב.' },
                            { answer: adminRoot }
                        );
                    }
                }
            }
        ),
    }
);