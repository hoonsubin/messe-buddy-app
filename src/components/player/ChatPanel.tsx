// Phase 1 shell — LiteLLM streaming wired in Phase 6.
// ChatMessage type deferred to Phase 8; local shape used here.
interface ChatMessageData {
  readonly role: "user" | "assistant";
  readonly content: string;
  readonly streaming?: boolean;
}

interface ChatPanelProps {
  readonly messages: ReadonlyArray<ChatMessageData>;
  readonly isStreaming: boolean;
  readonly onSend: (text: string) => void;
}

const ChatPanel = (props: ChatPanelProps) => (
  <div className="chat-panel" data-testid="chat-panel">
    <div
      className="chat-panel__messages"
      aria-live="polite"
      aria-label="Chat messages"
    >
      {props.messages.map((msg, i) => (
        <div key={i} className={`chat-message chat-message--${msg.role}`}>
          <div className="chat-message__bubble">
            {msg.content}
            {msg.streaming && <span aria-hidden="true">▌</span>}
          </div>
        </div>
      ))}
      {props.isStreaming && props.messages.length === 0 && (
        <div className="chat-message chat-message--assistant">
          <div className="chat-message__bubble">
            <span aria-hidden="true">▌</span>
            <span className="visually-hidden">Thinking…</span>
          </div>
        </div>
      )}
    </div>
    <div className="chat-panel__input-row">
      <input
        type="text"
        className="form-input"
        placeholder="Ask a question…"
        aria-label="Chat message"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            props.onSend((e.target as HTMLInputElement).value);
            (e.target as HTMLInputElement).value = "";
          }
        }}
        style={{ flex: 1 }}
      />
      <button type="button" className="btn btn--primary" aria-label="Send">
        Send
      </button>
    </div>
  </div>
);

export default ChatPanel;
