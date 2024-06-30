import { ConvoNode } from '../../conversation-handler/classes/convo-node';
import { VarRead, VarAppend } from '../../conversation-handler/classes/convo-vars';
import { IncomingMessage } from '../../client/classes/incoming-message';
import { dbUsers } from '../../db/db-users';
import {User} from "../../classes/user";

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
            { body: 'מציג את רשימת המשתמשים...' },
            {
                answer: async (message: IncomingMessage | undefined, read: VarRead, append: VarAppend) => {
                    const users: User[] = await dbUsers.getAllUsers();
                    const userList = users.map(user => `${user.phone}: ${user.dbId}`).join('\n');
                    append('user_list', userList);
                    return new ConvoNode(
                        'open',
                        { body: (read) => `רשימת המשתמשים:\n${read('user_list')}` },
                        { answer: adminRoot }
                    );
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