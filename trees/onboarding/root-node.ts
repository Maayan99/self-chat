import { ConvoNode } from '../../conversation-handler/classes/convo-node';
import { VarRead, VarAppend } from '../../conversation-handler/classes/convo-vars';
import { IncomingMessage } from '../../client/classes/incoming-message';

const briefExplanation = `
היי! איזה כיף שהצטרפת אלינו 🎉 הנה מה שאפשר לעשות כאן:

1. לשמור הערות: פשוט שלח לי טקסט כלשהו.
2. לשמור קישורים: שלח לינק, אפשר גם להוסיף תיאור.
3. ליצור תזכורות: כתוב הודעה עם תאריך או שעה.
4. לקבל את המידע שלך: שלח "הערות" או "לינקים".

רוצה עוד טיפים? פשוט שלח "עזרה" 😊
`;

const detailedExplanation = `
היי חבר, בוא נדבר על כל מה שאפשר לעשות פה:

1. הערות:
   כל מה שתשלח שלא נראה כמו פקודה, אני אשמור בתור הערה. קל, נכון?

2. קישורים:
   שלח לי לינק ואשמור אותו. רוצה להוסיף תיאור? פשוט כתוב אותו ליד הלינק.

3. תזכורות:
   כתוב משהו עם תאריך או שעה, ואני אזכור בשבילך. למשל:
   "מחר ב-14:30 פגישה עם יוסי"
   "15/07 לקנות מתנה לאמא"

4. לקבל את המידע שלך:
   רוצה לראות את ההערות או הלינקים שלך? פשוט שלח "הערות" או "לינקים".
   רוצה את זה באקסל או בוורד? הוסף את זה לבקשה, כמו "הערות אקסל".

זהו! אם תצטרך עזרה, אני תמיד פה. פשוט שלח "עזרה" 😊
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
            { answer: null },
            true
        ),
        start_using: new ConvoNode(
            'open',
            { body: 'מצוין! אתה מוכן להשתמש במערכת. זכור, תוכל תמיד לשלוח "עזרה" אם תצטרך מידע נוסף. בהצלחה!' },
            { answer: null },
            true
        ),
    }
);