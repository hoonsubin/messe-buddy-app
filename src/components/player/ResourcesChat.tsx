// Phase 1 shell — tab logic wired in Phase 3.
import type { Resource } from "../../types/index.ts";
import ResourcesSection from "./ResourcesSection.tsx";
import ChatPanel from "./ChatPanel.tsx";

interface ResourcesChatProps {
  readonly resources: ReadonlyArray<Resource>;
}

const ResourcesChat = (props: ResourcesChatProps) => (
  <div
    className="resources-chat"
    data-testid="resources-chat"
    style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}
  >
    <div className="tab-bar">
      <button type="button" className="tab-bar__tab tab-bar__tab--active">
        Resources
      </button>
      <button type="button" className="tab-bar__tab">
        Ask AI
      </button>
    </div>
    {/* Phase 1: resources tab visible; chat tab wired in Phase 6 */}
    <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <ResourcesSection resources={props.resources} onSearch={() => undefined} />
    </div>
    <div style={{ display: "none" }}>
      <ChatPanel messages={[]} isStreaming={false} onSend={() => undefined} />
    </div>
  </div>
);

export default ResourcesChat;
