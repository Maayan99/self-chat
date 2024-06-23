import { ConvoNode } from "../../conversation-handler/classes/convo-node";
import { onboardingSecondExplanation } from "./onboarding-second-explanation";

// הודעת הברכה הראשונית
const welcomeMessage: ConvoNode = new ConvoNode(
    'buttons',
    {
        body: '*ברוכים הבאים לSelfChat*\nשלום :)\nהצ\'אט שלכם עם עצמכם תמיד הרגיש בודד?\nכאן תוכלו לשלוח הודעות "לעצמכם" ולקבל מיון אוטומטי לקטגוריות, וייצוא חזרה בצ\'אט או בפורמט אקסל/PDF!\nגם תזכורות אפשר ליצור, ואפילו קטגוריות חדשות לגמרי',
        buttons: [
            {
                id: '1',
                title: 'בואו נתחיל!'
            },
        ]
    },
    {
        '1': onboardingSecondExplanation,
    }
);

export { welcomeMessage };
