"use client";

import { useEffect } from "react";
import { recordTopicView } from "../../../actions";

/** Tells the server the student opened this topic (once per page load). */
export function ViewPing({ topicId }: { topicId: string }) {
  useEffect(() => {
    void recordTopicView(topicId);
  }, [topicId]);
  return null;
}
