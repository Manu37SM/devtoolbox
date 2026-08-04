import { PipelineBuilder } from "@/components/pipelines/PipelineBuilder";

// New pipeline route — a fresh, unsaved pipeline. `PipelineBuilder` itself
// redirects to `/pipelines/[id]` after the first successful save (see its
// `handleSave`), so this route only ever renders the "create" state.
export default function NewPipelinePage() {
  return <PipelineBuilder />;
}
