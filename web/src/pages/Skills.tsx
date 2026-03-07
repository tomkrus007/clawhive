import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Package, ShieldCheck, Plus, Loader2, AlertTriangle, FolderOpen } from "lucide-react";
import {
  useSkills,
  useAnalyzeSkill,
  useInstallSkill,
  type AnalyzeSkillResponse,
} from "@/hooks/use-api";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// ---------------------------------------------------------------------------
// Severity badge helper
// ---------------------------------------------------------------------------
function SeverityBadge({ severity }: { severity: string }) {
  const lower = severity.toLowerCase();
  if (lower === "high") return <Badge className="bg-red-500 hover:bg-red-600 text-white text-[10px] px-1">{severity}</Badge>;
  if (lower === "medium") return <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] px-1">{severity}</Badge>;
  return <Badge className="bg-blue-500 hover:bg-blue-600 text-white text-[10px] px-1">{severity}</Badge>;
}

// ---------------------------------------------------------------------------
// Install Skill Dialog
// ---------------------------------------------------------------------------
function InstallSkillDialog({ onInstalled }: { onInstalled: () => void }) {
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState("");
  const [allowHighRisk, setAllowHighRisk] = useState(false);
  const [report, setReport] = useState<AnalyzeSkillResponse | null>(null);

  const analyze = useAnalyzeSkill();
  const install = useInstallSkill();

  const reset = () => {
    setSource("");
    setAllowHighRisk(false);
    setReport(null);
    analyze.reset();
    install.reset();
  };

  const handleAnalyze = async () => {
    if (!source.trim()) return;
    setReport(null);
    try {
      const result = await analyze.mutateAsync(source.trim());
      setReport(result);
    } catch {
      toast.error("Analysis failed");
    }
  };

  const handleInstall = async () => {
    if (!source.trim()) return;
    try {
      const result = await install.mutateAsync({ source: source.trim(), allowHighRisk });
      toast.success(`Skill "${result.skill_name}" installed`);
      onInstalled();
      reset();
      setOpen(false);
    } catch {
      toast.error("Installation failed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Install Skill
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Install Skill</DialogTitle>
          <DialogDescription>Enter a local path or URL to a skill to analyze and install it.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Source input */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Skill Source
            </label>
            <div className="mt-1 flex gap-2">
              <Input
                placeholder="/path/to/skill or https://..."
                value={source}
                onChange={(e) => setSource(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
              />
              <Button
                variant="outline"
                onClick={handleAnalyze}
                disabled={!source.trim() || analyze.isPending}
              >
                {analyze.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Analyze"}
              </Button>
            </div>
          </div>

          {/* Analysis report */}
          {report && (
            <div className="space-y-3 rounded-md border bg-muted/30 p-4">
              <div>
                <p className="font-semibold">{report.skill_name}</p>
                <p className="text-sm text-muted-foreground">{report.description}</p>
              </div>

              {/* Findings */}
              {report.findings.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Findings ({report.findings.length})
                  </p>
                  <div className="space-y-1">
                    {report.findings.map((f, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 rounded-sm border bg-background px-3 py-2 text-sm"
                      >
                        <SeverityBadge severity={f.severity} />
                        <div className="min-w-0">
                          <span className="font-mono text-xs text-muted-foreground">
                            {f.file}:{f.line}
                          </span>
                          <span className="mx-1 text-muted-foreground">—</span>
                          <span className="font-mono text-xs">{f.pattern}</span>
                          <p className="text-xs text-muted-foreground">{f.reason}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rendered report */}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  Report
                </p>
                <pre className="max-h-48 overflow-auto rounded-sm border bg-background p-3 text-xs font-mono whitespace-pre-wrap">
                  {report.rendered_report}
                </pre>
              </div>

              {/* High risk warning */}
              {report.has_high_risk && (
                <div className="flex items-start gap-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                      High-risk findings detected
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">
                      This skill contains potentially dangerous patterns. Only install if you trust the source.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Allow</span>
                    <Switch
                      checked={allowHighRisk}
                      onCheckedChange={setAllowHighRisk}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={handleInstall}
            disabled={
              !source.trim() ||
              !report ||
              install.isPending ||
              (report.has_high_risk && !allowHighRisk)
            }
          >
            {install.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Install"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Skeleton cards for loading state
// ---------------------------------------------------------------------------
function SkillCardsSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div>
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="h-3.5 w-44 mt-1.5" />
                </div>
              </div>
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-3.5 w-48" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function SkillsPage() {
  const { data: skills, isLoading, isError, error, refetch } = useSkills();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Skills</h1>
          <p className="text-sm text-muted-foreground">Installed skills extend your agents with extra tools and capabilities</p>
        </div>
        <InstallSkillDialog onInstalled={() => refetch()} />
      </div>

      {isError ? (
        <ErrorState
          title="Failed to load skills"
          message={(error as Error)?.message}
          onRetry={() => refetch()}
        />
      ) : isLoading ? (
        <SkillCardsSkeleton />
      ) : skills?.length === 0 ? (
        <EmptyState
          icon={<Package className="h-10 w-10" />}
          title="No skills installed"
          description="Skills extend your agents with extra tools and capabilities."
          action={{
            label: "Install Skill",
            onClick: () => {
              document
                .querySelector<HTMLButtonElement>('[data-install-trigger]')
                ?.click();
            },
          }}
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {skills?.map((skill) => (
            <Card key={skill.path} className="group">
              <CardHeader className="space-y-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base font-mono truncate">{skill.name}</CardTitle>
                    </div>
                  </div>
                  {skill.has_permissions ? (
                    <Badge
                      variant="outline"
                      className="shrink-0 gap-1 border-amber-500/40 text-amber-600 dark:text-amber-400"
                    >
                      <ShieldCheck className="h-3 w-3" />
                      Permissions
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="shrink-0 gap-1 text-muted-foreground">
                      Sandboxed
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <CardDescription className="line-clamp-2">
                  {skill.description || <span className="italic">No description</span>}
                </CardDescription>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <FolderOpen className="h-3 w-3" />
                  <span className="truncate font-mono">{skill.path}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
