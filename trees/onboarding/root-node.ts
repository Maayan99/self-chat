import { ConvoNode } from '../../conversation-handler/classes/convo-node';
import { VarRead, VarAppend } from '../../conversation-handler/classes/convo-vars';
import { IncomingMessage } from '../../client/classes/incoming-message';

const briefExplanation = `
ברוך הבא לשירות שלנו! הנה כמה דברים שתוכל לעשות:

1. שמור הערות: פשוט שלח הודעת טקסט כלשהי.
2. שמור קישורים: שלח קישור עם או בלי תיאור.
3. צור תזכורות: התחל הודעה עם תאריך או שעה.

זכור, תוכל תמיד לשלוח "עזרה" לקבלת מידע נוסף!
`;

const detailedExplanation = `
הנה הסבר מפורט יותר על השימוש במערכת:

1. שמירת הערות:
   - כל הודעת טקסט שתשלח תישמר כהערה.
   - תוכל לייצא את ההערות שלך בכל עת.

2. שמירת קישורים:
   - שלח קישור (URL) כדי לשמור אותו.
   - תוכל להוסיף תיאור לקישור על ידי הוספת טקסט לפני או אחרי הקישור.

3. יצירת תזכורות:
   - התחל הודעה עם תאריך (לדוגמה: 15/07/23) או שעה (לדוגמה: 14:30).
   - ההודעה שתבוא אחרי התאריך או השעה תהיה תוכן התזכורת.

4. ייצוא מידע:
   - שלח "ייצא הערות" או "ייצא קישורים" כדי לקבל את המידע שלך.
   - תוכל לבחור את הפורמט: pdf, הודעה, אקסל, או וורד.

5. קבלת עזרה:
   - בכל שלב, תוכל לשלוח "עזרה" כדי לקבל את ההסבר הזה שוב.

אנחנו מקווים שתמצא את השירות שלנו שימושי!
`;

export const onboardingRoot: ConvoNode = new ConvoNode(
    'buttons',
    {
        body: briefExplanation,
        buttons: [
            { id: 'more_info', title: 'אשמח למידע נוסף' },
            { id: 'start_using', title: 'הבנתי, בוא נתחיל' },
        ],
    },
    {
        more_info: new ConvoNode(
            'open',
            { body: detailedExplanation },
            {
                answer: async (message: IncomingMessage | undefined, read: VarRead, append: VarAppend) => {
                    return new ConvoNode(
                        'open',
                        { body: 'מעולה! עכשיו אתה מוכן להשתמש במערכת. זכור, תוכל תמיד לשלוח "עזרה" אם תצטרך תזכורת. בהצלחה!' },
                        { answer: null }
                    );
                }
            }
        ),
        start_using: new ConvoNode(
            'open',
            { body: 'מצוין! אתה מוכן להשתמש במערכת. זכור, תוכל תמיד לשלוח "עזרה" אם תצטרך מידע נוסף. בהצלחה!' },
            { answer: null }
        ),
    }
);