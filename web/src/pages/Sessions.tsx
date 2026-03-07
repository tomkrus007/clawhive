import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { useSessions, useSessionMessages } from "@/hooks/use-api";
import { cn } from "@/lib/utils";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

function parseSessionKey(key: string) {
  // Format: "{channel_type}:{connector_id}:{rest...}"
  const parts = key.split(":");
  const channelType = parts[0] || "unknown";
  const connectorId = parts[1] || "";

  // Extract user scope — last segment after "user:"
  const userIdx = parts.indexOf("user");
  const userScope = userIdx >= 0 && parts[userIdx + 1]
    ? `...${parts[userIdx + 1].slice(-4)}`
    : "";

  // Determine kind from conversation_scope
  const hasGuild = parts.includes("guild");
  const hasChannel = parts.includes("channel");
  const kind = hasGuild && hasChannel ? "channel" : hasGuild ? "guild" : "dm";

  const label = channelType.charAt(0).toUpperCase() + channelType.slice(1);
  const suffix = userScope ? ` • user:${userScope}` : "";
  const display = kind === "dm" ? `${label} DM${suffix}` : `${label} #${kind}${suffix}`;

  return { channelType, connectorId, display };
}

function SessionListSkeleton() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2 rounded-lg border p-3">
          <div className="flex items-center justify-between w-full">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-16" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </>
  );
}

function MessageSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {[false, true, false, true, false].map((isUser, i) => (
        <div key={i} className={cn("flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}>
          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          <div className={cn("grid gap-1", isUser ? "text-right" : "text-left")}>
            <Skeleton className="h-3 w-24" />
            <Skeleton className={cn("h-16 rounded-md", isUser ? "w-48" : "w-64")} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SessionsPage() {
  const { data: sessions, isLoading: isLoadingSessions, isError: isErrorSessions, error: errorSessions, refetch: refetchSessions } = useSessions();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const { data: messages, isLoading: isLoadingMessages } = useSessionMessages(selectedKey || "");

  const selectedSession = sessions?.find(s => s.session_key === selectedKey);
  const selectedParsed = selectedKey ? parseSessionKey(selectedKey) : null;

  if (isErrorSessions) return <ErrorState message={errorSessions?.message} onRetry={refetchSessions} />
  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-8rem)] gap-4">
      <Card className={cn("w-full md:w-1/3 flex flex-col h-full", selectedKey ? "hidden md:flex" : "flex")}>
        <CardHeader className="pb-3">
          <CardTitle>Sessions</CardTitle>
          <CardDescription>Recent conversations</CardDescription>
        </CardHeader>
        <Separator />
        <ScrollArea className="flex-1">
          <div className="flex flex-col gap-2 p-4">
            {isLoadingSessions ? (
              <SessionListSkeleton />
            ) : sessions?.length === 0 ? (
              <div className="text-center text-muted-foreground p-4">No sessions found</div>
            ) : (
              sessions?.map((session) => {
                const parsed = parseSessionKey(session.session_key);
                return (
                  <div
                    key={session.session_key}
                    onClick={() => setSelectedKey(session.session_key)}
                    className={cn(
                      "flex flex-col items-start gap-2 rounded-lg border p-3 text-left text-sm transition-all hover:bg-accent cursor-pointer",
                      selectedKey === session.session_key ? "bg-accent" : ""
                    )}
                  >
                    <div className="flex w-full flex-col gap-1">
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Badge variant="outline" className="text-[10px] h-5 px-1.5 shrink-0 capitalize">
                            {parsed.channelType}
                          </Badge>
                          <span className="font-semibold truncate" title={session.session_key}>
                            {parsed.display}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground shrink-0 ml-2">
                          {new Date(session.last_modified).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="secondary" className="text-[10px] h-5 px-1">
                          {session.message_count} msgs
                        </Badge>
                        <span className="truncate" title={session.file_name}>{session.file_name}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </Card>

      <Card className={cn("flex flex-col flex-1 h-full", selectedKey ? "flex" : "hidden md:flex")}>
        {selectedKey ? (
          <>
            <CardHeader className="pb-3 border-b flex flex-row items-center gap-2">
              <Button variant="ghost" size="icon" className="md:hidden h-8 w-8" onClick={() => setSelectedKey(null)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] h-5 px-1.5 capitalize shrink-0">
                    {selectedParsed?.channelType}
                  </Badge>
                  <CardTitle className="text-base truncate">{selectedParsed?.display}</CardTitle>
                </div>
                <CardDescription className="text-xs truncate max-w-[200px] md:max-w-lg" title={selectedSession?.session_key}>
                  {selectedSession?.session_key}
                </CardDescription>
              </div>
            </CardHeader>
            <ScrollArea className="flex-1 p-4">
              {isLoadingMessages ? (
                <MessageSkeleton />
              ) : (
                <div className="flex flex-col gap-4">
                  {messages?.map((msg, i) => (
                    <div key={i} className={cn("flex gap-3", msg.role === "user" ? "flex-row-reverse" : "flex-row")}>
                      <div className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                        msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                      )}>
                        {msg.role === "user" ? "U" : "AI"}
                      </div>
                      <div className={cn("grid gap-1 max-w-[80%]", msg.role === "user" ? "text-right" : "text-left")}>
                        <div className="font-semibold text-xs text-muted-foreground">
                          {msg.role === "user" ? "User" : "Agent"} • {new Date(msg.timestamp).toLocaleTimeString()}
                        </div>
                        <div className={cn(
                          "text-sm p-3 rounded-md whitespace-pre-wrap",
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground"
                        )}>
                          {msg.text}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
            <MessageCircle className="h-8 w-8" />
            <p>Select a session to view messages</p>
          </div>
        )}
      </Card>
    </div>
  );
}
