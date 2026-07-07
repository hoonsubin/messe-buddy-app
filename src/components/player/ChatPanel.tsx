// AI policy assistant chat surface. Renders a welcome state with suggested
// prompts when empty, the conversation otherwise. Streaming, typing indicator,
// and stop/send affordances are driven by props from the chat hook
// (useChat → live stream or mock).
import { useEffect, useRef } from "react";
import { MdAutoAwesome, MdInfoOutline, MdSend, MdStop } from "react-icons/md";
import type { ChatMessage } from "../../hooks/useChat.ts";
import { renderMarkdown } from "../../utils/markdown.ts";

const DEFAULT_PROMPTS: ReadonlyArray<string> = [
  "How do I request vacation days and check my remaining balance?",
  "Do I need to clock out when I visit the exhibition halls during work hours?",
  "Welche Vorgaben gelten für die Erstellung und Änderung meines Passworts?",
  "Am I allowed to bring my own coffee machine to the office?",
  "Ab welchem Wert brauche ich eine Genehmigung, um ein Geschenk von einem Geschäftspartner anzunehmen?"
];

const MAX_TEXTAREA_PX = 120;

interface ChatPanelProps {
  readonly messages: ReadonlyArray<ChatMessage>;
  readonly isStreaming: boolean;
  readonly onSend: (text: string) => void;
  readonly onStop: () => void;
  readonly buddyName?: string;
  readonly suggestedPrompts?: ReadonlyArray<string>;
  // True when the live AI backend is unreachable and responses are coming
  // from the offline mock instead.
  readonly assistantUnavailable?: boolean;
}

const ChatPanel = (props: ChatPanelProps) => {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const prompts = props.suggestedPrompts ?? DEFAULT_PROMPTS;
  const isEmpty = props.messages.length === 0;

  // Auto-scroll to the latest content as it streams in.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [props.messages, props.isStreaming]);

  const autosize = () => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_PX)}px`;
  };

  const submit = () => {
    const el = inputRef.current;
    const value = el?.value.trim() ?? "";
    if (!value || props.isStreaming) return;
    props.onSend(value);
    if (el) {
      el.value = "";
      el.style.height = "auto";
    }
  };

  const handleChip = (text: string) => {
    if (props.isStreaming) return;
    props.onSend(text);
  };

  return (
    <div className="chat-panel" data-testid="chat-panel">
      {props.assistantUnavailable && (
        <div
          className="chat-panel__banner"
          role="status"
          data-testid="chat-unavailable-banner"
        >
          <MdInfoOutline size={16} aria-hidden="true" />
          <span>
            AI assistant is currently unavailable — showing example responses.
          </span>
        </div>
      )}
      <div
        className="chat-panel__messages"
        aria-live="polite"
        aria-label="Chat messages"
      >
        {isEmpty
          ? (
            <div className="chat-empty">
              <div className="chat-empty__avatar" aria-hidden="true">
                <MdAutoAwesome size={26} />
              </div>
              <p className="chat-empty__title">What would you like to know?</p>
              <p className="chat-empty__scope">
                I answer quick questions straight from the official docs. For
                anything personal,{" "}
                <span className="chat-empty__buddy">
                  {props.buddyName ?? "your buddy"} is your buddy
                </span>.
              </p>
              <div className="chat-empty__chips">
                {prompts.map((p) => (
                  <button
                    key={p}
                    type="button"
                    className="chat-chip"
                    onClick={() => handleChip(p)}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )
          : (
            props.messages.map((msg, i) => (
              msg.role === "user"
                ? (
                  <div
                    key={i}
                    className="chat-message chat-message--user"
                  >
                    <div className="chat-message__bubble">{msg.content}</div>
                  </div>
                )
                : (
                  <div
                    key={i}
                    className="chat-row chat-row--assistant"
                  >
                    <div className="chat-avatar" aria-hidden="true">
                      <MdAutoAwesome size={16} />
                    </div>
                    <div
                      className={`chat-message__bubble chat-message__bubble--assistant${
                        msg.isError ? " chat-message__bubble--error" : ""
                      }`}
                    >
                      {msg.streaming && msg.content === ""
                        ? (
                          <span
                            className="chat-dots"
                            aria-label="Assistant is typing"
                          >
                            <span className="chat-typing__dot" />
                            <span className="chat-typing__dot" />
                            <span className="chat-typing__dot" />
                          </span>
                        )
                        : msg.isError
                        ? msg.content
                        : (
                          <div
                            className="chat-markdown"
                            dangerouslySetInnerHTML={{
                              __html: renderMarkdown(msg.content),
                            }}
                          />
                        )}
                      {msg.streaming && msg.content !== "" && (
                        <span className="chat-cursor" aria-hidden="true">
                          ▌
                        </span>
                      )}
                    </div>
                  </div>
                )
            ))
          )}

        <div ref={endRef} />
      </div>

      <div className="chat-panel__input-row">
        <textarea
          ref={inputRef}
          rows={1}
          className="chat-input"
          placeholder="Ask about a policy…"
          aria-label="Chat message"
          onInput={autosize}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        />
        {props.isStreaming
          ? (
            <button
              type="button"
              className="chat-send chat-send--stop"
              aria-label="Stop generating"
              onClick={props.onStop}
            >
              <MdStop size={20} />
            </button>
          )
          : (
            <button
              type="button"
              className="chat-send"
              aria-label="Send"
              onClick={submit}
            >
              <MdSend size={18} />
            </button>
          )}
      </div>
    </div>
  );
};

export default ChatPanel;
