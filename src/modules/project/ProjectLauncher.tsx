import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FolderOpen, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { trackAction } from "@/lib/action-audit/trackAction";
import { CreateProjectDialog } from "@/modules/project/CreateProjectDialog";
import { useProjectStore } from "@/stores/useProjectStore";

function translateError(
  t: (key: string, options?: { defaultValue?: string }) => string,
  key: string | null,
): string | null {
  if (!key) return null;
  const translated = t(key, { defaultValue: key });
  return translated === key ? key : translated;
}

interface ProjectLauncherProps {
  /** `welcome` = primera vez sin proyectos; `picker` = elegir tras cerrar sesión. */
  variant?: "welcome" | "picker";
}

export function ProjectLauncher({ variant = "welcome" }: ProjectLauncherProps) {
  const { t } = useTranslation("project");
  const [createOpen, setCreateOpen] = useState(false);

  const recents = useProjectStore((s) => s.recents);
  const isLoading = useProjectStore((s) => s.isLoading);
  const lastErrorKey = useProjectStore((s) => s.lastErrorKey);
  const openProjectDialog = useProjectStore((s) => s.openProjectDialog);
  const openProject = useProjectStore((s) => s.openProject);
  const removeRecent = useProjectStore((s) => s.removeRecent);

  const errorMessage = translateError(t, lastErrorKey);
  const isWelcome = variant === "welcome";

  const actionButtons = (
    <>
      <Button onClick={() => {
        trackAction("launcher", "createOpen", {});
        setCreateOpen(true);
      }} disabled={isLoading}>
        <Plus className="size-4" />
        {t("launcher.create")}
      </Button>
      <Button
        variant="outline"
        onClick={() => void openProjectDialog()}
        disabled={isLoading}
      >
        <FolderOpen className="size-4" />
        {t("launcher.open")}
      </Button>
    </>
  );

  const recentList = (
    <section>
      <h2 className="mb-2 text-sm font-medium">{t("launcher.recent")}</h2>
      {recents.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("launcher.recentEmpty")}</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {recents.map((entry) => (
            <li
              key={entry.path}
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-2"
            >
              <button
                type="button"
                className="min-w-0 flex-1 text-left text-sm hover:underline disabled:opacity-50"
                disabled={!entry.exists || isLoading}
                onClick={() => void openProject(entry.path)}
              >
                <span className="block truncate font-medium">{entry.name}</span>
                {!entry.exists ? (
                  <span className="block text-xs text-muted-foreground">
                    {t("launcher.recentMissing")}
                  </span>
                ) : null}
              </button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={t("launcher.removeRecent")}
                onClick={() => void removeRecent(entry.path)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  if (isWelcome) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
        <header className="max-w-lg text-center">
          <h1 className="text-3xl font-semibold tracking-tight">
            {t("launcher.title")}
          </h1>
          <p className="mt-2 text-muted-foreground">{t("launcher.subtitle")}</p>
        </header>

        <Card className="w-full max-w-lg">
          <CardContent className="flex flex-col gap-4 pt-6">
            <span className="flex flex-wrap gap-2">{actionButtons}</span>
            {errorMessage ? (
              <p className="text-sm text-destructive" role="alert">
                {errorMessage}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>{t("launcher.pickerTitle")}</CardTitle>
          <CardDescription>{t("launcher.pickerDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <span className="flex flex-wrap gap-2">{actionButtons}</span>
          {errorMessage ? (
            <p className="text-sm text-destructive" role="alert">
              {errorMessage}
            </p>
          ) : null}
          {recentList}
        </CardContent>
      </Card>

      <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} />
    </main>
  );
}
