import { ConvoNode } from "../../conversation-handler/classes/convo-node";

// טיפול בהודעת הברכה הראשונית
const onboardingSecondExplanation: ConvoNode = new ConvoNode(
    'open',
    {
        body: 'ניתן לשלוח הודעות "לעצמכם" בלבד. אנא שלחו הודעה כדוגמה לעצמכם כעת.'
    },
    {
        answer: null
    }
);

export { onboardingSecondExplanation };
