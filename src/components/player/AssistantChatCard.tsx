// Collapsible AI policy-assistant card. Lives in the top slot of the player
// cockpit. Collapsed by default — the bar is itself the entry point. Chat state
// is owned here (via useChat), so collapsing and reopening preserves the
// conversation; collapse only hides the body, it never resets.
import { useState } from "react";
import {
  MdAutoAwesome,
  MdExpandLess,
  MdExpandMore,
} from "react-icons/md";
import { useChat } from "../../hooks/useChat.ts";
import ChatPanel from "./ChatPanel.tsx";

interface AssistantChatCardProps {
  readonly buddyName?: string;
}

const AssistantChatCard = (props: AssistantChatCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const { messages, isStreaming, send, stop } = useChat();

  const hasConversation = messages.length > 0;

  return (
    <section
      className="assistant-chat-card"
      data-testid="assistant-chat-card"
      aria-label="AI policy assistant"
    >
      {expanded
        ? (
          <>
            <div className="assistant-chat-card__header">
              <div className="assistant-chat-card__avatar" aria-hidden="true">
                <MdAutoAwesome size={18} />
              </div>
              <p className="assistant-chat-card__title">
                Ask about company policies
              </p>
              <button
                type="button"
                className="assistant-chat-card__toggle"
                aria-label="Collapse assistant"
                aria-expanded="true"
                onClick={() => setExpanded(false)}
              >
                <MdExpandLess size={22} />
              </button>
            </div>
            <div className="assistant-chat-card__body">
              <ChatPanel
                messages={messages}
                isStreaming={isStreaming}
                onSend={send}
                onStop={stop}
                {...(props.buddyName !== undefined &&
                  { buddyName: props.buddyName })}
              />
            </div>
          </>
        )
        : (
          <button
            type="button"
            className="assistant-chat-card__bar"
            aria-expanded="false"
            aria-label="Open the policy assistant"
            onClick={() => setExpanded(true)}
          >
            <div className="assistant-chat-card__avatar" aria-hidden="true">
              <MdAutoAwesome size={20} />
            </div>
            <div className="assistant-chat-card__bar-text">
              <span className="assistant-chat-card__title">
                Ask about company policies
              </span>
              <span className="assistant-chat-card__subtitle">
                {hasConversation
                  ? "Continue your conversation"
                  : "Vacation, hours, expenses — answered from the docs"}
              </span>
            </div>
            <MdExpandMore
              size={22}
              className="assistant-chat-card__chevron"
              aria-hidden="true"
            />
          </button>
        )}
    </section>
  );
};

export default AssistantChatCard;
