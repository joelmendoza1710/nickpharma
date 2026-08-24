"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

export function KpiCard({
  label,
  value,
  icon: Icon,
  hint,
  variation,
  accent = "primary",
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  hint?: string;
  variation?: number; // porcentaje
  accent?: "primary" | "secondary" | "amber" | "rose" | "violet" | "cyan";
}) {
  const accentMap: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    secondary: "bg-sky-500/10 text-sky-600 dark:text-sky-300",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
    rose: "bg-rose-500/10 text-rose-600 dark:text-rose-300",
    violet: "bg-violet-500/10 text-violet-600 dark:text-violet-300",
    cyan: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-300",
  };

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <CardContent className="p-4 md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {label}
            </p>
            <p className="mt-1.5 text-2xl font-bold tracking-tight truncate">
              {value}
            </p>
            {(hint || variation !== undefined) && (
              <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                {variation !== undefined && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-0.5 font-semibold",
                      variation >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                    )}
                  >
                    {variation >= 0 ? (
                      <ArrowUpRight className="h-3 w-3" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3" />
                    )}
                    {Math.abs(variation)}%
                  </span>
                )}
                {hint && <span className="text-muted-foreground">{hint}</span>}
              </div>
            )}
          </div>
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
              accentMap[accent]
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
