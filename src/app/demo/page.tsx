import { PaceboardTimeline } from "@/app/assignments/[...slug]/timeline";

export const dynamic = "force-dynamic"; // always render fresh so dates stay relative to today

export default function DemoPage() {
  const now = new Date();
  const d = (days: number) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();

  return (
    <PaceboardTimeline
      task={{
        title: "Media Arts Production — Demo",
        description:
          "This is a live demo of OnPace. Hover over the checkpoint tags to see student hints, and watch the red NOW marker track today's progress through the assessment period.",
        startDate: d(-7),
        dueDate: d(7),
      }}
      route={{
        yearLevel: "Year 12",
        subject: "Creative Convergence",
      }}
      scaffoldPoints={[
        {
          label: "Concept Pitch",
          internalDate: d(-5),
          displayOrder: 1,
          position: "above",
          isKeyLabel: true,
          tooltipText:
            "Prepare a 2-minute verbal pitch covering your concept, target audience, and intended mood.\n\nNeed inspiration? https://www.youtube.com/results?search_query=media+arts+pitch+examples",
        },
        {
          label: "Draft Storyboard",
          internalDate: d(-2),
          displayOrder: 2,
          position: "below",
          isKeyLabel: true,
          tooltipText:
            "Submit your storyboard via the class portal. Include at least 12 frames with annotations explaining each shot choice.",
        },
        {
          label: "Peer Review",
          internalDate: d(3),
          displayOrder: 3,
          position: "above",
          isKeyLabel: true,
          tooltipText:
            "You will be assigned two peers to review. Use the feedback rubric provided on the class page. Be specific and constructive.",
        },
        {
          label: "Final Submission",
          internalDate: d(6),
          displayOrder: 4,
          position: "below",
          isKeyLabel: true,
          tooltipText:
            "Upload your final edited piece (MP4, max 500 MB) and a 300-word reflection to the class portal before 11:59 PM.",
        },
      ]}
      serverTime={now.toISOString()}
    />
  );
}
