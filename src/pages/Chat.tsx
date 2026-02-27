import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Send, Bot, User, Loader2, Sparkles, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  quickReplies?: string[];
  showDatePicker?: boolean;
}

function parseInteractiveTags(content: string): {
  cleanContent: string;
  quickReplies?: string[];
  showDatePicker?: boolean;
} {
  let cleanContent = content;
  let quickReplies: string[] | undefined;
  let showDatePicker = false;

  // Parse [QUICK_REPLIES:opt1,opt2,...]
  const qrMatch = cleanContent.match(/\[QUICK_REPLIES:([^\]]+)\]/);
  if (qrMatch) {
    quickReplies = qrMatch[1].split(",").map((s) => s.trim());
    cleanContent = cleanContent.replace(qrMatch[0], "").trim();
  }

  // Parse [DATE_PICKER]
  if (cleanContent.includes("[DATE_PICKER]")) {
    showDatePicker = true;
    cleanContent = cleanContent.replace("[DATE_PICKER]", "").trim();
  }

  return { cleanContent, quickReplies, showDatePicker };
}

const SUGGESTIONS = [
  "I just took my morning medication",
  "What medications am I on?",
  "Schedule a checkup for next week",
  "Show my upcoming appointments",
];

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: text.trim(),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setIsLoading(true);

      try {
        const chatHistory = [...messages, userMsg].map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const { data, error } = await supabase.functions.invoke(
          "treatmate-chat",
          { body: { messages: chatHistory } }
        );

        if (error) throw error;

        if (data?.error) {
          toast.error(data.error);
          return;
        }

        const rawReply = data?.reply || "I'm sorry, I couldn't process that.";
        const { cleanContent, quickReplies, showDatePicker } =
          parseInteractiveTags(rawReply);

        const assistantMsg: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: cleanContent,
          timestamp: new Date(),
          quickReplies,
          showDatePicker,
        };

        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err) {
        console.error("Chat error:", err);
        toast.error("Failed to send message. Please try again.");
      } finally {
        setIsLoading(false);
        inputRef.current?.focus();
      }
    },
    [messages, isLoading]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setCalendarOpen(false);
      sendMessage(format(date, "yyyy-MM-dd"));
    }
  };

  const handleQuickReply = (reply: string) => {
    sendMessage(reply);
  };

  // Check if the last assistant message has interactive elements
  const lastAssistantMsg = [...messages].reverse().find((m) => m.role === "assistant");
  const showInteractive = !isLoading && lastAssistantMsg;

  return (
    <div className="flex flex-col h-[calc(100dvh-8rem)] lg:h-[calc(100dvh-6rem)]">
      {/* Chat messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-1 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl md:text-3xl font-display font-bold mb-2">
              TreatMate Assistant
            </h2>
            <p className="text-muted-foreground text-base max-w-md mb-8">
              I can help you log doses, schedule appointments, and manage your
              health — just tell me what you need.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-left rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isLastAssistant =
              msg.role === "assistant" &&
              idx === messages.length - 1 &&
              !isLoading;

            return (
              <div key={msg.id} className="space-y-2">
                <div
                  className={cn(
                    "flex gap-3 max-w-2xl mx-auto animate-fade-in",
                    msg.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {msg.role === "assistant" && (
                    <div className="shrink-0 w-8 h-8 rounded-full bg-chat-bot flex items-center justify-center mt-1">
                      <Bot className="w-4 h-4 text-chat-bot-foreground" />
                    </div>
                  )}
                  <Card
                    className={cn(
                      "px-4 py-3 max-w-[80%] shadow-sm",
                      msg.role === "user"
                        ? "bg-chat-user text-chat-user-foreground border-transparent rounded-2xl rounded-br-md"
                        : "bg-chat-bot text-chat-bot-foreground border-transparent rounded-2xl rounded-bl-md"
                    )}
                  >
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:text-sm [&_p]:leading-relaxed [&_p]:m-0 [&_ul]:text-sm [&_li]:text-sm">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm leading-relaxed m-0">
                        {msg.content}
                      </p>
                    )}
                  </Card>
                  {msg.role === "user" && (
                    <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mt-1">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                  )}
                </div>

                {/* Interactive elements for the last assistant message */}
                {isLastAssistant && (msg.quickReplies || msg.showDatePicker) && (
                  <div className="flex flex-wrap gap-2 max-w-2xl mx-auto pl-11 animate-fade-in">
                    {msg.showDatePicker && (
                      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-full gap-2 text-sm border-primary/30 text-primary hover:bg-primary/10"
                          >
                            <CalendarIcon className="w-4 h-4" />
                            Pick a date
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            onSelect={handleDateSelect}
                            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                    {msg.quickReplies?.map((reply) => (
                      <Button
                        key={reply}
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickReply(reply)}
                        className="rounded-full text-sm border-primary/30 text-primary hover:bg-primary/10"
                      >
                        {reply}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}

        {isLoading && (
          <div className="flex gap-3 max-w-2xl mx-auto animate-fade-in">
            <div className="shrink-0 w-8 h-8 rounded-full bg-chat-bot flex items-center justify-center mt-1">
              <Bot className="w-4 h-4 text-chat-bot-foreground" />
            </div>
            <Card className="px-4 py-3 bg-chat-bot border-transparent rounded-2xl rounded-bl-md">
              <div className="flex gap-1.5 items-center h-5">
                <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-pulse-dot" style={{ animationDelay: "0s" }} />
                <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-pulse-dot" style={{ animationDelay: "0.2s" }} />
                <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-pulse-dot" style={{ animationDelay: "0.4s" }} />
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t bg-card/80 backdrop-blur-sm px-2 py-3">
        <form
          onSubmit={handleSubmit}
          className="flex gap-2 max-w-2xl mx-auto"
        >
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            disabled={isLoading}
            className="flex-1 rounded-xl bg-background"
            autoComplete="off"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading}
            className="rounded-xl shrink-0"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
