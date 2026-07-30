import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listSubjects from "./tools/list-subjects";
import listStudyPath from "./tools/list-study-path";
import logStudySession from "./tools/log-study-session";
import createNote from "./tools/create-note";
import getProgress from "./tools/get-progress";

// The OAuth issuer must be the direct Supabase host; the project ref is inlined at build time.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "sasha-ai",
  title: "Sasha AI",
  version: "0.1.0",
  instructions:
    "Tools for Sasha AI, a personalised study mentor. Read the signed-in student's subjects, guided study path and progress, log study sessions, and save notes.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listSubjects, listStudyPath, getProgress, logStudySession, createNote],
});
