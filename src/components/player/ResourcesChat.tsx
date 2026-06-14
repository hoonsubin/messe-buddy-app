// Resources + AI Chat tab container — tab switching wired in Phase 4e.
import { useState } from "react";
import type { Resource } from "../../types/index.ts";
import ResourcesSection from "./ResourcesSection.tsx";
import ChatPanel from "./ChatPanel.tsx";
import { useMockChat } from "../../hooks/useMockChat.ts";

interface ResourcesChatProps {
  readonly resources: ReadonlyArray<Resource>;
}

const TAB_KEYS = { RESOURCES: "resources", CHAT: "chat" } as const;
type TabKey = (typeof TAB_KEYS)[keyof typeof TAB_KEYS];

const ResourcesChat = (props: ResourcesChatProps) => {
  const [activeTab, setActiveTab] = useState<TabKey>(TAB_KEYS.RESOURCES);
  const { messages, isStreaming, send } = useMockChat();

  return (
    <div
      className="resources-chat"
      data-testid="resources-chat"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <div className="tab-bar">
        <button
          type="button"
          className={`tab-bar__tab${
            activeTab === TAB_KEYS.RESOURCES ? " tab-bar__tab--active" : ""
          }`}
          onClick={() => setActiveTab(TAB_KEYS.RESOURCES)}
        >
          Resources
        </button>
        <button
          type="button"
          className={`tab-bar__tab${
            activeTab === TAB_KEYS.CHAT ? " tab-bar__tab--active" : ""
          }`}
          onClick={() => setActiveTab(TAB_KEYS.CHAT)}
        >
          Ask AI
        </button>
      </div>
      <div
        style={{
          flex: 1,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {activeTab === TAB_KEYS.RESOURCES && (
          <ResourcesSection
            resources={props.resources}
            onSearch={() => undefined}
          />
        )}
        {activeTab === TAB_KEYS.CHAT && (
          <ChatPanel
            messages={messages}
            isStreaming={isStreaming}
            onSend={send}
          />
        )}
      </div>
    </div>
  );
};

export default ResourcesChat;
